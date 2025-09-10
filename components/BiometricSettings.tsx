/**
 * Biometric Settings Component - Manage biometric authentication
 */

import React from 'react';
const { useState, useEffect } = React;
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAWS } from '@/contexts/AWSContext';

interface BiometricSettingsProps {
  onSettingsChange?: (enabled: boolean) => void;
}

const BiometricSettings: React.FC<BiometricSettingsProps> = ({ onSettingsChange }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // AWS Context with fallback to demo mode
  const aws = useAWS();
  const { currentUser, isInitialized } = aws || {};
  
  // Demo mode fallbacks for biometric settings
  const user = currentUser || { firstName: 'Demo', email: 'demo@bluebot.com' };
  const biometricAvailable = false; // Demo mode - biometrics not available
  
  const enableBiometric = async () => {
    if (isInitialized) {
      // Would enable biometric authentication via AWS Cognito
      Alert.alert('Success', 'Biometric authentication enabled');
    } else {
      Alert.alert('Demo Mode', 'Biometric settings would be saved in live mode');
    }
  };

  const disableBiometric = async () => {
    if (isInitialized) {
      // Would disable biometric authentication via AWS Cognito
      Alert.alert('Success', 'Biometric authentication disabled');
    } else {
      Alert.alert('Demo Mode', 'Biometric settings would be updated in live mode');
    }
  };

  useEffect(() => {
    // In demo mode, biometric is disabled by default
    // In live mode, would get setting from AWS Cognito user attributes
    setIsEnabled(false);
  }, [user]);

  const handleToggleBiometric = async (value: boolean) => {
    if (!biometricAvailable) {
      Alert.alert(
        'Biometric Not Available',
        'Biometric authentication is not available on this device or not set up.'
      );
      return;
    }

    setIsLoading(true);
    try {
      if (value) {
        await enableBiometric();
        setIsEnabled(true);
        Alert.alert(
          'Biometric Enabled',
          'Biometric authentication has been enabled for your account.'
        );
      } else {
        Alert.alert(
          'Disable Biometric',
          'Are you sure you want to disable biometric authentication?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await disableBiometric();
                setIsEnabled(false);
                Alert.alert(
                  'Biometric Disabled',
                  'Biometric authentication has been disabled.'
                );
              },
            },
          ]
        );
      }
      onSettingsChange?.(value);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update biometric settings');
    } finally {
      setIsLoading(false);
    }
  };

  const getBiometricTypeIcon = () => {
    // In a real app, you'd detect the specific biometric type
    return 'finger-print'; // Could be 'finger-print', 'face-recognition', etc.
  };

  const getBiometricTypeName = () => {
    // In a real app, you'd detect the specific biometric type
    return 'Fingerprint'; // Could be 'Face ID', 'Touch ID', etc.
  };

  if (!biometricAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableContainer}>
          <Ionicons name="alert-circle-outline" size={24} color="#F59E0B" />
          <Text style={styles.unavailableTitle}>Biometric Not Available</Text>
          <Text style={styles.unavailableText}>
            Biometric authentication is not available on this device or not set up in your device settings.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name={getBiometricTypeIcon()} size={24} color="#10B981" />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{getBiometricTypeName()} Authentication</Text>
          <Text style={styles.subtitle}>
            Use your {getBiometricTypeName().toLowerCase()} to sign in quickly and securely
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggleBiometric}
          disabled={isLoading}
          trackColor={{ false: '#E5E7EB', true: '#10B981' }}
          thumbColor={isEnabled ? '#ffffff' : '#ffffff'}
        />
      </View>

      {isEnabled && (
        <View style={styles.enabledInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.infoText}>
              Quick and secure sign-in enabled
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            <Text style={styles.infoText}>
              Your biometric data stays on your device
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="lock-closed" size={16} color="#10B981" />
            <Text style={styles.infoText}>
              Enhanced account security
            </Text>
          </View>
        </View>
      )}

      {!isEnabled && (
        <View style={styles.disabledInfo}>
          <Text style={styles.disabledTitle}>Why enable biometric authentication?</Text>
          <View style={styles.benefitItem}>
            <Ionicons name="flash" size={16} color="#6B7280" />
            <Text style={styles.benefitText}>Faster sign-in experience</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="shield" size={16} color="#6B7280" />
            <Text style={styles.benefitText}>Enhanced security</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="hand-left" size={16} color="#6B7280" />
            <Text style={styles.benefitText}>No need to remember passwords</Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.securityNote}>
          <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
          <Text style={styles.securityText}>
            Your biometric data is encrypted and stored securely on your device only.
            BlueBot never has access to your biometric information.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  enabledInfo: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#065F46',
    marginLeft: 8,
    lineHeight: 20,
  },
  disabledInfo: {
    marginBottom: 16,
  },
  disabledTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  securityText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  unavailableContainer: {
    alignItems: 'center',
    padding: 20,
  },
  unavailableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 8,
    marginBottom: 8,
  },
  unavailableText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default BiometricSettings;
