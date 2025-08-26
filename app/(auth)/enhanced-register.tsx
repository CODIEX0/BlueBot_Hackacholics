/**
 * Enhanced Registration Screen - Multiple registration options
 * Includes traditional email/password, Google Sign-Up, and biometric setup
 */

import React from 'react';
const { useState, useEffect } = React;
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
import { Link, useRouter } from 'expo-router';
import { useMobileAuth } from '@/contexts/MobileAuthContext';
import RecaptchaComponent from '@/components/RecaptchaComponent';

export default function EnhancedRegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<'traditional' | 'social'>('traditional');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  const [setupBiometric, setSetupBiometric] = useState(false);
  
  const { 
    signUp, 
    signInWithGoogle, 
    enableBiometric, 
    biometricAvailable,
    verifyRecaptcha 
  } = useMobileAuth();
  const router = useRouter();

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isStrongPassword = (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const handleTraditionalSignUp = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!isStrongPassword(password)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters long and contain uppercase, lowercase, and number'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to the Terms and Conditions');
      return;
    }

    if (!recaptchaToken) {
      setShowRecaptcha(true);
      return;
    }

    setIsLoading(true);
    try {
      await signUp(email, password, fullName);
      
      // Offer biometric setup after successful registration
      if (biometricAvailable && setupBiometric) {
        try {
          await enableBiometric();
          Alert.alert(
            'Registration Successful!',
            'Your account has been created and biometric authentication is now enabled.',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
          );
        } catch (biometricError) {
          Alert.alert(
            'Registration Successful!',
            'Your account has been created. You can enable biometric authentication later in settings.',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
          );
        }
      } else {
        Alert.alert(
          'Registration Successful!',
          'Your account has been created successfully.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to the Terms and Conditions');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Google Sign-Up Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecaptchaVerify = (token: string) => {
    setRecaptchaToken(token);
    setShowRecaptcha(false);
    Alert.alert('Verified', 'reCAPTCHA verification successful');
  };

  const handleRecaptchaError = (error: any) => {
    Alert.alert('Verification Failed', 'reCAPTCHA verification failed. Please try again.');
  };

  const renderTraditionalSignUp = () => (
    <>
      {/* Full Name Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Email Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password-new"
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm Password Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoComplete="password-new"
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Password Strength Indicator */}
      <View style={styles.passwordStrengthContainer}>
        <Text style={styles.passwordStrengthTitle}>Password Requirements:</Text>
        <View style={styles.requirementItem}>
          <Ionicons 
            name={password.length >= 8 ? "checkmark-circle" : "ellipse-outline"} 
            size={16} 
            color={password.length >= 8 ? "#10B981" : "#9CA3AF"} 
          />
          <Text style={[styles.requirementText, password.length >= 8 && styles.requirementMet]}>
            At least 8 characters
          </Text>
        </View>
        <View style={styles.requirementItem}>
          <Ionicons 
            name={/[A-Z]/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
            size={16} 
            color={/[A-Z]/.test(password) ? "#10B981" : "#9CA3AF"} 
          />
          <Text style={[styles.requirementText, /[A-Z]/.test(password) && styles.requirementMet]}>
            One uppercase letter
          </Text>
        </View>
        <View style={styles.requirementItem}>
          <Ionicons 
            name={/[a-z]/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
            size={16} 
            color={/[a-z]/.test(password) ? "#10B981" : "#9CA3AF"} 
          />
          <Text style={[styles.requirementText, /[a-z]/.test(password) && styles.requirementMet]}>
            One lowercase letter
          </Text>
        </View>
        <View style={styles.requirementItem}>
          <Ionicons 
            name={/\d/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
            size={16} 
            color={/\d/.test(password) ? "#10B981" : "#9CA3AF"} 
          />
          <Text style={[styles.requirementText, /\d/.test(password) && styles.requirementMet]}>
            One number
          </Text>
        </View>
      </View>

      {/* Biometric Setup Option */}
      {biometricAvailable && (
        <TouchableOpacity
          style={styles.biometricOption}
          onPress={() => setSetupBiometric(!setupBiometric)}
        >
          <Ionicons 
            name={setupBiometric ? "checkbox" : "square-outline"} 
            size={20} 
            color={setupBiometric ? "#10B981" : "#9CA3AF"} 
          />
          <Text style={styles.biometricText}>
            Enable biometric authentication
          </Text>
          <Ionicons name="finger-print" size={20} color="#10B981" />
        </TouchableOpacity>
      )}

      {/* Sign Up Button */}
      <TouchableOpacity
        style={[styles.signUpButton, isLoading && styles.disabledButton]}
        onPress={handleTraditionalSignUp}
        disabled={isLoading}
      >
        {isLoading ? (
          <Text style={styles.buttonText}>Creating Account...</Text>
        ) : (
          <>
            <Text style={styles.buttonText}>Create Account</Text>
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </>
        )}
      </TouchableOpacity>
    </>
  );

  const renderSocialSignUp = () => (
    <View style={styles.socialContainer}>
      <Text style={styles.socialTitle}>Sign up with your account</Text>
      
      {/* Google Sign-Up */}
      <TouchableOpacity
        style={styles.socialButton}
        onPress={handleGoogleSignUp}
        disabled={isLoading}
      >
        <Ionicons name="logo-google" size={20} color="#DB4437" />
        <Text style={styles.socialButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      <Text style={styles.socialNote}>
        By signing up with Google, you agree to our Terms and Privacy Policy
      </Text>
    </View>
  );

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
                <Ionicons name="person-add" size={40} color="#ffffff" />
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join BlueBot and start your financial journey</Text>
            </View>

            {/* Registration Mode Selector */}
            <View style={styles.authModeContainer}>
              <TouchableOpacity
                style={[styles.authModeButton, registrationMode === 'traditional' && styles.activeAuthMode]}
                onPress={() => setRegistrationMode('traditional')}
              >
                <Ionicons name="mail" size={16} color={registrationMode === 'traditional' ? '#667eea' : '#ffffff'} />
                <Text style={[styles.authModeText, registrationMode === 'traditional' && styles.activeAuthModeText]}>
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authModeButton, registrationMode === 'social' && styles.activeAuthMode]}
                onPress={() => setRegistrationMode('social')}
              >
                <Ionicons name="logo-google" size={16} color={registrationMode === 'social' ? '#667eea' : '#ffffff'} />
                <Text style={[styles.authModeText, registrationMode === 'social' && styles.activeAuthModeText]}>
                  Social
                </Text>
              </TouchableOpacity>
            </View>

            {/* Registration Form */}
            <View style={styles.formContainer}>
              {registrationMode === 'traditional' && renderTraditionalSignUp()}
              {registrationMode === 'social' && renderSocialSignUp()}
            </View>

            {/* Terms and Conditions */}
            {registrationMode === 'traditional' && (
              <TouchableOpacity
                style={styles.termsContainer}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
              >
                <Ionicons 
                  name={agreedToTerms ? "checkbox" : "square-outline"} 
                  size={20} 
                  color={agreedToTerms ? "#10B981" : "#9CA3AF"} 
                />
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.termsLink}>Terms and Conditions</Text> and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            )}

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

            {/* Security Verification */}
            {registrationMode === 'traditional' && (
              <TouchableOpacity
                style={styles.recaptchaButton}
                onPress={() => setShowRecaptcha(true)}
              >
                <Ionicons name="shield-outline" size={16} color="#93C5FD" />
                <Text style={styles.recaptchaText}>
                  {recaptchaToken ? 'Verified' : 'Verify you\'re human'}
                </Text>
                {recaptchaToken && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
              </TouchableOpacity>
            )}

            {/* Footer Links */}
            <View style={styles.footerContainer}>
              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <Link href="/login" style={styles.link}>
                  <Text style={styles.linkText}>Sign In</Text>
                </Link>
              </View>
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
    marginBottom: 32,
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
  },
  authModeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  authModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeAuthMode: {
    backgroundColor: '#ffffff',
  },
  authModeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  activeAuthModeText: {
    color: '#667eea',
  },
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  passwordInput: {
    paddingRight: 40,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  passwordStrengthContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  passwordStrengthTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginLeft: 8,
  },
  requirementMet: {
    color: '#10B981',
  },
  biometricOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  biometricText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  signUpButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
  socialContainer: {
    alignItems: 'center',
  },
  socialTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  socialButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
    textAlign: 'center',
  },
  socialNote: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 12,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  termsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  termsLink: {
    color: '#93C5FD',
    textDecorationLine: 'underline',
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
  recaptchaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  recaptchaText: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 8,
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 20,
  },
  signInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signInText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  link: {
    marginLeft: 4,
  },
  linkText: {
    color: '#93C5FD',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
