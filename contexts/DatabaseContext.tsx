import React from 'react';
const { useState, useCallback, useEffect, useRef, useContext, createContext } = React;
import * as SQLite from 'expo-sqlite';

interface Expense {
  id: number;
  amount: number;
  category: string;
  merchant: string;
  description: string;
  date: string;
  receiptUrl?: string;
  isRecurring: boolean;
  createdAt: string;
}

interface Receipt {
  id: number;
  imageUri: string;
  merchantName: string;
  amount: number;
  date: string;
  items: string; // JSON string of items
  category: string;
  processed: boolean;
  ocrConfidence: number;
  createdAt: string;
}

interface DatabaseContextType {
  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense: (id: number, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
  getExpensesByCategory: (category: string) => Expense[];
  getExpensesByDateRange: (startDate: string, endDate: string) => Expense[];
  
  // Receipts
  receipts: Receipt[];
  addReceipt: (receipt: Omit<Receipt, 'id' | 'createdAt'>) => Promise<void>;
  updateReceipt: (id: number, updates: Partial<Receipt>) => Promise<void>;
  deleteReceipt: (id: number) => Promise<void>;
  
  // Categories
  getCategories: () => string[];
  getCategoryTotals: (startDate?: string, endDate?: string) => { [category: string]: number };
  
  // Database management
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
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      const database = await SQLite.openDatabaseAsync('bluebot.db');
      setDb(database);
      
      // Create tables
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          merchant TEXT NOT NULL,
          description TEXT,
          date TEXT NOT NULL,
          receiptUrl TEXT,
          isRecurring INTEGER DEFAULT 0,
          createdAt TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS receipts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          imageUri TEXT NOT NULL,
          merchantName TEXT NOT NULL,
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          items TEXT,
          category TEXT NOT NULL,
          processed INTEGER DEFAULT 0,
          ocrConfidence REAL DEFAULT 0,
          createdAt TEXT NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
        CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
        CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
      `);
      
      // Load initial data
      await loadExpenses(database);
      await loadReceipts(database);
      
      // Add sample data if empty
      await addSampleDataIfEmpty(database);
      
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  };

  const addSampleDataIfEmpty = async (database: SQLite.SQLiteDatabase) => {
    try {
      const expenseCount = await database.getFirstAsync('SELECT COUNT(*) as count FROM expenses');
      
      if ((expenseCount as any)?.count === 0) {
        const sampleExpenses = [
          {
            amount: 234.50,
            category: 'Groceries',
            merchant: 'Checkers',
            description: 'Weekly grocery shopping',
            date: '2025-01-20',
            isRecurring: 0,
            createdAt: new Date().toISOString(),
          },
          {
            amount: 87.50,
            category: 'Transport',
            merchant: 'Uber',
            description: 'Ride to work',
            date: '2025-01-20',
            isRecurring: 0,
            createdAt: new Date().toISOString(),
          },
          {
            amount: 125.00,
            category: 'Entertainment',
            merchant: 'Netflix',
            description: 'Monthly subscription',
            date: '2025-01-19',
            isRecurring: 1,
            createdAt: new Date().toISOString(),
          },
          {
            amount: 45.80,
            category: 'Groceries',
            merchant: 'Woolworths',
            description: 'Lunch items',
            date: '2025-01-19',
            isRecurring: 0,
            createdAt: new Date().toISOString(),
          },
          {
            amount: 320.00,
            category: 'Utilities',
            merchant: 'Eskom',
            description: 'Electricity bill',
            date: '2025-01-18',
            isRecurring: 1,
            createdAt: new Date().toISOString(),
          },
        ];

        for (const expense of sampleExpenses) {
          await database.runAsync(
            'INSERT INTO expenses (amount, category, merchant, description, date, isRecurring, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [expense.amount, expense.category, expense.merchant, expense.description, expense.date, expense.isRecurring, expense.createdAt]
          );
        }
        
        await loadExpenses(database);
      }
    } catch (error) {
      console.error('Error adding sample data:', error);
    }
  };

  const loadExpenses = async (database: SQLite.SQLiteDatabase) => {
    try {
      const result = await database.getAllAsync('SELECT * FROM expenses ORDER BY date DESC, createdAt DESC');
      setExpenses(result as Expense[]);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  const loadReceipts = async (database: SQLite.SQLiteDatabase) => {
    try {
      const result = await database.getAllAsync('SELECT * FROM receipts ORDER BY date DESC, createdAt DESC');
      setReceipts(result as Receipt[]);
    } catch (error) {
      console.error('Error loading receipts:', error);
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!db) return;

    try {
      const createdAt = new Date().toISOString();
      await db.runAsync(
        'INSERT INTO expenses (amount, category, merchant, description, date, receiptUrl, isRecurring, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [expense.amount, expense.category, expense.merchant, expense.description || '', expense.date, expense.receiptUrl || null, expense.isRecurring ? 1 : 0, createdAt]
      );
      
      await loadExpenses(db);
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };

  const updateExpense = async (id: number, updates: Partial<Expense>) => {
    if (!db) return;

    try {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      
      await db.runAsync(
        `UPDATE expenses SET ${setClause} WHERE id = ?`,
        [...values, id]
      );
      
      await loadExpenses(db);
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  };

  const deleteExpense = async (id: number) => {
    if (!db) return;

    try {
      await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
      await loadExpenses(db);
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  };

  const addReceipt = async (receipt: Omit<Receipt, 'id' | 'createdAt'>) => {
    if (!db) return;

    try {
      const createdAt = new Date().toISOString();
      await db.runAsync(
        'INSERT INTO receipts (imageUri, merchantName, amount, date, items, category, processed, ocrConfidence, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [receipt.imageUri, receipt.merchantName, receipt.amount, receipt.date, receipt.items, receipt.category, receipt.processed ? 1 : 0, receipt.ocrConfidence, createdAt]
      );
      
      await loadReceipts(db);
    } catch (error) {
      console.error('Error adding receipt:', error);
      throw error;
    }
  };

  const updateReceipt = async (id: number, updates: Partial<Receipt>) => {
    if (!db) return;

    try {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      
      await db.runAsync(
        `UPDATE receipts SET ${setClause} WHERE id = ?`,
        [...values, id]
      );
      
      await loadReceipts(db);
    } catch (error) {
      console.error('Error updating receipt:', error);
      throw error;
    }
  };

  const deleteReceipt = async (id: number) => {
    if (!db) return;

    try {
      await db.runAsync('DELETE FROM receipts WHERE id = ?', [id]);
      await loadReceipts(db);
    } catch (error) {
      console.error('Error deleting receipt:', error);
      throw error;
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
      if (!totals[expense.category]) {
        totals[expense.category] = 0;
      }
      totals[expense.category] += expense.amount;
    });
    
    return totals;
  };

  const clearAllData = async () => {
    if (!db) return;

    try {
      await db.execAsync(`
        DELETE FROM expenses;
        DELETE FROM receipts;
      `);
      
      setExpenses([]);
      setReceipts([]);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  };

  const exportData = async (): Promise<string> => {
    const data = {
      expenses,
      receipts,
      exportDate: new Date().toISOString(),
    };
    
    return JSON.stringify(data, null, 2);
  };

  const value: DatabaseContextType = {
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
    getCategories,
    getCategoryTotals,
    clearAllData,
    exportData,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}
