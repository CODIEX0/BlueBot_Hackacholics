import React from 'react';
const { useState, useCallback, useEffect, useRef, useContext, createContext } = React;
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  Camera as CameraIcon,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Upload,
} from 'lucide-react-native';
import ReceiptOCR from '../services/receiptOCR_Production';
import { useAWS } from '../contexts/AWSContext';
import { theme } from '@/config/theme';

interface ReceiptScannerProps {
  visible: boolean;
  onClose: () => void;
  onReceiptProcessed?: (receipt: any) => void;
}

interface ScannedReceipt {
  merchant: string;
  total: number;
  items: Array<{
    name: string;
    price: number;
    quantity?: number;
  }>;
  date: string;
  category: string;
}

export default function ReceiptScanner({ 
  visible, 
  onClose, 
  onReceiptProcessed 
}: ReceiptScannerProps) {
  // Manual permission state to be compatible across Expo Camera versions
  const [permission, setPermission] = useState<{ granted: boolean; status?: string } | null>(null);
  const requestPermission = useCallback(async () => {
    try {
      const res = await Camera.requestCameraPermissionsAsync();
      setPermission({ granted: res.granted, status: res.status });
    } catch (e) {
      console.warn('Camera permission request failed:', e);
      setPermission({ granted: false, status: 'denied' });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await Camera.getCameraPermissionsAsync();
        if (!mounted) return;
        setPermission({ granted: !!res.granted, status: res.status });
        // Optionally, request immediately when modal opens and not granted
        if (visible && !res.granted && res.canAskAgain) {
          const req = await Camera.requestCameraPermissionsAsync();
          if (!mounted) return;
          setPermission({ granted: req.granted, status: req.status });
        }
      } catch (e) {
        console.warn('Camera permission check failed:', e);
        if (mounted) setPermission({ granted: false, status: 'undetermined' });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [visible]);
  const [mode, setMode] = useState<'camera' | 'gallery' | 'result'>('camera');
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scannedReceipt, setScannedReceipt] = useState<ScannedReceipt | null>(null);
  const cameraRef = useRef<typeof Camera>(null);
  const receiptOCR = ReceiptOCR;
  // AWS Context with fallback to demo mode
  const aws = useAWS();
  const { isInitialized, processReceipt, createExpense } = aws || {};

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      
      setCapturedImage(photo.uri);
      await processImage(photo.uri);
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setCapturedImage(imageUri);
        await processImage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const processImage = async (imageUri: string) => {
    setIsProcessing(true);
    setMode('result');

    try {
      const ocrResult = await receiptOCR.scanReceipt(imageUri);
      
      // Convert OCR result to structured receipt data
      const receipt: ScannedReceipt = {
        merchant: ocrResult.merchantName || 'Unknown Merchant',
        total: ocrResult.amount || 0,
        items: ocrResult.items || [],
        date: ocrResult.date || new Date().toISOString().split('T')[0],
        category: ocrResult.category || 'Other',
      };

      setScannedReceipt(receipt);
    } catch (error) {
      console.error('Error processing receipt:', error);
      Alert.alert(
        'Processing Error', 
        'Could not read the receipt. Please try again with a clearer image.'
      );
      setMode('camera');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveReceipt = async () => {
    if (!scannedReceipt) return;

    try {
      if (isInitialized && processReceipt) {
        // Run full pipeline: S3 upload + Textract + expense creation
        await processReceipt(capturedImage || '');
      } else {
        // Demo fallback: just create a local expense without S3
        await createExpense?.({
          amount: scannedReceipt.total,
          category: scannedReceipt.category,
          merchant: scannedReceipt.merchant,
          date: scannedReceipt.date,
          description: `Receipt from ${scannedReceipt.merchant}`,
          isRecurring: false,
        });
      }

      // Notify parent component
      onReceiptProcessed?.(scannedReceipt);
      
  Alert.alert('Success', 'Receipt saved successfully!');
      handleClose();
    } catch (error) {
      console.error('Error saving receipt:', error);
      Alert.alert('Error', 'Failed to save receipt');
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setScannedReceipt(null);
    setMode('camera');
  };

  const handleClose = () => {
    setCapturedImage(null);
    setScannedReceipt(null);
    setMode('camera');
    onClose();
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.permissionContainer}>
          <CameraIcon size={64} color={theme.colors.muted} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to scan receipts and automatically track your expenses.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === 'camera' ? 'Scan Receipt' : 
             mode === 'result' ? 'Review Receipt' : 'Processing...'}
          </Text>
          <View style={styles.headerButton} />
        </View>

        {mode === 'camera' && (
          <>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              type={CameraType.back}
              ratio="4:3"
            >
              <View style={styles.cameraOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanInstruction}>
                  Position the receipt within the frame
                </Text>
              </View>
            </Camera>

            <View style={styles.cameraControls}>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={handlePickFromGallery}
              >
                <ImageIcon size={24} color={theme.colors.text} />
                <Text style={styles.controlButtonText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.captureButton}
                onPress={handleTakePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>

              <View style={styles.controlButton} />
            </View>
          </>
        )}

        {mode === 'result' && (
          <ScrollView style={styles.resultContainer}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.processingText}>Processing receipt...</Text>
                <Text style={styles.processingSubtext}>
                  This may take a few seconds
                </Text>
              </View>
            ) : (
              <>
                {capturedImage && (
                  <Image source={{ uri: capturedImage }} style={styles.receiptImage} />
                )}

                {scannedReceipt && (
                  <View style={styles.receiptDetails}>
                    <Text style={styles.sectionTitle}>Receipt Details</Text>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Merchant</Text>
                      <Text style={styles.detailValue}>{scannedReceipt.merchant}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Amount</Text>
                      <Text style={styles.detailValue}>
                        R{scannedReceipt.total.toFixed(2)}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>{scannedReceipt.date}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Category</Text>
                      <Text style={styles.detailValue}>{scannedReceipt.category}</Text>
                    </View>

                    {scannedReceipt.items.length > 0 && (
                      <>
                        <Text style={styles.sectionTitle}>Items</Text>
                        {scannedReceipt.items.map((item, index) => (
                          <View key={index} style={styles.itemRow}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemPrice}>R{item.price.toFixed(2)}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}

                <View style={styles.resultActions}>
                  <TouchableOpacity 
                    style={styles.retakeButton}
                    onPress={handleRetake}
                  >
                    <RefreshCw size={20} color={theme.colors.muted} />
                    <Text style={styles.retakeButtonText}>Retake</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={handleSaveReceipt}
                    disabled={!scannedReceipt}
                  >
                    <Check size={20} color={theme.colors.text} />
                    <Text style={styles.saveButtonText}>Save Receipt</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: theme.colors.card,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.glass,
  },
  scanFrame: {
    width: 280,
    height: 400,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanInstruction: {
    color: theme.colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: theme.colors.glass,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 30,
    backgroundColor: theme.colors.card,
  },
  controlButton: {
    alignItems: 'center',
    width: 60,
  },
  controlButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    marginTop: 4,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.primary,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 16,
  },
  processingSubtext: {
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  receiptDetails: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 16,
    marginTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: 16,
    color: theme.colors.muted,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  resultActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardAlt,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.muted,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: theme.colors.background,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 24,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 32,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButtonText: {
    fontSize: 16,
    color: theme.colors.muted,
  },
});


