/**
 * Forgot Password Screen - Password reset via email (Cognito)
 */

import React from 'react';
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
import { useAWS } from '@/contexts/AWSContext';
import { theme } from '@/config/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const { forgotPassword, confirmForgotPassword } = useAWS();
  const router = useRouter();

  const isValidEmail = (value: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value);

  const handleResetPassword = async () => {
    if (!email) return Alert.alert('Error', 'Please enter your email address');
    if (!isValidEmail(email)) return Alert.alert('Error', 'Please enter a valid email address');

    setIsLoading(true);
    try {
      await forgotPassword(email.trim());
      setEmailSent(true);
      Alert.alert('Check Email', 'We sent a 6-digit verification code to your email.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) return;
    setIsLoading(true);
    try {
      await forgotPassword(email.trim());
      Alert.alert('Sent', 'We re-sent the verification code.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!code || !newPassword) return Alert.alert('Error', 'Enter the code and your new password.');
    setIsLoading(true);
    try {
      await confirmForgotPassword(email.trim(), code.trim(), newPassword);
      Alert.alert('Success', 'Password has been reset. Please sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={theme.gradients.purple as any} style={styles.gradient}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                  <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={styles.contentContainer}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="mail" size={60} color="#ffffff" />
                </View>

                <Text style={styles.title}>Reset Your Password</Text>
                <Text style={styles.subtitle}>Enter the code sent to</Text>
                <Text style={styles.emailText}>{email}</Text>

                {/* Code Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="key-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Verification Code"
                    placeholderTextColor="#9CA3AF"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                  />
                </View>

                {/* New Password */}
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    placeholderTextColor="#9CA3AF"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {/* Reset Button */}
                <TouchableOpacity style={[styles.resendButton, isLoading && styles.disabledButton]} onPress={handleConfirmReset} disabled={isLoading}>
                  <Text style={styles.resendButtonText}>{isLoading ? 'Resetting...' : 'Reset Password'}</Text>
                </TouchableOpacity>

                {/* Resend + Back */}
                <TouchableOpacity style={styles.backToLoginButton} onPress={handleResendEmail}>
                  <Ionicons name="refresh" size={20} color="#93C5FD" />
                  <Text style={styles.backToLoginText}>Resend Code</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backToLoginButton} onPress={() => router.replace('/(auth)/login')}>
                  <Ionicons name="arrow-back" size={20} color="#93C5FD" />
                  <Text style={styles.backToLoginText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={theme.gradients.purple as any} style={styles.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Logo and Title */}
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Ionicons name="lock-closed" size={40} color="#ffffff" />
              </View>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>No worries! Enter your email and we'll send you a reset code.</Text>
            </View>

            {/* Reset Form */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              {/* Send Button */}
              <TouchableOpacity style={[styles.resetButton, isLoading && styles.disabledButton]} onPress={handleResetPassword} disabled={isLoading}>
                {isLoading ? (
                  <Text style={styles.buttonText}>Sending...</Text>
                ) : (
                  <>
                    <Text style={styles.buttonText}>Send Reset Code</Text>
                    <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>

              {/* Back to Login */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Remember your password? </Text>
                <Link href="/(auth)/login" style={styles.loginLink}>Sign In</Link>
              </View>
            </View>

            {/* Help Section */}
            <View style={styles.helpContainer}>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpText}>If you're having trouble accessing your account, please contact our support team.</Text>
              <TouchableOpacity style={styles.supportButton}>
                <Ionicons name="chatbubble-outline" size={20} color="#93C5FD" />
                <Text style={styles.supportButtonText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 10, paddingBottom: 20 },
  backButton: { padding: 8 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', lineHeight: 24 },
  formContainer: { marginBottom: 40 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 12, paddingHorizontal: 16, marginBottom: 24, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#374151' },
  resetButton: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  disabledButton: { backgroundColor: '#9CA3AF' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginRight: 8 },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 16 },
  loginLink: { color: '#93C5FD', fontSize: 16, fontWeight: '600' },
  helpContainer: { alignItems: 'center', marginBottom: 40 },
  helpTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  helpText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  supportButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  supportButtonText: { color: '#93C5FD', fontSize: 14, fontWeight: '500', marginLeft: 8 },
  contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  successIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emailText: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginVertical: 8, textAlign: 'center' },
  resendButton: { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  resendButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  backToLoginButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  backToLoginText: { color: '#93C5FD', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
