/**
 * Mobile-First Authentication Context
 * Prioritizes local authentication with SQLite and syncs with Firebase when online
 */

import React from 'react';
const { useState, useCallback, useEffect, useRef, useContext, createContext } = React;
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import NetInfo from '@react-native-community/netinfo';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile as updateFirebaseProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';

// Conditionally import Google Sign-in to avoid module errors
let GoogleSignin: any = null;
let statusCodes: any = null;
try {
  const googleSigninModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSigninModule.GoogleSignin;
  statusCodes = googleSigninModule.statusCodes;
} catch (error: any) {
  console.warn('Google Sign-in module not available:', error?.message || 'Unknown error');
}

import { auth } from '../config/firebase';
import { updatePassword as fbUpdatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useMobileDatabase } from './MobileDatabaseContext';

interface LocalUser {
  id: string;
  email?: string;
  phoneNumber?: string;
  fullName: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  photoURL?: string;
  kycStatus?: 'pending' | 'verified' | 'rejected';
  walletId?: string;
  biometricEnabled?: boolean;
  lastLoginMethod?: 'email' | 'phone' | 'google' | 'passwordless' | 'biometric' | 'local';
  isOnline: boolean;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncAt?: string;
}

interface MobileAuthContextType {
  // User state
  user: LocalUser | null;
  loading: boolean;
  isOnline: boolean;
  biometricAvailable: boolean;
  
  // Local authentication (works offline)
  signInLocal: (email: string, password: string) => Promise<void>;
  signUpLocal: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithBiometric: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  
  // Online authentication (requires internet)
  signInOnline: (email: string, password: string) => Promise<void>;
  signUpOnline: (email: string, password: string, fullName: string) => Promise<void>;
  signInPasswordless: (email: string) => Promise<void>;
  completePasswordlessSignIn: (email: string, emailLink: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  
  // Phone authentication
  signInWithPhone: (phoneNumber: string) => Promise<void>;
  signUpWithPhone: (phoneNumber: string, fullName: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  resendOTP: () => Promise<void>;
  
  // Utility methods
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<LocalUser>) => Promise<void>;
  switchToOfflineMode: () => Promise<void>;
  syncWithFirebase: () => Promise<void>;
  verifyRecaptcha: (token: string) => Promise<boolean>;
  changePassword?: (currentPassword: string, newPassword: string) => Promise<void>;
  
  // Sync status
  isSyncing: boolean;
  lastSyncAt?: string;
  pendingSyncCount: number;
}

const MobileAuthContext = createContext<MobileAuthContextType | undefined>(undefined);

export function useMobileAuth() {
  const context = useContext(MobileAuthContext);
  if (context === undefined) {
    throw new Error('useMobileAuth must be used within a MobileAuthProvider');
  }
  return context;
}

interface MobileAuthProviderProps {
  children: React.ReactNode;
}

export function MobileAuthProvider({ children }: MobileAuthProviderProps) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [pendingPhoneAuth, setPendingPhoneAuth] = useState<{
    phoneNumber: string;
    fullName?: string;
    isSignUp: boolean;
    verificationId?: string;
  } | null>(null);

  const {
    currentUser,
    createLocalUser,
    updateLocalUser,
    authenticateLocalUser,
    isOnline: dbIsOnline,
    isSyncing: dbIsSyncing,
    getSyncQueueStatus,
    forceSyncNow
  } = useMobileDatabase();

  useEffect(() => {
    initializeAuth();
    setupNetworkListener();
    checkBiometricAvailability();
    
    // Sync user state with database context
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    setIsOnline(dbIsOnline);
    setIsSyncing(dbIsSyncing);
    
    if (dbIsOnline) {
      updateSyncStatus();
    }
  }, [dbIsOnline, dbIsSyncing]);

