/**
 * Enhanced Login Screen - Multiple authentication options
 * Includes email/password, passwordless email, Google Sign-In, and biometric authentication
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

export default function EnhancedLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'traditional' | 'passwordless' | 'social'>('traditional');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  
  const { 
    signIn, 
    signInPasswordless, 
    signInWithGoogle, 
    signInWithBiometric, 
    biometricAvailable,
    verifyRecaptcha 
  } = useMobileAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if this is a passwordless sign-in completion
    const handlePasswordlessSignIn = async () => {
      // In a real app, you'd check for deep links here
      // For now, we'll just show the option is available
    };
    handlePasswordlessSignIn();
  }, []);

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleTraditionalLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordlessLogin = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await signInPasswordless(email);
      Alert.alert(
        'Check Your Email',
        'We\'ve sent you a sign-in link. Click the link in your email to sign in.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send sign-in link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Google Sign-In Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithBiometric();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Biometric Sign-In Failed', error.message);
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

  const renderTraditionalLogin = () => (
    <>
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
            autoComplete="password"
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

      {/* Sign In Button */}
      <TouchableOpacity
        style={[styles.signInButton, isLoading && styles.disabledButton]}
        onPress={handleTraditionalLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <Text style={styles.buttonText}>Signing In...</Text>
        ) : (
          <>
            <Text style={styles.buttonText}>Sign In</Text>
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </>
        )}
      </TouchableOpacity>
    </>
  );

  const renderPasswordlessLogin = () => (
    <>
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

      {/* Passwordless Sign In Button */}
      <TouchableOpacity
        style={[styles.signInButton, isLoading && styles.disabledButton]}
        onPress={handlePasswordlessLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <Text style={styles.buttonText}>Sending Link...</Text>
        ) : (
          <>
            <Text style={styles.buttonText}>Send Sign-In Link</Text>
            <Ionicons name="mail" size={20} color="#ffffff" />
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.infoText}>
        We'll send you a secure link to sign in without a password
      </Text>
    </>
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
                <Ionicons name="shield-checkmark" size={40} color="#ffffff" />
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Choose your preferred sign-in method</Text>
            </View>

            {/* Auth Mode Selector */}
            <View style={styles.authModeContainer}>
              <TouchableOpacity
                style={[styles.authModeButton, authMode === 'traditional' && styles.activeAuthMode]}
                onPress={() => setAuthMode('traditional')}
              >
                <Ionicons name="key" size={16} color={authMode === 'traditional' ? '#667eea' : '#ffffff'} />
                <Text style={[styles.authModeText, authMode === 'traditional' && styles.activeAuthModeText]}>
                  Password
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authModeButton, authMode === 'passwordless' && styles.activeAuthMode]}
                onPress={() => setAuthMode('passwordless')}
              >
                <Ionicons name="mail" size={16} color={authMode === 'passwordless' ? '#667eea' : '#ffffff'} />
                <Text style={[styles.authModeText, authMode === 'passwordless' && styles.activeAuthModeText]}>
                  Passwordless
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authModeButton, authMode === 'social' && styles.activeAuthMode]}
                onPress={() => setAuthMode('social')}
              >
                <Ionicons name="people" size={16} color={authMode === 'social' ? '#667eea' : '#ffffff'} />
                <Text style={[styles.authModeText, authMode === 'social' && styles.activeAuthModeText]}>
                  Social
                </Text>
              </TouchableOpacity>
            </View>

            {/* Auth Form */}
            <View style={styles.formContainer}>
              {authMode === 'traditional' && renderTraditionalLogin()}
              {authMode === 'passwordless' && renderPasswordlessLogin()}
              {authMode === 'social' && (
                <View style={styles.socialContainer}>
                  <Text style={styles.socialTitle}>Sign in with your account</Text>
                  
                  {/* Google Sign-In */}
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <Ionicons name="logo-google" size={20} color="#DB4437" />
                    <Text style={styles.socialButtonText}>Continue with Google</Text>
                  </TouchableOpacity>

                  {/* Biometric Sign-In */}
                  {biometricAvailable && (
                    <TouchableOpacity
                      style={styles.socialButton}
                      onPress={handleBiometricSignIn}
                      disabled={isLoading}
                    >
                      <Ionicons name="finger-print" size={20} color="#10B981" />
                      <Text style={styles.socialButtonText}>Use Biometric</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* reCAPTCHA */}
            {showRecaptcha && (
              <RecaptchaComponent
                onVerify={handleRecaptchaVerify}
                onError={handleRecaptchaError}
              />
            )}

            {/* Security Verification */}
            {authMode === 'traditional' && (
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
              <Link href="/forgot-password" style={styles.link}>
                <Text style={styles.linkText}>Forgot Password?</Text>
              </Link>
              
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an account? </Text>
                <Link href="/register" style={styles.link}>
                  <Text style={styles.linkText}>Sign Up</Text>
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
  signInButton: {
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
  infoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
  link: {
    marginBottom: 12,
  },
  linkText: {
    color: '#93C5FD',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  signUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signUpText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
});
