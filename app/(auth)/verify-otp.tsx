/**
 * Verify OTP Screen - Phone number verification
 * Allows users to verify their phone number with OTP
 */

import React from 'react';
const { useState, useRef, useEffect } = React;
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMobileAuth } from '@/contexts/MobileAuthContext';
import RecaptchaComponent from '@/components/RecaptchaComponent';

export default function VerifyOTPScreen() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const { verifyOTP, resendOTP, verifyRecaptcha } = useMobileAuth();
  const router = useRouter();
  // For demo purposes, using a default phone number
  const phoneNumber = '+1 (555) 123-4567';
  
  const inputRefs = useRef<(typeof TextInput | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (index === 5 && value !== '') {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        handleVerifyOTP(fullOtp);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const fullOtp = otpCode || otp.join('');
    
    if (fullOtp.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP(fullOtp);
      Alert.alert(
        'Success',
        'Phone number verified successfully!',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid verification code');
      // Clear OTP inputs on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    // Require reCAPTCHA verification for resending OTP
    if (!recaptchaVerified) {
      setShowRecaptcha(true);
      return;
    }

    setIsLoading(true);
    try {
      await resendOTP();
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert('Success', 'Verification code sent again');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecaptchaVerify = async (token: string) => {
    try {
      const isValid = await verifyRecaptcha(token);
      if (isValid) {
        setRecaptchaVerified(true);
        setShowRecaptcha(false);
        Alert.alert('Verified', 'reCAPTCHA verification successful');
        // Automatically resend OTP after verification
        await handleResendOTP();
      } else {
        Alert.alert('Verification Failed', 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'Verification failed. Please try again.');
    }
  };

  const handleRecaptchaError = (error: any) => {
    setShowRecaptcha(false);
    Alert.alert('Verification Error', 'Failed to verify. Please try again.');
  };

  const formatPhoneNumber = (phone: string) => {
    // Mask phone number for privacy
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `${phone.slice(0, -6)}${'*'.repeat(4)}${phone.slice(-2)}`;
    }
    return phone;
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Logo and Title */}
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Ionicons name="phone-portrait" size={40} color="#ffffff" />
              </View>
              <Text style={styles.title}>Verify Phone Number</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to:
              </Text>
              <Text style={styles.phoneNumber}>{formatPhoneNumber(phoneNumber)}</Text>
            </View>

            {/* OTP Input */}
            <View style={styles.otpContainer}>
              <Text style={styles.otpLabel}>Verification Code</Text>
              <View style={styles.otpInputContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[
                      styles.otpInput,
                      digit !== '' && styles.otpInputFilled,
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                  />
                ))}
              </View>
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.verifyButton, isLoading && styles.disabledButton]}
              onPress={() => handleVerifyOTP()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.buttonText}>Verifying...</Text>
              ) : (
                <>
                  <Text style={styles.buttonText}>Verify Code</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>

            {/* Resend Section */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code?</Text>
              {canResend ? (
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendOTP}
                  disabled={isLoading}
                >
                  <Text style={styles.resendButtonText}>
                    {recaptchaVerified ? 'Resend Code' : 'Verify & Resend'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.timerText}>
                  Resend in {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                </Text>
              )}
              
              {recaptchaVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>

            {/* reCAPTCHA */}
            {showRecaptcha && (
              <View style={styles.recaptchaContainer}>
                <RecaptchaComponent
                  onVerify={handleRecaptchaVerify}
                  onError={handleRecaptchaError}
                />
                <TouchableOpacity
                  style={styles.cancelRecaptcha}
                  onPress={() => setShowRecaptcha(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Help Section */}
            <View style={styles.helpContainer}>
              <Text style={styles.helpTitle}>Having trouble?</Text>
              <Text style={styles.helpText}>
                Make sure you have a stable internet connection and check your SMS messages.
              </Text>
              
              <TouchableOpacity style={styles.helpButton}>
                <Ionicons name="help-circle-outline" size={20} color="#93C5FD" />
                <Text style={styles.helpButtonText}>Get Help</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.changeNumberButton}
                onPress={() => router.back()}
              >
                <Ionicons name="phone-portrait-outline" size={20} color="#93C5FD" />
                <Text style={styles.changeNumberText}>Change Phone Number</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  otpContainer: {
    marginBottom: 32,
  },
  otpLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 45,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  otpInputFilled: {
    borderColor: '#10B981',
    backgroundColor: '#ffffff',
  },
  verifyButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  resendText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#93C5FD',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  helpContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  helpButtonText: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  changeNumberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changeNumberText: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  recaptchaContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  cancelRecaptcha: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
});