  const initializeAuth = async () => {
    try {
      // Initialize Google Sign-In
      if (GoogleSignin) {
        GoogleSignin.configure({
          webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID', // Replace with your actual web client ID
          offlineAccess: true,
        });
      }

      // Check for stored user session
      const storedUserId = await SecureStore.getItemAsync('current_user_id');
      if (storedUserId && currentUser) {
        setUser(currentUser);
      }

      // Set up Firebase auth state listener (for online sync)
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser && isOnline) {
          await syncFirebaseUserWithLocal(firebaseUser);
        }
      });

      setLoading(false);
      return unsubscribe;
    } catch (error) {
      console.error('Auth initialization error:', error);
      setLoading(false);
    }
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsOnline(!!connected);
    });
    
    return unsubscribe;
  };

  const checkBiometricAvailability = async () => {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(isAvailable && isEnrolled);
    } catch (error) {
      console.log('Biometric check error:', error);
      setBiometricAvailable(false);
    }
  };

  const updateSyncStatus = async () => {
    try {
      const syncStatus = await getSyncQueueStatus();
      setPendingSyncCount(syncStatus.pending + syncStatus.failed);
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    // Simple hash for demo - use bcrypt or similar in production
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
  };

  // LOCAL AUTHENTICATION (Works Offline)
  const signInLocal = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const hashedPassword = await hashPassword(password);
      const localUser = await authenticateLocalUser(email, hashedPassword);
      
      if (localUser) {
        setUser(localUser);
        
        // Try to sync with Firebase if online
        if (isOnline) {
          try {
            await signInOnline(email, password);
          } catch (error) {
            console.log('Firebase sync failed, continuing with local auth');
          }
        }
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Local sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const signUpLocal = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      
      const hashedPassword = await hashPassword(password);
      const newUser = await createLocalUser({
        email,
        fullName,
        isVerified: false,
        passwordHash: hashedPassword,
        biometricEnabled: false,
        lastLoginMethod: 'local'
      });
      
      setUser(newUser);
      
      // Try to create Firebase account if online
      if (isOnline) {
        try {
          await signUpOnline(email, password, fullName);
        } catch (error) {
          console.log('Firebase sync failed, continuing with local account');
        }
      }
    } catch (error: any) {
      throw new Error(error.message || 'Local sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const signInWithBiometric = async () => {
    try {
      if (!biometricAvailable) {
        throw new Error('Biometric authentication not available');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in with biometric',
        fallbackLabel: 'Use passcode',
      });

      if (result.success) {
        // Get stored credentials
        const storedCredentials = await SecureStore.getItemAsync('biometric_user_id');
        if (storedCredentials && currentUser) {
          setUser(currentUser);
          
          // Update last login method
          await updateLocalUser(currentUser.id, { lastLoginMethod: 'biometric' });
        } else {
          throw new Error('No biometric credentials found');
        }
      } else {
        throw new Error('Biometric authentication failed');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Biometric sign-in failed');
    }
  };

  const enableBiometric = async () => {
    try {
      if (!user) throw new Error('No user signed in');
      if (!biometricAvailable) throw new Error('Biometric authentication not available');

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
        fallbackLabel: 'Use passcode',
      });

      if (result.success) {
        // Store user ID for biometric access
        await SecureStore.setItemAsync('biometric_user_id', user.id);
        
        // Update user profile
        await updateLocalUser(user.id, { biometricEnabled: true });
        setUser({ ...user, biometricEnabled: true });
      } else {
        throw new Error('Biometric setup cancelled');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to enable biometric authentication');
    }
  };

  const disableBiometric = async () => {
    try {
      if (!user) throw new Error('No user signed in');
      
      await SecureStore.deleteItemAsync('biometric_user_id');
      await updateLocalUser(user.id, { biometricEnabled: false });
      setUser({ ...user, biometricEnabled: false });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to disable biometric authentication');
    }
  };

  // ONLINE AUTHENTICATION (Requires Internet)
  const signInOnline = async (email: string, password: string) => {
    if (!isOnline) {
      throw new Error('Internet connection required for online sign-in');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await syncFirebaseUserWithLocal(userCredential.user);
    } catch (error: any) {
      let errorMessage = 'Online sign in failed';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        default:
          errorMessage = error.message || 'Sign in failed';
      }
      
      throw new Error(errorMessage);
    }
  };

  const signUpOnline = async (email: string, password: string, fullName: string) => {
    if (!isOnline) {
      throw new Error('Internet connection required for online sign-up');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase Auth profile
      await updateFirebaseProfile(userCredential.user, {
        displayName: fullName
      });
      
      await syncFirebaseUserWithLocal(userCredential.user);
    } catch (error: any) {
      let errorMessage = 'Online registration failed';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
        default:
          errorMessage = error.message || 'Registration failed';
      }
      
      throw new Error(errorMessage);
    }
  };

  const signInPasswordless = async (email: string) => {
    if (!isOnline) {
      throw new Error('Internet connection required for passwordless sign-in');
    }

    try {
      const actionCodeSettings = {
        url: 'https://yourapp.page.link/finishSignUp', // Replace with your deep link
        handleCodeInApp: true,
        iOS: {
          bundleId: 'com.yourapp.bluebot'
        },
        android: {
          packageName: 'com.yourapp.bluebot',
          installApp: true,
          minimumVersion: '12'
        },
        dynamicLinkDomain: 'yourapp.page.link' // Replace with your domain
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      await SecureStore.setItemAsync('emailForSignIn', email);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send sign-in link');
    }
  };

  const completePasswordlessSignIn = async (email: string, emailLink: string) => {
    if (!isOnline) {
      throw new Error('Internet connection required');
    }

    try {
      if (isSignInWithEmailLink(auth, emailLink)) {
        const result = await signInWithEmailLink(auth, email, emailLink);
        await SecureStore.deleteItemAsync('emailForSignIn');
        await syncFirebaseUserWithLocal(result.user);
      } else {
        throw new Error('Invalid sign-in link');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to complete passwordless sign-in');
    }
  };

  const signInWithGoogle = async () => {
    if (!GoogleSignin) {
      throw new Error('Google Sign-in is not available on this platform');
    }
    
    if (!isOnline) {
      throw new Error('Internet connection required for Google sign-in');
    }

    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      if (userInfo.data?.idToken) {
        const googleCredential = GoogleAuthProvider.credential(userInfo.data.idToken);
        const result = await signInWithCredential(auth, googleCredential);
        await syncFirebaseUserWithLocal(result.user);
      }
    } catch (error: any) {
      if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Google sign-in was cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Google sign-in is in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services not available');
      } else {
        throw new Error(error.message || 'Google sign-in failed');
      }
    }
  };

  const resetPassword = async (email: string) => {
    if (!isOnline) {
      throw new Error('Internet connection required for password reset');
    }

    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      let errorMessage = 'Failed to send reset email';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        default:
          errorMessage = error.message || 'Failed to send reset email';
      }
      
      throw new Error(errorMessage);
    }
  };

  // CHANGE PASSWORD (requires online Firebase auth)
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!isOnline) throw new Error('Internet connection required to change password');
    const current = auth.currentUser;
    if (!current || !current.email) throw new Error('No authenticated user');
    try {
      const credential = EmailAuthProvider.credential(current.email, currentPassword);
      await reauthenticateWithCredential(current, credential);
      await fbUpdatePassword(current, newPassword);
    } catch (error: any) {
      let msg = 'Failed to change password';
      switch (error.code) {
        case 'auth/wrong-password':
          msg = 'Current password is incorrect';
          break;
        case 'auth/weak-password':
          msg = 'New password is too weak';
          break;
        case 'auth/requires-recent-login':
          msg = 'Please sign in again and retry';
          break;
        default:
          msg = error.message || msg;
      }
      throw new Error(msg);
    }
  };

  // PHONE AUTHENTICATION
  const signInWithPhone = async (phoneNumber: string) => {
    try {
      // For demo purposes, we'll simulate the process
      setPendingPhoneAuth({
        phoneNumber,
        isSignUp: false,
        verificationId: 'mock_verification_id',
      });
      
      console.log('SMS verification code sent to:', phoneNumber);
    } catch (error) {
      throw new Error('Failed to send verification code');
    }
  };

  const signUpWithPhone = async (phoneNumber: string, fullName: string) => {
    try {
      setPendingPhoneAuth({
        phoneNumber,
        fullName,
        isSignUp: true,
        verificationId: 'mock_verification_id',
      });
      
      console.log('SMS verification code sent to:', phoneNumber);
    } catch (error) {
      throw new Error('Failed to send verification code');
    }
  };

  const verifyOTP = async (otp: string) => {
    if (!pendingPhoneAuth) {
      throw new Error('No pending phone authentication');
    }

    try {
      // In a real implementation, you would verify the OTP with Firebase
      if (otp.length === 6) {
        // Create or sign in local user
        if (pendingPhoneAuth.isSignUp && pendingPhoneAuth.fullName) {
          const newUser = await createLocalUser({
            phoneNumber: pendingPhoneAuth.phoneNumber,
            fullName: pendingPhoneAuth.fullName,
            isVerified: true,
            lastLoginMethod: 'phone'
          });
          setUser(newUser);
        } else {
          // Sign in existing user (implement phone-based lookup)
          console.log('Phone sign-in completed');
        }
        
        setPendingPhoneAuth(null);
      } else {
        throw new Error('Invalid verification code');
      }
    } catch (error) {
      throw new Error('Invalid verification code');
    }
  };

  const resendOTP = async () => {
    if (!pendingPhoneAuth) {
      throw new Error('No pending phone authentication');
    }

    try {
      console.log('Verification code resent to:', pendingPhoneAuth.phoneNumber);
    } catch (error) {
      throw new Error('Failed to resend verification code');
    }
  };

  // UTILITY METHODS
  const syncFirebaseUserWithLocal = async (firebaseUser: FirebaseUser) => {
    try {
      if (!currentUser) {
        // Create local user from Firebase user
        const newUser = await createLocalUser({
          email: firebaseUser.email || undefined,
          fullName: firebaseUser.displayName || 'User',
          isVerified: firebaseUser.emailVerified,
          photoURL: firebaseUser.photoURL || undefined,
          lastLoginMethod: 'email'
        });
        setUser(newUser);
      } else {
        // Update existing local user
        await updateLocalUser(currentUser.id, {
          email: firebaseUser.email || undefined,
          isVerified: firebaseUser.emailVerified,
          photoURL: firebaseUser.photoURL || undefined,
          syncStatus: 'synced',
          lastSyncAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error syncing Firebase user with local:', error);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Sign out from Firebase if online
      if (isOnline) {
        try {
          await firebaseSignOut(auth);
        } catch (error) {
          console.log('Firebase sign out failed, continuing with local sign out');
        }
      }
      
      // Clear local session
      await SecureStore.deleteItemAsync('current_user_id');
      await SecureStore.deleteItemAsync('biometric_user_id');
      
      setUser(null);
      setPendingPhoneAuth(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<LocalUser>) => {
    if (!user) throw new Error('No user signed in');

    try {
      await updateLocalUser(user.id, updates);
      setUser({ ...user, ...updates });
    } catch (error) {
      throw new Error('Failed to update profile');
    }
  };

  const switchToOfflineMode = async () => {
    if (user) {
      await updateLocalUser(user.id, { isOnline: false });
    }
  };

  const syncWithFirebase = async () => {
    if (isOnline) {
      setIsSyncing(true);
      try {
        await forceSyncNow();
        setLastSyncAt(new Date().toISOString());
        await updateSyncStatus();
      } catch (error) {
        console.error('Manual sync failed:', error);
        throw new Error('Sync failed');
      } finally {
        setIsSyncing(false);
      }
    } else {
      throw new Error('Internet connection required for sync');
    }
  };

  const verifyRecaptcha = async (token: string): Promise<boolean> => {
    try {
      // In a real app, you'd verify this token with your backend
      return token.length > 0;
    } catch (error) {
      console.error('reCAPTCHA verification failed:', error);
      return false;
    }
  };

  const value: MobileAuthContextType = {
    user,
    loading,
    isOnline,
    biometricAvailable,
    
    // Local authentication
    signInLocal,
    signUpLocal,
    signInWithBiometric,
    enableBiometric,
    disableBiometric,
    
    // Online authentication
    signInOnline,
    signUpOnline,
    signInPasswordless,
    completePasswordlessSignIn,
    signInWithGoogle,
    resetPassword,
    
    // Phone authentication
    signInWithPhone,
    signUpWithPhone,
    verifyOTP,
    resendOTP,
    
    // Utility methods
    signOut,
    updateProfile,
    switchToOfflineMode,
    syncWithFirebase,
    verifyRecaptcha,
  changePassword,
    
    // Sync status
    isSyncing,
    lastSyncAt,
    pendingSyncCount,
  };

  return (
    <MobileAuthContext.Provider value={value}>
      {children}
    </MobileAuthContext.Provider>
  );
}
