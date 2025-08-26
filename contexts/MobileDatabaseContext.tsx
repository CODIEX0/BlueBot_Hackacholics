/**
 * Mobile-First Database Context with SQLite and Firebase Sync
 * Prioritizes local storage and syncs with Firebase when internet is available
 */

import React from 'react';
const { useState, useCallback, useEffect, useRef, useContext, createContext } = React;
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db as firebaseDb } from '../config/firebase';

// User interface for local storage
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
  lastLoginMethod?: 'email' | 'phone' | 'google' | 'passwordless' | 'biometric';
  passwordHash?: string; // For local authentication
  isOnline: boolean;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncAt?: string;
}

// Enhanced Expense interface with sync status
interface Expense {
  id: number;
  userId: string;
  amount: number;
  category: string;
  merchant: string;
  description: string;
  date: string;
  receiptUrl?: string;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  firebaseId?: string; // Firebase document ID when synced
}

// Enhanced Receipt interface with sync status
interface Receipt {
  id: number;
  userId: string;
  imageUri: string;
  merchantName: string;
  amount: number;
  date: string;
  items: string; // JSON string of items
  category: string;
  processed: boolean;
  ocrConfidence: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  firebaseId?: string; // Firebase document ID when synced
}

// Sync queue item
interface SyncQueueItem {
  id: number;
  table: 'users' | 'expenses' | 'receipts';
  operation: 'create' | 'update' | 'delete';
  recordId: string | number;
  data?: any;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
  error?: string;
}

// Category with budget information
interface CategoryWithBudget {
  name: string;
  budget?: number;
  spent: number;
  color: string;
  icon: string;
  description?: string;
}

interface MobileDatabaseContextType {
  // Connection status
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt?: string;
  
  // User management
  currentUser: LocalUser | null;
  createLocalUser: (userData: Omit<LocalUser, 'id' | 'createdAt' | 'updatedAt' | 'isOnline' | 'syncStatus'>) => Promise<LocalUser>;
  updateLocalUser: (userId: string, updates: Partial<LocalUser>) => Promise<void>;
  authenticateLocalUser: (identifier: string, password: string) => Promise<LocalUser | null>;
  setUserOfflineMode: (userId: string, offline: boolean) => Promise<void>;
  
