// @ts-nocheck
import React from 'react';
const { useState, useCallback, useEffect, useRef, useContext, createContext } = React;
import * as SQLite from 'expo-sqlite';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAWS } from './AWSContext';
import NetInfo from '@react-native-community/netinfo';

interface Expense {
  id: string;
  localId?: number; // For SQLite sync
  amount: number;
  category: string;
  merchant: string;
  description: string;
  date: string;
  receiptUrl?: string;
  isRecurring: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

interface Receipt {
  id: string;
  localId?: number; // For SQLite sync
  imageUri: string;
  merchantName: string;
  amount: number;
  date: string;
  items: string; // JSON string of items
  category: string;
  processed: boolean;
  ocrConfidence: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

interface FinancialGoal {
  id: string;
  localId?: number;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

interface EducationProgress {
  userId: string;
  totalXP: number;
  level: number;
  completedModules: string[]; // Array of module IDs
  achievements: string[]; // Array of achievement IDs
  lastCompletedTimestamp?: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

interface DatabaseContextType {
  // Connection status
  isOnline: boolean;
  
  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getExpensesByCategory: (category: string) => Expense[];
  getExpensesByDateRange: (startDate: string, endDate: string) => Expense[];
  
  // Receipts
  receipts: Receipt[];
  addReceipt: (receipt: Omit<Receipt, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<void>;
  updateReceipt: (id: string, updates: Partial<Receipt>) => Promise<void>;
  deleteReceipt: (id: string) => Promise<void>;
  
  // Financial Goals
  financialGoals: FinancialGoal[];
  addFinancialGoal: (goal: Omit<FinancialGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<void>;
  updateFinancialGoal: (id: string, updates: Partial<FinancialGoal>) => Promise<void>;
  deleteFinancialGoal: (id: string) => Promise<void>;
  
  // Education Progress
  educationProgress: EducationProgress | null;
  completeModule: (moduleId: string, xpReward: number) => Promise<void>;

  // Categories
  getCategories: () => string[];
  getCategoryTotals: (startDate?: string, endDate?: string) => { [category: string]: number };
  
  // Database management
  syncData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  exportData: () => Promise<string>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  // AWS Context with fallback to demo mode
  const aws = useAWS();
  const { currentUser, isInitialized } = aws || {};
  const user = currentUser || { firstName: 'Demo', email: 'demo@bluebot.com' };
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([]);
  const [educationProgress, setEducationProgress] = useState<EducationProgress | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    initializeDatabase();
    
    // Monitor network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected || false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && db) {
      loadLocalData();
      setupFirebaseListeners();
    }
  }, [user, db]);

  useEffect(() => {
    // Auto-sync when coming online
    if (isOnline && user) {
      syncData();
    }
  }, [isOnline, user]);

  const initializeDatabase = async () => {
    try {
      const database = await SQLite.openDatabaseAsync('bluebotFinance.db');
      
      // Create tables
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          firebaseId TEXT UNIQUE,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          merchant TEXT NOT NULL,
          description TEXT,
          date TEXT NOT NULL,
          receiptUrl TEXT,
          isRecurring INTEGER DEFAULT 0,
          userId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          syncStatus TEXT DEFAULT 'pending'
        );
        
        CREATE TABLE IF NOT EXISTS receipts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          firebaseId TEXT UNIQUE,
          imageUri TEXT NOT NULL,
          merchantName TEXT NOT NULL,
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          items TEXT,
          category TEXT NOT NULL,
          processed INTEGER DEFAULT 0,
          ocrConfidence REAL,
          userId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          syncStatus TEXT DEFAULT 'pending'
        );
        
        CREATE TABLE IF NOT EXISTS financial_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          firebaseId TEXT UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          targetAmount REAL NOT NULL,
          currentAmount REAL DEFAULT 0,
          deadline TEXT NOT NULL,
          category TEXT NOT NULL,
          userId TEXT NOT NULL,
          isActive INTEGER DEFAULT 1,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          syncStatus TEXT DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS education_progress (
          userId TEXT PRIMARY KEY,
          totalXP INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          completedModules TEXT,
          achievements TEXT,
          lastCompletedTimestamp TEXT,
          updatedAt TEXT NOT NULL,
          syncStatus TEXT DEFAULT 'pending'
        );
        
        CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(userId);
        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
        CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
        CREATE INDEX IF NOT EXISTS idx_receipts_user ON receipts(userId);
        CREATE INDEX IF NOT EXISTS idx_goals_user ON financial_goals(userId);
      `);
      
      setDb(database);
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  };

  const loadLocalData = async () => {
    if (!db || !user) return;

    try {
      // Load expenses
      const expenseResults = await db.getAllAsync(
        'SELECT * FROM expenses WHERE userId = ? ORDER BY date DESC',
        [user.id]
      );
      const localExpenses: Expense[] = expenseResults.map((row: any) => ({
        id: row.firebaseId || `local_${row.id}`,
        localId: row.id,
        amount: row.amount,
        category: row.category,
        merchant: row.merchant,
        description: row.description,
        date: row.date,
        receiptUrl: row.receiptUrl,
        isRecurring: Boolean(row.isRecurring),
        userId: row.userId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        syncStatus: row.syncStatus as 'synced' | 'pending' | 'error',
      }));
      setExpenses(localExpenses);

      // Load receipts
      const receiptResults = await db.getAllAsync(
        'SELECT * FROM receipts WHERE userId = ? ORDER BY date DESC',
        [user.id]
      );
      const localReceipts: Receipt[] = receiptResults.map((row: any) => ({
        id: row.firebaseId || `local_${row.id}`,
        localId: row.id,
        imageUri: row.imageUri,
        merchantName: row.merchantName,
        amount: row.amount,
        date: row.date,
        items: row.items,
        category: row.category,
        processed: Boolean(row.processed),
        ocrConfidence: row.ocrConfidence,
        userId: row.userId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        syncStatus: row.syncStatus as 'synced' | 'pending' | 'error',
      }));
      setReceipts(localReceipts);

      // Load financial goals
      const goalResults = await db.getAllAsync(
        'SELECT * FROM financial_goals WHERE userId = ? ORDER BY createdAt DESC',
        [user.id]
      );
      const localGoals: FinancialGoal[] = goalResults.map((row: any) => ({
        id: row.firebaseId || `local_${row.id}`,
        localId: row.id,
        title: row.title,
        description: row.description,
        targetAmount: row.targetAmount,
        currentAmount: row.currentAmount,
        deadline: row.deadline,
        category: row.category,
        userId: row.userId,
        isActive: Boolean(row.isActive),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        syncStatus: row.syncStatus as 'synced' | 'pending' | 'error',
      }));
      setFinancialGoals(localGoals);

      // Load education progress
      const progressResult = await db.getFirstAsync(
        'SELECT * FROM education_progress WHERE userId = ?',
        [user.id]
      );

      if (progressResult) {
        const localProgress: EducationProgress = {
          userId: progressResult.userId,
          totalXP: progressResult.totalXP,
          level: progressResult.level,
          completedModules: JSON.parse(progressResult.completedModules || '[]'),
          achievements: JSON.parse(progressResult.achievements || '[]'),
          lastCompletedTimestamp: progressResult.lastCompletedTimestamp,
          updatedAt: progressResult.updatedAt,
          syncStatus: progressResult.syncStatus as 'synced' | 'pending' | 'error',
        };
        setEducationProgress(localProgress);
      } else {
        // Create initial progress if none exists
        const initialProgress: EducationProgress = {
          userId: user.id,
          totalXP: 0,
          level: 1,
          completedModules: [],
          achievements: [],
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending',
        };
        await db.runAsync(
          'INSERT INTO education_progress (userId, totalXP, level, completedModules, achievements, updatedAt, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            initialProgress.userId,
            initialProgress.totalXP,
            initialProgress.level,
            JSON.stringify(initialProgress.completedModules),
            JSON.stringify(initialProgress.achievements),
            initialProgress.updatedAt,
            initialProgress.syncStatus,
          ]
        );
        setEducationProgress(initialProgress);
      }
    } catch (error) {
      console.error('Error loading local data:', error);
    }
  };

  const setupFirebaseListeners = () => {
    if (!user || !isOnline) return;

    // Listen for expense changes
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const firebaseExpenses: Expense[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        firebaseExpenses.push({
          id: doc.id,
          amount: data.amount,
          category: data.category,
          merchant: data.merchant,
          description: data.description,
          date: data.date,
          receiptUrl: data.receiptUrl,
          isRecurring: data.isRecurring,
          userId: data.userId,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          syncStatus: 'synced',
        });
      });
      
      // Merge with local data
      setExpenses(prev => {
        const merged = [...firebaseExpenses];
        prev.forEach(local => {
          if (local.syncStatus === 'pending' && !merged.find(fb => fb.id === local.id)) {
            merged.push(local);
          }
        });
        return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
    });

    return () => {
      unsubscribeExpenses();
    };
  };

  const completeModule = async (moduleId: string, xpReward: number) => {
    if (!user || !db || !educationProgress) return;

    const now = new Date().toISOString();
    const newTotalXP = (educationProgress.totalXP || 0) + xpReward;
    const newLevel = Math.floor(newTotalXP / 500) + 1;
    const updatedCompletedModules = [...new Set([...educationProgress.completedModules, moduleId])];

    const updatedProgress: EducationProgress = {
      ...educationProgress,
      totalXP: newTotalXP,
      level: newLevel,
      completedModules: updatedCompletedModules,
      lastCompletedTimestamp: now,
      updatedAt: now,
      syncStatus: 'pending',
    };

    setEducationProgress(updatedProgress);

    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO education_progress 
         (userId, totalXP, level, completedModules, achievements, lastCompletedTimestamp, updatedAt, syncStatus) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          updatedProgress.userId,
          updatedProgress.totalXP,
          updatedProgress.level,
          JSON.stringify(updatedProgress.completedModules),
          JSON.stringify(updatedProgress.achievements),
          updatedProgress.lastCompletedTimestamp,
          updatedProgress.updatedAt,
          updatedProgress.syncStatus,
        ]
      );

      if (isOnline) {
        // Sync to Firebase
      }
    } catch (error) {
      console.error('Error completing module:', error);
    }
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
    if (!user || !db) return;

    const now = new Date().toISOString();
    const expense: Expense = {
      id: `temp_${Date.now()}`,
      ...expenseData,
      userId: user.id,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    };

    try {
      // Save to SQLite first
      const result = await db.runAsync(
        `INSERT INTO expenses (amount, category, merchant, description, date, receiptUrl, isRecurring, userId, createdAt, updatedAt, syncStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          expense.amount,
          expense.category,
          expense.merchant,
          expense.description,
          expense.date,
          expense.receiptUrl,
          expense.isRecurring ? 1 : 0,
          expense.userId,
          expense.createdAt,
          expense.updatedAt,
          expense.syncStatus,
        ]
      );

