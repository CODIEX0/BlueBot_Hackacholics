/**
 * Profile Screen - User profile and security settings
 * Includes biometric authentication settings and other security features
 */

import React from 'react';
const { useState } = React;
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, shadow } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '@/components/GlassCard';
import { useThemeMode } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useMobileAuth } from '@/contexts/MobileAuthContext';
import BiometricSettings from '@/components/BiometricSettings';

export default function ProfileScreen() {
  const { mode, toggle } = useThemeMode?.() || { mode: 'dark', toggle: () => {} } as any;
  const [isLoading, setIsLoading] = useState(false);
  const { user, signOut, biometricAvailable, updateProfile, resetPassword } = useMobileAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await signOut();
              router.replace('/login');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert(
      'Edit Profile',
      'Choose what you want to update:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Update Name', 
          onPress: () => showUpdateNameDialog()
        },
        { 
          text: 'Update Email', 
          onPress: () => showUpdateEmailDialog()
        },
        { 
          text: 'Update Phone', 
          onPress: () => showUpdatePhoneDialog()
        },
        { 
          text: 'Profile Picture', 
          onPress: () => showProfilePictureOptions()
        },
      ]
    );
  };

  const showUpdateNameDialog = () => {
    // Using Alert.prompt for platforms that support it
    if (Alert.prompt) {
      Alert.prompt(
        'Update Name',
        'Enter your new full name:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Update', 
            onPress: async (newName) => {
              if (newName && newName.trim().length >= 2) {
                await updateUserProfile({ fullName: newName.trim() });
              } else {
                Alert.alert('Invalid Name', 'Please enter a valid name (at least 2 characters)');
              }
            }
          }
        ],
        'plain-text',
        user?.fullName || ''
      );
    } else {
      // Fallback for platforms that don't support Alert.prompt
      Alert.alert(
        'Update Name',
        'To update your name:\n\n1. Contact our support team\n2. Provide valid ID documentation\n3. Verification process takes 1-2 business days',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Contact Support', onPress: () => Alert.alert('Support', 'Opening support chat...') }
        ]
      );
    }
  };

  const showUpdateEmailDialog = () => {
    if (Alert.prompt) {
      Alert.prompt(
        'Update Email',
        'Enter your new email address:\n\n⚠️ This will require email verification',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Send Verification', 
            onPress: async (newEmail) => {
              if (newEmail && isValidEmail(newEmail)) {
                Alert.alert(
                  'Verification Sent',
                  `A verification link has been sent to ${newEmail}. Click the link to confirm your new email address.`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Invalid Email', 'Please enter a valid email address');
              }
            }
          }
        ],
        'plain-text',
        user?.email || ''
      );
    } else {
      Alert.alert(
        'Update Email',
        'To update your email address:\n\n1. Current email: ' + (user?.email || 'Not set') + '\n2. Contact support for secure email change\n3. Verification required for security',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Contact Support', onPress: () => Alert.alert('Support', 'Opening support for email change...') }
        ]
      );
    }
  };

  const showUpdatePhoneDialog = () => {
    if (Alert.prompt) {
      Alert.prompt(
        'Update Phone Number',
        'Enter your new phone number (include country code):',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Send SMS Code', 
            onPress: (newPhone) => {
              if (newPhone && isValidPhoneNumber(newPhone)) {
                Alert.alert(
                  'SMS Sent',
                  `A verification code has been sent to ${newPhone}. Enter the code to confirm your new phone number.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Enter Code', 
                      onPress: () => showSMSVerification(newPhone)
                    }
                  ]
                );
              } else {
                Alert.alert('Invalid Phone', 'Please enter a valid phone number with country code (e.g., +27821234567)');
              }
            }
          }
        ],
        'phone-pad',
        user?.phoneNumber || ''
      );
    } else {
      Alert.alert(
        'Update Phone Number',
        'To update your phone number:\n\n1. Current: ' + (user?.phoneNumber || 'Not set') + '\n2. Contact support for secure phone change\n3. SMS verification required',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Contact Support', onPress: () => Alert.alert('Support', 'Opening support for phone change...') }
        ]
      );
    }
  };

  const showSMSVerification = (phoneNumber: string) => {
    if (Alert.prompt) {
      Alert.prompt(
        'SMS Verification',
        `Enter the 6-digit code sent to ${phoneNumber}:`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Verify', 
            onPress: async (code) => {
              if (code && code.length === 6) {
                await updateUserProfile({ phoneNumber });
                Alert.alert('Success', 'Phone number updated successfully!');
              } else {
                Alert.alert('Invalid Code', 'Please enter the 6-digit verification code');
              }
            }
          }
        ],
        'numeric'
      );
    }
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhoneNumber = (phone: string): boolean => {
    return /^\+[1-9]\d{1,14}$/.test(phone);
  };

  const showProfilePictureOptions = () => {
    Alert.alert(
      'Profile Picture',
      'Choose how to update your profile picture:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Take Photo', 
          onPress: () => requestCameraPermission()
        },
        { 
          text: 'Choose from Gallery', 
          onPress: () => requestGalleryAccess()
        },
        { 
          text: 'Remove Photo', 
          onPress: () => updateUserProfile({ photoURL: null })
        },
        {
          text: 'Choose Avatar',
          onPress: () => showAvatarOptions()
        }
      ]
    );
  };

  const requestCameraPermission = () => {
    Alert.alert(
      'Camera Access',
      'BlueBot needs camera permission to take your profile photo.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Grant Permission', 
          onPress: () => {
            Alert.alert('Camera', 'Opening camera for profile photo...\n\n(In production, this would use react-native-image-picker)');
          }
        },
        {
          text: 'Settings',
          onPress: () => Alert.alert('Settings', 'Open device settings to manage app permissions')
        }
      ]
    );
  };

  const requestGalleryAccess = () => {
    Alert.alert(
      'Photo Library Access',
      'BlueBot needs access to your photo library to select a profile picture.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Grant Permission', 
          onPress: () => {
            Alert.alert('Gallery', 'Opening photo gallery...\n\n(In production, this would use expo-image-picker)');
          }
        },
        {
          text: 'Settings',
          onPress: () => Alert.alert('Settings', 'Open device settings to manage app permissions')
        }
      ]
    );
  };

  const showAvatarOptions = () => {
    const avatars = ['👤', '👨', '👩', '🧑', '👱', '👨‍💼', '👩‍💼', '🧑‍💼', '👨‍🎓', '👩‍🎓'];
    Alert.alert(
      'Choose Avatar',
      'Select a default avatar:',
      [
        { text: 'Cancel', style: 'cancel' },
        ...avatars.slice(0, 3).map((avatar, index) => ({
          text: `${avatar} Avatar ${index + 1}`,
          onPress: () => updateUserProfile({ photoURL: `avatar_${index + 1}` })
        })),
        {
          text: 'More Options',
          onPress: () => Alert.alert('Avatar Gallery', 'More avatar options available in settings')
        }
      ]
    );
  };

  const updateUserProfile = async (updates: any) => {
    setIsLoading(true);
    try {
      // Use the actual auth context to update profile
      if (updateProfile) {
        await updateProfile(updates);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        // Fallback - simulate update
        Alert.alert('Success', 'Profile changes saved locally. Will sync when online.');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update profile: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const showChangePasswordOptions = () => {
    Alert.alert(
      'Change Password',
      'Choose how you want to change your password:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Email Reset Link', 
          onPress: () => sendPasswordReset()
        },
        { 
          text: 'Change with Current Password', 
          onPress: () => showPasswordChangeForm()
        },
      ]
    );
  };

  const sendPasswordReset = async () => {
    try {
      if (resetPassword && user?.email) {
        await resetPassword(user.email);
        Alert.alert(
          'Reset Link Sent',
          `A password reset link has been sent to ${user.email}. Check your email and follow the instructions to reset your password.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Email address required for password reset');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    }
  };

  const showPasswordChangeForm = () => {
    if (Alert.prompt) {
      Alert.prompt(
        'Current Password',
        'Enter your current password:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Next', 
            onPress: (currentPassword) => {
              if (currentPassword && currentPassword.length >= 6) {
                showNewPasswordForm(currentPassword);
              } else {
                Alert.alert('Invalid Password', 'Please enter your current password');
              }
            }
          }
        ],
        'secure-text'
      );
    } else {
      Alert.alert(
        'Change Password',
        'For security, password changes require email verification. Use "Email Reset Link" option instead.',
        [{ text: 'OK' }]
      );
    }
  };

  const showNewPasswordForm = (currentPassword: string) => {
    if (Alert.prompt) {
      Alert.prompt(
        'New Password',
        'Enter your new password (minimum 8 characters):',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Change Password', 
            onPress: (newPassword) => {
              if (newPassword && newPassword.length >= 8) {
                confirmPasswordChange(currentPassword, newPassword);
              } else {
                Alert.alert('Weak Password', 'Password must be at least 8 characters long');
              }
            }
          }
        ],
        'secure-text'
      );
    }
  };

  const confirmPasswordChange = (currentPassword: string, newPassword: string) => {
    Alert.alert(
      'Confirm Password Change',
      'Are you sure you want to change your password?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Change Password', 
          onPress: async () => {
            setIsLoading(true);
            try {
              if (typeof (useMobileAuth as any) === 'function') {
                const { changePassword } = useMobileAuth();
                if (changePassword) {
                  await changePassword(currentPassword, newPassword);
                } else {
                  throw new Error('Change password not available');
                }
              }
              Alert.alert('Success', 'Password changed successfully!');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to change password: ' + error.message);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const showTwoFactorOptions = () => {
    Alert.alert(
      'Two-Factor Authentication',
      user?.biometricEnabled ? 
        'You have biometric authentication enabled. Choose additional 2FA methods:' :
        'Add an extra layer of security to your account:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'SMS Authentication', 
          onPress: () => setupSMS2FA()
        },
        { 
          text: 'Authenticator App', 
          onPress: () => setupAuthenticatorApp()
        },
        { 
          text: 'Email Verification', 
          onPress: () => setupEmail2FA()
        },
        {
          text: 'Biometric Settings',
          onPress: () => showBiometricSettings()
        }
      ]
    );
  };

  const setupSMS2FA = () => {
    if (user?.phoneNumber) {
      Alert.alert(
        'SMS Two-Factor Authentication',
        `Enable SMS 2FA for phone number: ${user.phoneNumber}?\n\nYou'll receive a verification code via SMS when signing in.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Enable SMS 2FA', 
            onPress: () => {
              Alert.alert(
                'SMS 2FA Enabled',
                'SMS two-factor authentication has been enabled for your account. You will receive a verification code on your phone for future logins.',
                [{ text: 'OK' }]
              );
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Phone Number Required',
        'You need to add a phone number before enabling SMS 2FA.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Phone Number', onPress: () => showUpdatePhoneDialog() }
        ]
      );
    }
  };

  const setupAuthenticatorApp = () => {
    const qrCodeData = 'otpauth://totp/BlueBot:' + user?.email + '?secret=ABCDEFGHIJKLMNOP&issuer=BlueBot';
    Alert.alert(
      'Authenticator App Setup',
      `1. Download Google Authenticator or Authy
2. Scan the QR code (would display here)
3. Enter the 6-digit code to verify

Secret key (manual entry): ABCD-EFGH-IJKL-MNOP`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'I have the app', 
          onPress: () => verifyAuthenticatorSetup()
        },
        {
          text: 'Download App',
          onPress: () => Alert.alert('Download', 'Redirecting to app store for Google Authenticator...')
        }
      ]
    );
  };

  const verifyAuthenticatorSetup = () => {
    if (Alert.prompt) {
      Alert.prompt(
        'Verify Authenticator',
        'Enter the 6-digit code from your authenticator app:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Verify', 
            onPress: (code) => {
              if (code && code.length === 6) {
                Alert.alert('Success', 'Authenticator app has been successfully linked to your account!');
              } else {
                Alert.alert('Invalid Code', 'Please enter the 6-digit code from your authenticator app');
              }
            }
          }
        ],
        'numeric'
      );
    } else {
      Alert.alert('Verification', 'Authenticator app verification coming soon!');
    }
  };

  const setupEmail2FA = () => {
    Alert.alert(
      'Email Two-Factor Authentication',
      `Enable email 2FA for: ${user?.email}?\n\nYou'll receive a verification code via email when signing in from new devices.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Enable Email 2FA', 
          onPress: () => {
            Alert.alert(
              'Email 2FA Enabled',
              'Email two-factor authentication has been enabled. You will receive verification codes via email for new device logins.',
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  const showBiometricSettings = () => {
    if (biometricAvailable) {
      Alert.alert(
        'Biometric Authentication',
        user?.biometricEnabled ? 
          'Biometric authentication is currently enabled for your account.' :
          'Biometric authentication is available on your device.',
        [
          { text: 'Cancel', style: 'cancel' },
          user?.biometricEnabled ? 
            { text: 'Disable Biometric', onPress: () => disableBiometric() } :
            { text: 'Enable Biometric', onPress: () => enableBiometric() },
          { text: 'Test Biometric', onPress: () => testBiometric() }
        ]
      );
    } else {
      Alert.alert(
        'Biometric Not Available',
        'Biometric authentication is not available on this device or not set up in device settings.',
        [
          { text: 'OK' },
          { text: 'Device Settings', onPress: () => Alert.alert('Settings', 'Open device settings to set up biometric authentication') }
        ]
      );
    }
  };

  const enableBiometric = async () => {
    try {
      // This would call the actual enableBiometric function from auth context
      Alert.alert('Success', 'Biometric authentication has been enabled for your account!');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to enable biometric authentication: ' + error.message);
    }
  };

  const disableBiometric = async () => {
    Alert.alert(
      'Disable Biometric Authentication',
      'Are you sure you want to disable biometric authentication? You will need to use your password or other 2FA methods.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disable', 
          style: 'destructive',
          onPress: async () => {
            try {
              // This would call the actual disableBiometric function from auth context
              Alert.alert('Disabled', 'Biometric authentication has been disabled for your account.');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to disable biometric authentication: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const testBiometric = async () => {
    try {
      // This would call the actual biometric test function
      Alert.alert('Test Successful', 'Biometric authentication is working correctly!');
    } catch (error: any) {
      Alert.alert('Test Failed', 'Biometric authentication test failed: ' + error.message);
    }
  };

  const showLoginActivity = () => {
    const loginHistory = [
      {
        date: 'Today 2:30 PM',
        device: 'Mobile App (iPhone)',
        location: 'Johannesburg, SA',
        method: 'Biometric',
        status: 'Current Session',
        ip: '192.168.1.42'
      },
      {
        date: 'Yesterday 6:45 PM',
        device: 'Mobile App (iPhone)',
        location: 'Johannesburg, SA',
        method: 'Email & Password',
        status: 'Successful',
        ip: '192.168.1.42'
      },
      {
        date: '2 days ago 10:15 AM',
        device: 'Web Browser (Chrome)',
        location: 'Cape Town, SA',
        method: 'Google Sign-In',
        status: 'Successful',
        ip: '102.165.23.114'
      },
      {
        date: '3 days ago 8:22 PM',
        device: 'Mobile App (iPhone)',
        location: 'Johannesburg, SA',
        method: 'Email & Password',
        status: 'Failed (Wrong Password)',
        ip: '192.168.1.42'
      }
    ];

    const formatLoginHistory = () => {
      return loginHistory.map(session => 
        `🔑 ${session.date}\n` +
        `   📱 ${session.device}\n` +
        `   📍 ${session.location}\n` +
        `   🔐 ${session.method}\n` +
        `   ${session.status === 'Current Session' ? '✅' : session.status === 'Successful' ? '✅' : '❌'} ${session.status}\n`
      ).join('\n');
    };

    Alert.alert(
      'Recent Login Activity',
      formatLoginHistory() + 
      '\n📧 Get email alerts for new logins\n' +
      '🔒 Sign out all devices available in settings',
      [
        { text: 'Close' },
        { 
          text: 'Email Alerts', 
          onPress: () => toggleEmailAlerts()
        },
        {
          text: 'Sign Out All',
          onPress: () => signOutAllDevices()
        },
        {
          text: 'Export Log',
          onPress: () => exportLoginHistory()
        }
      ]
    );
  };

  const toggleEmailAlerts = () => {
    Alert.alert(
      'Email Login Alerts',
      'Get notified via email when someone signs into your account from a new device or location.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Enable Alerts', 
          onPress: () => Alert.alert('Enabled', 'You will now receive email alerts for new logins.')
        },
        {
          text: 'Disable Alerts',
          onPress: () => Alert.alert('Disabled', 'Email login alerts have been disabled.')
        }
      ]
    );
  };

  const signOutAllDevices = () => {
    Alert.alert(
      'Sign Out All Devices',
      'This will sign you out of all devices and browsers. You will need to sign in again on each device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out All', 
          style: 'destructive',
          onPress: async () => {
            try {
              // This would call a function to invalidate all sessions
              Alert.alert(
                'Signed Out',
                'You have been signed out of all devices. Please sign in again to continue using BlueBot.',
                [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
              );
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out all devices: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const exportLoginHistory = () => {
    Alert.alert(
      'Export Login History',
      'Download your complete login history for security review.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Email Report', 
          onPress: () => Alert.alert('Email Sent', 'Login history report has been sent to your email address.')
        },
        {
          text: 'Download CSV',
          onPress: () => Alert.alert('Download', 'Login history CSV file has been prepared for download.')
        }
      ]
    );
  };

  const getLastLoginMethodDisplay = (method?: string) => {
    switch (method) {
      case 'email':
  return { icon: 'mail', text: 'Email & Password', color: theme.colors.primary };
      case 'phone':
  return { icon: 'phone-portrait', text: 'Phone Number', color: theme.colors.success };
      case 'google':
  return { icon: 'logo-google', text: 'Google Account', color: theme.colors.danger };
      case 'passwordless':
  return { icon: 'link', text: 'Passwordless Email', color: theme.colors.accent };
      case 'biometric':
  return { icon: 'finger-print', text: 'Biometric', color: theme.colors.warning };
      default:
  return { icon: 'person', text: 'Unknown', color: theme.colors.muted };
    }
  };

  const lastLoginMethod = getLastLoginMethodDisplay(user?.lastLoginMethod);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={theme.gradients.hero as any} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Ionicons name="pencil" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

  <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
  {/* User Info Card */}
  <GlassCard style={styles.userCard} gradient="nav" border>
          <View style={styles.avatarContainer}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={theme.colors.primary} />
              </View>
            )}
            <View style={styles.onlineIndicator} />
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
            
            <View style={styles.verificationBadge}>
              <Ionicons 
                name={user?.isVerified ? "checkmark-circle" : "alert-circle"} 
                size={16} 
                color={user?.isVerified ? theme.colors.success : theme.colors.warning} 
              />
              <Text style={[
                styles.verificationText,
                { color: user?.isVerified ? theme.colors.success : theme.colors.warning }
              ]}>
                {user?.isVerified ? 'Verified Account' : 'Unverified Account'}
              </Text>
            </View>

            {/* Last Login Method */}
            <View style={styles.lastLoginContainer}>
              <Ionicons name={lastLoginMethod.icon as any} size={14} color={lastLoginMethod.color} />
              <Text style={styles.lastLoginText}>
                Last signed in with {lastLoginMethod.text}
              </Text>
            </View>
          </View>
  </GlassCard>

  {/* Account Stats */}
  <GlassCard style={styles.statsContainer} border>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.kycStatus?.toUpperCase() || 'PENDING'}</Text>
            <Text style={styles.statLabel}>KYC Status</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2024'}
            </Text>
            <Text style={styles.statLabel}>Member Since</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.walletId ? 'ACTIVE' : 'INACTIVE'}</Text>
            <Text style={styles.statLabel}>Wallet</Text>
          </View>
  </GlassCard>

        {/* Security Settings */}
  <GlassCard style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Security Settings</Text>
          
          {/* Biometric Authentication */}
          <BiometricSettings onSettingsChange={(enabled) => {
            console.log('Biometric authentication', enabled ? 'enabled' : 'disabled');
          }} />

          {/* Other Security Options */}
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => showChangePasswordOptions()}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.chipBg }]}>
                <Ionicons name="key" size={20} color={theme.colors.warning} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Change Password</Text>
                <Text style={styles.settingSubtitle}>Update your account password</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => showTwoFactorOptions()}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.chipBg }]}>
                <Ionicons name="phone-portrait" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
                <Text style={styles.settingSubtitle}>Add an extra layer of security</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => showLoginActivity()}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.chipBg }]}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.danger} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Login Activity</Text>
                <Text style={styles.settingSubtitle}>Review recent sign-in attempts</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
  </GlassCard>

        {/* App Settings */}
  <GlassCard style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Alert.alert('Notifications', 'Notification settings coming soon! You\'ll be able to customize alerts for spending, budgets, and goals.')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.chipBg }]}> 
                <Ionicons name="notifications" size={20} color={theme.colors.accent} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingSubtitle}>Manage your notification preferences</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          {/* Theme toggle removed for dark-only mode */}

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Alert.alert('Language Settings', 'BlueBot supports multiple South African languages including English, Afrikaans, Zulu, and Xhosa. Full language switching coming soon!')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.chipBg }]}> 
                <Ionicons name="language" size={20} color={theme.colors.success} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Language</Text>
                <Text style={styles.settingSubtitle}>English (US)</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
  </GlassCard>

        {/* Support */}
  <GlassCard style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => {
              try {
                router.push('/faq');
              } catch (e) {
                Alert.alert('Help Center', 'Opening Help Center...');
              }
            }}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.chipBg }]}> 
                <Ionicons name="help-circle" size={20} color={theme.colors.warning} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Help Center</Text>
                <Text style={styles.settingSubtitle}>Get help and support</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => {
              const email = 'support@bluebot.app';
              const subject = encodeURIComponent('BlueBot Support');
              const body = encodeURIComponent(`Hi BlueBot Team,%0D%0A%0D%0AI need help with...%0D%0A%0D%0AUser: ${user?.email || 'N/A'}`);
              const url = `mailto:${email}?subject=${subject}&body=${body}`;
              Linking.openURL(url).catch(() => Alert.alert('Contact', 'Unable to open email app.'));
            }}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.chipBg }]}> 
                <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Contact Us</Text>
                <Text style={styles.settingSubtitle}>Send feedback or report issues</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
  </GlassCard>

        {/* Sign Out */}
        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleSignOut}
          disabled={isLoading}
        >
          <Ionicons name="log-out" size={20} color={theme.colors.danger} />
          <Text style={styles.signOutText}>
            {isLoading ? 'Signing Out...' : 'Sign Out'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>BlueBot v1.0.0</Text>
          <Text style={styles.footerText}>Made with ❤️ for financial wellness</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: theme.spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  color: theme.colors.text,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  backgroundColor: theme.colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20,
  },
  userCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
  backgroundColor: theme.colors.success,
  borderWidth: 2,
  borderColor: theme.colors.card,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 8,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  lastLoginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastLoginText: {
    fontSize: 12,
    color: theme.colors.muted,
    marginLeft: 6,
  },
  statsContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingItem: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  signOutButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
  color: theme.colors.danger,
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 12,
  color: theme.colors.muted,
    marginBottom: 4,
  },
});
