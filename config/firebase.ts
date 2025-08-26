import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyClM3chI-4ChbBkroKEyq_o8Qjnaiha6MQ",
  authDomain: "bluebot-83d8f.firebaseapp.com",
  projectId: "bluebot-83d8f",
  storageBucket: "bluebot-83d8f.firebasestorage.app",
  messagingSenderId: "961722394282",
  appId: "1:961722394282:web:04b266d096941df03d52d3",
  measurementId: "G-XGKB40J5T5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Storage
const storage = getStorage(app);

export { auth, db, storage };
export default app;