      expense.localId = result.lastInsertRowId;
      setExpenses(prev => [expense, ...prev]);

      // Try to sync to Firebase
      if (isOnline) {
        try {
          const docRef = await addDoc(collection(db, 'expenses'), {
            amount: expense.amount,
            category: expense.category,
            merchant: expense.merchant,
            description: expense.description,
            date: expense.date,
            receiptUrl: expense.receiptUrl,
            isRecurring: expense.isRecurring,
            userId: expense.userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // Update local record with Firebase ID
          await db.runAsync(
            'UPDATE expenses SET firebaseId = ?, syncStatus = ? WHERE id = ?',
            [docRef.id, 'synced', expense.localId]
          );

          expense.id = docRef.id;
          expense.syncStatus = 'synced';
          setExpenses(prev => prev.map(e => e.localId === expense.localId ? expense : e));
        } catch (error) {
          console.error('Error syncing expense to Firebase:', error);
          // Update sync status to error
          await db.runAsync(
            'UPDATE expenses SET syncStatus = ? WHERE id = ?',
            ['error', expense.localId]
          );
          expense.syncStatus = 'error';
          setExpenses(prev => prev.map(e => e.localId === expense.localId ? expense : e));
        }
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    if (!user || !db) return;

    const now = new Date().toISOString();
    updates.updatedAt = now;

    try {
      const expense = expenses.find(e => e.id === id);
      if (!expense) return;

      // Update SQLite
      if (expense.localId) {
        const updateFields = Object.keys(updates).filter(key => key !== 'id');
        const updateValues = updateFields.map(key => updates[key as keyof Expense]);
        const setClause = updateFields.map(key => `${key} = ?`).join(', ');
        
        await db.runAsync(
          `UPDATE expenses SET ${setClause}, syncStatus = ? WHERE id = ?`,
          [...updateValues, 'pending', expense.localId]
        );
      }

      // Update local state
      setExpenses(prev => prev.map(e => 
        e.id === id ? { ...e, ...updates, syncStatus: 'pending' } : e
      ));

      // Try to sync to Firebase
      if (isOnline && !id.startsWith('temp_') && !id.startsWith('local_')) {
        try {
          await updateDoc(doc(db, 'expenses', id), {
            ...updates,
            updatedAt: serverTimestamp(),
          });

          // Update sync status
          if (expense.localId) {
            await db.runAsync(
              'UPDATE expenses SET syncStatus = ? WHERE id = ?',
              ['synced', expense.localId]
            );
          }

          setExpenses(prev => prev.map(e => 
            e.id === id ? { ...e, syncStatus: 'synced' } : e
          ));
        } catch (error) {
          console.error('Error syncing expense update to Firebase:', error);
        }
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  };

  const deleteExpense = async (id: string) => {
    if (!user || !db) return;

    try {
      const expense = expenses.find(e => e.id === id);
      if (!expense) return;

      // Delete from SQLite
      if (expense.localId) {
        await db.runAsync('DELETE FROM expenses WHERE id = ?', [expense.localId]);
      }

      // Update local state
      setExpenses(prev => prev.filter(e => e.id !== id));

      // Try to delete from Firebase
      if (isOnline && !id.startsWith('temp_') && !id.startsWith('local_')) {
        try {
          await deleteDoc(doc(db, 'expenses', id));
        } catch (error) {
          console.error('Error deleting expense from Firebase:', error);
        }
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  };

  const addReceipt = async (receiptData: Omit<Receipt, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
    if (!user || !db) return;

    const now = new Date().toISOString();
    const receipt: Receipt = {
      id: `temp_${Date.now()}`,
      ...receiptData,
      userId: user.id,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    };

    try {
      // Save to SQLite first
      const result = await db.runAsync(
        `INSERT INTO receipts (imageUri, merchantName, amount, date, items, category, processed, ocrConfidence, userId, createdAt, updatedAt, syncStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receipt.imageUri,
          receipt.merchantName,
          receipt.amount,
          receipt.date,
          receipt.items,
          receipt.category,
          receipt.processed ? 1 : 0,
          receipt.ocrConfidence,
          receipt.userId,
          receipt.createdAt,
          receipt.updatedAt,
          receipt.syncStatus,
        ]
      );

      receipt.localId = result.lastInsertRowId;
      setReceipts(prev => [receipt, ...prev]);

      // Try to sync to Firebase
      if (isOnline) {
        try {
          const docRef = await addDoc(collection(db, 'receipts'), {
            imageUri: receipt.imageUri,
            merchantName: receipt.merchantName,
            amount: receipt.amount,
            date: receipt.date,
            items: receipt.items,
            category: receipt.category,
            processed: receipt.processed,
            ocrConfidence: receipt.ocrConfidence,
            userId: receipt.userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // Update local record with Firebase ID
          await db.runAsync(
            'UPDATE receipts SET firebaseId = ?, syncStatus = ? WHERE id = ?',
            [docRef.id, 'synced', receipt.localId]
          );

          receipt.id = docRef.id;
          receipt.syncStatus = 'synced';
          setReceipts(prev => prev.map(r => r.localId === receipt.localId ? receipt : r));
        } catch (error) {
          console.error('Error syncing receipt to Firebase:', error);
        }
      }
    } catch (error) {
      console.error('Error adding receipt:', error);
      throw error;
    }
  };

  const addFinancialGoal = async (goalData: Omit<FinancialGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
    if (!user || !db) return;

    const now = new Date().toISOString();
    const goal: FinancialGoal = {
      id: `temp_${Date.now()}`,
      ...goalData,
      userId: user.id,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    };

    try {
      const result = await db.runAsync(
        `INSERT INTO financial_goals (title, description, targetAmount, currentAmount, deadline, category, userId, isActive, createdAt, updatedAt, syncStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          goal.title,
          goal.description,
          goal.targetAmount,
          goal.currentAmount,
          goal.deadline,
          goal.category,
          goal.userId,
          goal.isActive ? 1 : 0,
          goal.createdAt,
          goal.updatedAt,
          goal.syncStatus,
        ]
      );

      goal.localId = result.lastInsertRowId;
      setFinancialGoals(prev => [goal, ...prev]);

      if (isOnline) {
        try {
          const docRef = await addDoc(collection(db, 'financial_goals'), {
            title: goal.title,
            description: goal.description,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount,
            deadline: goal.deadline,
            category: goal.category,
            userId: goal.userId,
            isActive: goal.isActive,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          await db.runAsync(
            'UPDATE financial_goals SET firebaseId = ?, syncStatus = ? WHERE id = ?',
            [docRef.id, 'synced', goal.localId]
          );

          goal.id = docRef.id;
          goal.syncStatus = 'synced';
          setFinancialGoals(prev => prev.map(g => g.localId === goal.localId ? goal : g));
        } catch (error) {
          console.error('Error syncing goal to Firebase:', error);
        }
      }
    } catch (error) {
      console.error('Error adding financial goal:', error);
      throw error;
    }
  };

  const syncData = async () => {
    if (!isOnline || !user || !db) return;

    try {
      // Sync pending expenses
      const pendingExpenses = await db.getAllAsync(
        'SELECT * FROM expenses WHERE userId = ? AND syncStatus = ?',
        [user.id, 'pending']
      );

      for (const row of pendingExpenses) {
        try {
          if (row.firebaseId) {
            // Update existing
            await updateDoc(doc(db, 'expenses', row.firebaseId), {
              amount: row.amount,
              category: row.category,
              merchant: row.merchant,
              description: row.description,
              date: row.date,
              receiptUrl: row.receiptUrl,
              isRecurring: Boolean(row.isRecurring),
              updatedAt: serverTimestamp(),
            });
          } else {
            // Create new
            const docRef = await addDoc(collection(db, 'expenses'), {
              amount: row.amount,
              category: row.category,
              merchant: row.merchant,
              description: row.description,
              date: row.date,
              receiptUrl: row.receiptUrl,
              isRecurring: Boolean(row.isRecurring),
              userId: row.userId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            await db.runAsync(
              'UPDATE expenses SET firebaseId = ? WHERE id = ?',
              [docRef.id, row.id]
            );
          }

          await db.runAsync(
            'UPDATE expenses SET syncStatus = ? WHERE id = ?',
            ['synced', row.id]
          );
        } catch (error) {
          console.error('Error syncing expense:', error);
          await db.runAsync(
            'UPDATE expenses SET syncStatus = ? WHERE id = ?',
            ['error', row.id]
          );
        }
      }

      // Reload data after sync
      await loadLocalData();
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  };

  const getExpensesByCategory = (category: string): Expense[] => {
    return expenses.filter(expense => expense.category === category);
  };

  const getExpensesByDateRange = (startDate: string, endDate: string): Expense[] => {
    return expenses.filter(expense => expense.date >= startDate && expense.date <= endDate);
  };

  const getCategories = (): string[] => {
    const categories = [...new Set(expenses.map((expense: any) => expense.category as string).filter(Boolean))] as string[];
    return categories.sort();
  };

  const getCategoryTotals = (startDate?: string, endDate?: string): { [category: string]: number } => {
    let filteredExpenses = expenses;
    
    if (startDate && endDate) {
      filteredExpenses = getExpensesByDateRange(startDate, endDate);
    }

    const totals: { [category: string]: number } = {};
    filteredExpenses.forEach(expense => {
      totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
    });

    return totals;
  };

  const updateReceipt = async (id: string, updates: Partial<Receipt>) => {
    // Implementation similar to updateExpense
  };

  const deleteReceipt = async (id: string) => {
    // Implementation similar to deleteExpense
  };

  const updateFinancialGoal = async (id: string, updates: Partial<FinancialGoal>) => {
    // Implementation similar to updateExpense
  };

  const deleteFinancialGoal = async (id: string) => {
    // Implementation similar to deleteExpense
  };

  const clearAllData = async () => {
    if (!db) return;

    try {
      await db.execAsync(`
        DELETE FROM expenses;
        DELETE FROM receipts;
        DELETE FROM financial_goals;
      `);

      setExpenses([]);
      setReceipts([]);
      setFinancialGoals([]);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  };

  const exportData = async (): Promise<string> => {
    const data = {
      expenses,
      receipts,
      financialGoals,
      exportedAt: new Date().toISOString(),
      userId: user?.id,
    };

    return JSON.stringify(data, null, 2);
  };

  const value = {
    isOnline,
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpensesByCategory,
    getExpensesByDateRange,
    receipts,
    addReceipt,
    updateReceipt,
    deleteReceipt,
    financialGoals,
    addFinancialGoal,
    updateFinancialGoal,
    deleteFinancialGoal,
    educationProgress,
    completeModule,
    getCategories,
    getCategoryTotals,
    syncData,
    clearAllData,
    exportData,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}