  // Expenses (mobile-first)
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<void>;
  updateExpense: (id: number, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
  scanReceiptAndAddExpense: (imageUri: string) => Promise<void>;
  getExpensesByCategory: (category: string) => Expense[];
  getExpensesByDateRange: (startDate: string, endDate: string) => Expense[];
  
  // Receipts (mobile-first)
  receipts: Receipt[];
  addReceipt: (receipt: Omit<Receipt, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<void>;
  updateReceipt: (id: number, updates: Partial<Receipt>) => Promise<void>;
  deleteReceipt: (id: number) => Promise<void>;
  
  // Categories
  categories: CategoryWithBudget[];
  getCategories: () => string[];
  getCategoriesWithBudgets: () => CategoryWithBudget[];
  updateCategoryBudget: (categoryName: string, budget: number) => Promise<void>;
  getCategoryTotals: (startDate?: string, endDate?: string) => { [category: string]: number };
  
  // UI state helpers
  editingExpenseId: number | null;
  setEditingExpenseId: (id: number | null) => void;
  openAddExpensePending: boolean;
  setOpenAddExpensePending: (open: boolean) => void;
  
  // Sync management
  forceSyncNow: () => Promise<void>;
  clearSyncQueue: () => Promise<void>;
  getSyncQueueStatus: () => Promise<{ pending: number; failed: number }>;
  
  // Database management
  clearAllLocalData: () => Promise<void>;
  exportLocalData: () => Promise<string>;
  importLocalData: (data: string) => Promise<void>;
}

const MobileDatabaseContext = createContext<MobileDatabaseContextType | undefined>(undefined);

export function useMobileDatabase() {
  const context = useContext(MobileDatabaseContext);
  if (context === undefined) {
    throw new Error('useMobileDatabase must be used within a MobileDatabaseProvider');
  }
  return context;
}

interface MobileDatabaseProviderProps {
  children: React.ReactNode;
}

export function MobileDatabaseProvider({ children }: MobileDatabaseProviderProps) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [categories, setCategories] = useState<CategoryWithBudget[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>();
  // Transient UI state shared across screens (avoids router param version mismatches)
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [openAddExpensePending, setOpenAddExpensePending] = useState<boolean>(false);
  
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    initializeDatabase();
    setupNetworkListener();
    loadCurrentUser();
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && currentUser) {
      scheduleSyncAttempt();
    }
  }, [isOnline, currentUser]);

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsOnline(!!connected);
    });
    
    return unsubscribe;
  };

  const initializeDatabase = async () => {
    try {
      const database = await SQLite.openDatabaseAsync('bluebot_mobile.db');
      setDb(database);
      
      // Create enhanced tables with sync support
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE,
          phoneNumber TEXT UNIQUE,
          fullName TEXT NOT NULL,
          isVerified INTEGER DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          photoURL TEXT,
          kycStatus TEXT DEFAULT 'pending',
          walletId TEXT,
          biometricEnabled INTEGER DEFAULT 0,
          lastLoginMethod TEXT,
          passwordHash TEXT,
          isOnline INTEGER DEFAULT 1,
          syncStatus TEXT DEFAULT 'pending',
          lastSyncAt TEXT
        );
        
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          merchant TEXT NOT NULL,
          description TEXT,
          date TEXT NOT NULL,
          receiptUrl TEXT,
          isRecurring INTEGER DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          syncStatus TEXT DEFAULT 'pending',
          firebaseId TEXT,
          FOREIGN KEY (userId) REFERENCES users (id)
        );
        
        CREATE TABLE IF NOT EXISTS receipts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          imageUri TEXT NOT NULL,
          merchantName TEXT NOT NULL,
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          items TEXT,
          category TEXT NOT NULL,
          processed INTEGER DEFAULT 0,
          ocrConfidence REAL DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          syncStatus TEXT DEFAULT 'pending',
          firebaseId TEXT,
          FOREIGN KEY (userId) REFERENCES users (id)
        );
        
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          name TEXT NOT NULL,
          budget REAL DEFAULT 0,
          color TEXT NOT NULL,
          icon TEXT NOT NULL,
          description TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          UNIQUE(userId, name),
          FOREIGN KEY (userId) REFERENCES users (id)
        );
        
        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          operation TEXT NOT NULL,
          recordId TEXT NOT NULL,
          data TEXT,
          createdAt TEXT NOT NULL,
          attempts INTEGER DEFAULT 0,
          lastAttempt TEXT,
          error TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(userId, date);
        CREATE INDEX IF NOT EXISTS idx_expenses_sync ON expenses(syncStatus);
        CREATE INDEX IF NOT EXISTS idx_receipts_user_date ON receipts(userId, date);
        CREATE INDEX IF NOT EXISTS idx_receipts_sync ON receipts(syncStatus);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(operation, attempts);
      `);
      
      console.log('Mobile database initialized successfully');
      
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const userId = await SecureStore.getItemAsync('current_user_id');
      if (userId && db) {
        const user = await db.getFirstAsync(
          'SELECT * FROM users WHERE id = ?',
          [userId]
        ) as LocalUser;
        
        if (user) {
          setCurrentUser(user);
          await loadUserData(user.id);
        }
      } else if (!userId && db) {
        // Create a default local user so features like Add Expense work out of the box
        try {
          const guest = await createLocalUser({
            fullName: 'Guest User',
            isVerified: false,
            email: undefined as any,
            phoneNumber: undefined as any,
          } as any);
          await loadUserData(guest.id);
        } catch (e) {
          console.error('Unable to initialize default user:', e);
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadUserData = async (userId: string) => {
    if (!db) return;
    
    try {
      // Load expenses for user
      const userExpenses = await db.getAllAsync(
        'SELECT * FROM expenses WHERE userId = ? ORDER BY date DESC, createdAt DESC',
        [userId]
      );
      setExpenses(userExpenses as Expense[]);
      
      // Load receipts for user
      const userReceipts = await db.getAllAsync(
        'SELECT * FROM receipts WHERE userId = ? ORDER BY date DESC, createdAt DESC',
        [userId]
      );
      setReceipts(userReceipts as Receipt[]);
      
      // Load categories for user
      await loadUserCategories(userId);
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadUserCategories = async (userId: string) => {
    if (!db) return;
    
    try {
      // Check if user has any categories
      const existingCategories = await db.getAllAsync(
        'SELECT * FROM categories WHERE userId = ?',
        [userId]
      );
      
      if (existingCategories.length === 0) {
        // Initialize default categories
        await initializeDefaultCategories(userId);
      }
      
      // Load all categories with calculated spent amounts
      const categoriesData = await db.getAllAsync(
        `SELECT c.*, COALESCE(SUM(e.amount), 0) as spent 
         FROM categories c 
         LEFT JOIN expenses e ON c.name = e.category AND c.userId = e.userId 
         WHERE c.userId = ? 
         GROUP BY c.id 
         ORDER BY c.name`,
        [userId]
      );
      
      setCategories(categoriesData as CategoryWithBudget[]);
      
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const initializeDefaultCategories = async (userId: string) => {
    if (!db) return;
    
    const defaultCategories = [
      { name: 'Food & Dining', color: '#EF4444', icon: 'restaurant-outline', description: 'Restaurants, groceries, and food delivery' },
      { name: 'Transportation', color: '#3B82F6', icon: 'car-outline', description: 'Fuel, public transport, and ride-sharing' },
      { name: 'Shopping', color: '#8B5CF6', icon: 'bag-outline', description: 'Clothing, electronics, and retail purchases' },
      { name: 'Entertainment', color: '#EC4899', icon: 'game-controller-outline', description: 'Movies, games, and recreational activities' },
      { name: 'Bills & Utilities', color: '#F59E0B', icon: 'receipt-outline', description: 'Electricity, water, internet, and subscriptions' },
      { name: 'Healthcare', color: '#10B981', icon: 'medical-outline', description: 'Medical expenses, pharmacy, and insurance' },
      { name: 'Education', color: '#0EA5E9', icon: 'school-outline', description: 'Books, courses, and educational materials' },
      { name: 'Other', color: '#64748B', icon: 'ellipsis-horizontal-outline', description: 'Miscellaneous expenses' }
    ];
    
    const now = new Date().toISOString();
    
    for (const category of defaultCategories) {
      await db.runAsync(
        `INSERT INTO categories (userId, name, budget, color, icon, description, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, category.name, 0, category.color, category.icon, category.description, now, now]
      );
    }
  };

  const createLocalUser = async (userData: Omit<LocalUser, 'id' | 'createdAt' | 'updatedAt' | 'isOnline' | 'syncStatus'>): Promise<LocalUser> => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      const userId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const newUser: LocalUser = {
        id: userId,
        ...userData,
        createdAt: now,
        updatedAt: now,
        isOnline: isOnline,
        syncStatus: 'pending'
      };
      
      await db.runAsync(`
        INSERT INTO users (
          id, email, phoneNumber, fullName, isVerified, createdAt, updatedAt,
          photoURL, kycStatus, walletId, biometricEnabled, lastLoginMethod,
          passwordHash, isOnline, syncStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newUser.id, newUser.email, newUser.phoneNumber, newUser.fullName,
        newUser.isVerified ? 1 : 0, newUser.createdAt, newUser.updatedAt,
        newUser.photoURL, newUser.kycStatus, newUser.walletId,
        newUser.biometricEnabled ? 1 : 0, newUser.lastLoginMethod,
        newUser.passwordHash, newUser.isOnline ? 1 : 0, newUser.syncStatus
      ]);
      
      // Save to secure store
      await SecureStore.setItemAsync('current_user_id', userId);
      setCurrentUser(newUser);
      
      // Queue for sync
      await addToSyncQueue('users', 'create', userId, newUser);
      
      return newUser;
      
    } catch (error) {
      console.error('Error creating local user:', error);
      throw error;
    }
  };

  const updateLocalUser = async (userId: string, updates: Partial<LocalUser>) => {
    if (!db) return;
    
    try {
      const now = new Date().toISOString();
      const updatesWithTimestamp = { ...updates, updatedAt: now, syncStatus: 'pending' };
      
      const setClause = Object.keys(updatesWithTimestamp).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updatesWithTimestamp);
      
      await db.runAsync(
        `UPDATE users SET ${setClause} WHERE id = ?`,
        [...values, userId]
      );
      
      // Update current user state
      if (currentUser?.id === userId) {
        setCurrentUser({ ...currentUser, ...updatesWithTimestamp });
      }
      
      // Queue for sync
      await addToSyncQueue('users', 'update', userId, updatesWithTimestamp);
      
    } catch (error) {
      console.error('Error updating local user:', error);
      throw error;
    }
  };

  const authenticateLocalUser = async (identifier: string, password: string): Promise<LocalUser | null> => {
    if (!db) return null;
    
    try {
      // For demo purposes, we'll use a simple password check
      // In production, use proper password hashing (bcrypt, etc.)
      const user = await db.getFirstAsync(
        'SELECT * FROM users WHERE (email = ? OR phoneNumber = ?) AND passwordHash = ?',
        [identifier, identifier, password] // In production, hash the password first
      ) as LocalUser;
      
      if (user) {
        await SecureStore.setItemAsync('current_user_id', user.id);
        setCurrentUser(user);
        await loadUserData(user.id);
        
        // Update last login
        await updateLocalUser(user.id, { 
          lastLoginMethod: 'email',
          updatedAt: new Date().toISOString()
        });
        
        return user;
      }
      
      return null;
      
    } catch (error) {
      console.error('Error authenticating local user:', error);
      return null;
    }
  };

  const setUserOfflineMode = async (userId: string, offline: boolean) => {
    await updateLocalUser(userId, { isOnline: !offline });
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
    if (!db) return;
    // If no user exists yet, create a default local user so adding works everywhere
    if (!currentUser) {
      try {
        const guest = await createLocalUser({
          fullName: 'Guest User',
          isVerified: false,
          email: undefined as any,
          phoneNumber: undefined as any,
        } as any);
        setCurrentUser(guest);
      } catch (e) {
        console.error('Failed to auto-create user before adding expense:', e);
        throw e;
      }
    }

    try {
      const now = new Date().toISOString();
      const result = await db.runAsync(`
        INSERT INTO expenses (
          userId, amount, category, merchant, description, date, receiptUrl,
          isRecurring, createdAt, updatedAt, syncStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        (currentUser as any).id, expense.amount, expense.category, expense.merchant,
        expense.description || '', expense.date, expense.receiptUrl || null,
        expense.isRecurring ? 1 : 0, now, now, 'pending'
      ]);
      
      await loadUserData((currentUser as any).id);
      
      // Queue for sync
      const newExpense = { ...expense, id: result.lastInsertRowId, userId: (currentUser as any).id, createdAt: now, updatedAt: now };
      await addToSyncQueue('expenses', 'create', result.lastInsertRowId!, newExpense);
      
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };

  const updateExpense = async (id: number, updates: Partial<Expense>) => {
    if (!db || !currentUser) return;

    try {
      const now = new Date().toISOString();
      const updatesWithTimestamp = { ...updates, updatedAt: now, syncStatus: 'pending' };
      
      const setClause = Object.keys(updatesWithTimestamp).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updatesWithTimestamp);
      
      await db.runAsync(
        `UPDATE expenses SET ${setClause} WHERE id = ? AND userId = ?`,
        [...values, id, currentUser.id]
      );
      
      await loadUserData(currentUser.id);
      
      // Queue for sync
      await addToSyncQueue('expenses', 'update', id, updatesWithTimestamp);
      
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  };

  const deleteExpense = async (id: number) => {
    if (!db || !currentUser) return;

    try {
      await db.runAsync('DELETE FROM expenses WHERE id = ? AND userId = ?', [id, currentUser.id]);
      await loadUserData(currentUser.id);
      
      // Queue for sync
      await addToSyncQueue('expenses', 'delete', id);
      
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  };

  const addReceipt = async (receipt: Omit<Receipt, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
    if (!db || !currentUser) return;

    try {
      const now = new Date().toISOString();
      const result = await db.runAsync(`
        INSERT INTO receipts (
          userId, imageUri, merchantName, amount, date, items, category,
          processed, ocrConfidence, createdAt, updatedAt, syncStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        currentUser.id, receipt.imageUri, receipt.merchantName, receipt.amount,
        receipt.date, receipt.items, receipt.category, receipt.processed ? 1 : 0,
        receipt.ocrConfidence, now, now, 'pending'
      ]);
      
      await loadUserData(currentUser.id);
      
      // Queue for sync
      const newReceipt = { ...receipt, id: result.lastInsertRowId, userId: currentUser.id, createdAt: now, updatedAt: now };
      await addToSyncQueue('receipts', 'create', result.lastInsertRowId!, newReceipt);
      
    } catch (error) {
      console.error('Error adding receipt:', error);
      throw error;
    }
  };

  const updateReceipt = async (id: number, updates: Partial<Receipt>) => {
    if (!db || !currentUser) return;

    try {
      const now = new Date().toISOString();
      const updatesWithTimestamp = { ...updates, updatedAt: now, syncStatus: 'pending' };
      
      const setClause = Object.keys(updatesWithTimestamp).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updatesWithTimestamp);
      
      await db.runAsync(
        `UPDATE receipts SET ${setClause} WHERE id = ? AND userId = ?`,
        [...values, id, currentUser.id]
      );
      
      await loadUserData(currentUser.id);
      
      // Queue for sync
      await addToSyncQueue('receipts', 'update', id, updatesWithTimestamp);
      
    } catch (error) {
      console.error('Error updating receipt:', error);
      throw error;
    }
  };

  const deleteReceipt = async (id: number) => {
    if (!db || !currentUser) return;

    try {
      await db.runAsync('DELETE FROM receipts WHERE id = ? AND userId = ?', [id, currentUser.id]);
      await loadUserData(currentUser.id);
      
      // Queue for sync
      await addToSyncQueue('receipts', 'delete', id);
      
    } catch (error) {
      console.error('Error deleting receipt:', error);
      throw error;
    }
  };

  const addToSyncQueue = async (table: string, operation: string, recordId: string | number, data?: any) => {
    if (!db || !isOnline) return;
    
    try {
      await db.runAsync(`
        INSERT INTO sync_queue (table_name, operation, recordId, data, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `, [table, operation, recordId.toString(), data ? JSON.stringify(data) : null, new Date().toISOString()]);
      
      // Schedule sync attempt
      scheduleSyncAttempt();
      
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  };

  const scheduleSyncAttempt = () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      processSyncQueue();
    }, 2000); // Wait 2 seconds before syncing
  };

  const processSyncQueue = async () => {
    if (!db || !isOnline || isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      const queueItems = await db.getAllAsync(
        'SELECT * FROM sync_queue WHERE attempts < 3 ORDER BY createdAt ASC LIMIT 10'
      ) as SyncQueueItem[];
      
      for (const item of queueItems) {
        try {
          await syncItem(item);
          
          // Remove successful sync from queue
          await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
          
        } catch (error) {
          // Update attempts and error
          await db.runAsync(`
            UPDATE sync_queue 
            SET attempts = attempts + 1, lastAttempt = ?, error = ?
            WHERE id = ?
          `, [new Date().toISOString(), (error as Error).message, item.id]);
        }
      }
      
      setLastSyncAt(new Date().toISOString());
      
    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncItem = async (item: SyncQueueItem) => {
    if (!firebaseDb || !currentUser) return;
    
    const data = item.data ? JSON.parse(item.data) : null;
    
    switch (item.table) {
      case 'users':
        await syncUserToFirebase(item.operation, String(item.recordId), data);
        break;
      case 'expenses':
        await syncExpenseToFirebase(item.operation, Number(item.recordId), data);
        break;
      case 'receipts':
        await syncReceiptToFirebase(item.operation, Number(item.recordId), data);
        break;
    }
  };

  const syncUserToFirebase = async (operation: string, userId: string, data: any) => {
    if (!firebaseDb) return;
    
    const userRef = doc(firebaseDb, 'users', userId);
    
    switch (operation) {
      case 'create':
      case 'update':
        const { passwordHash, ...syncData } = data; // Don't sync password hash
        await setDoc(userRef, syncData, { merge: true });
        break;
      // Note: We typically don't delete users, just mark as inactive
    }
  };

  const syncExpenseToFirebase = async (operation: string, expenseId: number, data: any) => {
    if (!firebaseDb || !currentUser) return;
    
    switch (operation) {
      case 'create':
        const expenseRef = doc(collection(firebaseDb, 'expenses'));
        const { id, ...expenseData } = data; // Remove local ID
        await setDoc(expenseRef, { ...expenseData, userId: currentUser.id });
        
        // Update local record with Firebase ID
        if (db) {
          await db.runAsync(
            'UPDATE expenses SET firebaseId = ?, syncStatus = ? WHERE id = ?',
            [expenseRef.id, 'synced', expenseId]
          );
        }
        break;
        
      case 'update':
        if (db) {
          const expense = await db.getFirstAsync(
            'SELECT firebaseId FROM expenses WHERE id = ?',
            [expenseId]
          ) as { firebaseId?: string };
          
          if (expense?.firebaseId) {
            const expenseRef = doc(firebaseDb, 'expenses', expense.firebaseId);
            await updateDoc(expenseRef, data);
            
            await db.runAsync(
              'UPDATE expenses SET syncStatus = ? WHERE id = ?',
              ['synced', expenseId]
            );
          }
        }
        break;
        
      case 'delete':
        if (db) {
          const expense = await db.getFirstAsync(
            'SELECT firebaseId FROM expenses WHERE id = ?',
            [expenseId]
          ) as { firebaseId?: string };
          
          if (expense?.firebaseId) {
            const expenseRef = doc(firebaseDb, 'expenses', expense.firebaseId);
            await updateDoc(expenseRef, { deleted: true, deletedAt: new Date().toISOString() });
          }
        }
        break;
    }
  };

  const syncReceiptToFirebase = async (operation: string, receiptId: number, data: any) => {
    if (!firebaseDb || !currentUser) return;
    
    switch (operation) {
      case 'create':
        const receiptRef = doc(collection(firebaseDb, 'receipts'));
        const { id, ...receiptData } = data;
        await setDoc(receiptRef, { ...receiptData, userId: currentUser.id });
        
        if (db) {
          await db.runAsync(
            'UPDATE receipts SET firebaseId = ?, syncStatus = ? WHERE id = ?',
            [receiptRef.id, 'synced', receiptId]
          );
        }
        break;
        
      case 'update':
        if (db) {
          const receipt = await db.getFirstAsync(
            'SELECT firebaseId FROM receipts WHERE id = ?',
            [receiptId]
          ) as { firebaseId?: string };
          
          if (receipt?.firebaseId) {
            const receiptRef = doc(firebaseDb, 'receipts', receipt.firebaseId);
            await updateDoc(receiptRef, data);
            
            await db.runAsync(
              'UPDATE receipts SET syncStatus = ? WHERE id = ?',
              ['synced', receiptId]
            );
          }
        }
        break;
        
      case 'delete':
        if (db) {
          const receipt = await db.getFirstAsync(
            'SELECT firebaseId FROM receipts WHERE id = ?',
            [receiptId]
          ) as { firebaseId?: string };
          
          if (receipt?.firebaseId) {
            const receiptRef = doc(firebaseDb, 'receipts', receipt.firebaseId);
            await updateDoc(receiptRef, { deleted: true, deletedAt: new Date().toISOString() });
          }
        }
        break;
    }
  };

  const forceSyncNow = async () => {
    if (isOnline) {
      await processSyncQueue();
    }
  };

  const clearSyncQueue = async () => {
    if (!db) return;
    await db.runAsync('DELETE FROM sync_queue');
  };

  const getSyncQueueStatus = async (): Promise<{ pending: number; failed: number }> => {
    if (!db) return { pending: 0, failed: 0 };
    
    const pending = await db.getFirstAsync('SELECT COUNT(*) as count FROM sync_queue WHERE attempts < 3') as { count: number };
    const failed = await db.getFirstAsync('SELECT COUNT(*) as count FROM sync_queue WHERE attempts >= 3') as { count: number };
    
    return { pending: pending.count, failed: failed.count };
  };

  const getExpensesByCategory = (category: string): Expense[] => {
    return expenses.filter(expense => expense.category === category);
  };

  const getExpensesByDateRange = (startDate: string, endDate: string): Expense[] => {
    return expenses.filter(expense => expense.date >= startDate && expense.date <= endDate);
  };

  const getCategories = (): string[] => {
    const categories = [...new Set(expenses.map(expense => expense.category).filter(Boolean))] as string[];
    return categories.sort();
  };

  const getCategoryTotals = (startDate?: string, endDate?: string): { [category: string]: number } => {
    let filteredExpenses = expenses;
    
    if (startDate && endDate) {
      filteredExpenses = getExpensesByDateRange(startDate, endDate);
    }
    
    const totals: { [category: string]: number } = {};
    
    filteredExpenses.forEach(expense => {
      if (!totals[expense.category]) {
        totals[expense.category] = 0;
      }
      totals[expense.category] += expense.amount;
    });
    
    return totals;
  };

  const clearAllLocalData = async () => {
    if (!db) return;

    try {
      await db.execAsync(`
        DELETE FROM expenses;
        DELETE FROM receipts;
        DELETE FROM sync_queue;
      `);
      
      setExpenses([]);
      setReceipts([]);
      
    } catch (error) {
      console.error('Error clearing local data:', error);
      throw error;
    }
  };

  const exportLocalData = async (): Promise<string> => {
    const data = {
      user: currentUser,
      expenses,
      receipts,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
    
    return JSON.stringify(data, null, 2);
  };

  const importLocalData = async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.expenses) {
        for (const expense of data.expenses) {
          await addExpense(expense);
        }
      }
      
      if (data.receipts) {
        for (const receipt of data.receipts) {
          await addReceipt(receipt);
        }
      }
      
    } catch (error) {
      console.error('Error importing local data:', error);
      throw error;
    }
  };

  const scanReceiptAndAddExpense = async (imageUri: string) => {
    if (!currentUser) return;
    
    try {
      // This is a placeholder for OCR functionality
      // In a real implementation, you would use an OCR service to extract data
      
      // For now, we'll create a mock receipt processing
      const mockReceiptData = {
        merchant: 'Scanned Merchant',
        amount: 0,
        category: 'Other',
        date: new Date().toISOString().slice(0, 10),
        description: 'Scanned from receipt'
      };
      
      // Add the receipt to receipts table
      await addReceipt({
        imageUri,
        merchantName: mockReceiptData.merchant,
        amount: mockReceiptData.amount,
        date: mockReceiptData.date,
        items: JSON.stringify([]),
        category: mockReceiptData.category,
        processed: false,
        ocrConfidence: 0
      });
      
      // Add the expense
      await addExpense({
        amount: mockReceiptData.amount,
        category: mockReceiptData.category,
        merchant: mockReceiptData.merchant,
        description: mockReceiptData.description,
        date: mockReceiptData.date,
        receiptUrl: imageUri,
        isRecurring: false
      });
      
    } catch (error) {
      console.error('Error scanning receipt and adding expense:', error);
      throw error;
    }
  };

  const getCategoriesWithBudgets = (): CategoryWithBudget[] => {
    return categories;
  };

  const updateCategoryBudget = async (categoryName: string, budget: number) => {
    if (!db || !currentUser) return;
    
    try {
      await db.runAsync(
        'UPDATE categories SET budget = ?, updatedAt = ? WHERE userId = ? AND name = ?',
        [budget, new Date().toISOString(), currentUser.id, categoryName]
      );
      
      // Reload categories to update state
      await loadUserCategories(currentUser.id);
      
    } catch (error) {
      console.error('Error updating category budget:', error);
      throw error;
    }
  };

  const value: MobileDatabaseContextType = {
    isOnline,
    isSyncing,
    lastSyncAt,
    currentUser,
    createLocalUser,
    updateLocalUser,
    authenticateLocalUser,
    setUserOfflineMode,
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    scanReceiptAndAddExpense,
    getExpensesByCategory,
    getExpensesByDateRange,
    receipts,
    addReceipt,
    updateReceipt,
    deleteReceipt,
    categories,
    getCategories,
    getCategoriesWithBudgets,
    updateCategoryBudget,
    getCategoryTotals,
    forceSyncNow,
    clearSyncQueue,
    getSyncQueueStatus,
    clearAllLocalData,
    exportLocalData,
    importLocalData,
  editingExpenseId,
  setEditingExpenseId,
  openAddExpensePending,
  setOpenAddExpensePending,
  };

  return (
    <MobileDatabaseContext.Provider value={value}>
      {children}
    </MobileDatabaseContext.Provider>
  );
}
