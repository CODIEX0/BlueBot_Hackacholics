import * as SQLite from 'expo-sqlite';
import { useAuth } from '../contexts/AuthContext';

/**
 * SQLite Database Manager for BlueBot
 * Handles local data storage with offline-first approach
 */

export interface ExpenseRecord {
  id?: number;
  firebaseId?: string;
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

export interface ReceiptRecord {
  id?: number;
  firebaseId?: string;
  imageUri: string;
  merchantName: string;
  amount: number;
  date: string;
  items: string; // JSON string
  category: string;
  processed: boolean;
  ocrConfidence: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

export interface FinancialGoalRecord {
  id?: number;
  firebaseId?: string;
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

export interface TransactionRecord {
  id?: number;
  firebaseId?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: string;
  date: string;
  fromAccount?: string;
  toAccount?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

export class SQLiteManager {
  private db: SQLite.SQLiteDatabase | null = null;
  private static instance: SQLiteManager;

  static getInstance(): SQLiteManager {
    if (!SQLiteManager.instance) {
      SQLiteManager.instance = new SQLiteManager();
    }
    return SQLiteManager.instance;
  }

  async initializeDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('bluebotFinance.db');
      
      // Enable WAL mode for better performance
      await this.db.execAsync('PRAGMA journal_mode = WAL;');
      
      // Create tables
      await this.createTables();
      
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Error initializing SQLite database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createTableSQL = `
      -- Expenses table
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
      
      -- Receipts table
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
        ocrConfidence REAL DEFAULT 0,
        userId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending'
      );
      
      -- Financial Goals table
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
      
      -- Transactions table
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebaseId TEXT UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        fromAccount TEXT,
        toAccount TEXT,
        userId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending'
      );
      
      -- Educational Progress table
      CREATE TABLE IF NOT EXISTS educational_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        courseId TEXT NOT NULL,
        lessonId TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        completedAt TEXT,
        createdAt TEXT NOT NULL,
        UNIQUE(userId, courseId, lessonId)
      );
      
      -- User Achievements table
      CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        achievementId TEXT NOT NULL,
        unlockedAt TEXT NOT NULL,
        UNIQUE(userId, achievementId)
      );
      
      -- Crypto Wallets table (encrypted data)
      CREATE TABLE IF NOT EXISTS crypto_wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL UNIQUE,
        encryptedPrivateKey TEXT NOT NULL,
        publicKey TEXT NOT NULL,
        address TEXT NOT NULL,
        network TEXT NOT NULL DEFAULT 'ethereum',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(userId, date DESC);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
      CREATE INDEX IF NOT EXISTS idx_expenses_sync ON expenses(syncStatus);
      
      CREATE INDEX IF NOT EXISTS idx_receipts_user_date ON receipts(userId, date DESC);
      CREATE INDEX IF NOT EXISTS idx_receipts_sync ON receipts(syncStatus);
      
      CREATE INDEX IF NOT EXISTS idx_goals_user ON financial_goals(userId);
      CREATE INDEX IF NOT EXISTS idx_goals_active ON financial_goals(isActive);
      
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(userId, date DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_sync ON transactions(syncStatus);
      
      CREATE INDEX IF NOT EXISTS idx_educational_progress_user ON educational_progress(userId);
      CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(userId);
      CREATE INDEX IF NOT EXISTS idx_crypto_wallets_user ON crypto_wallets(userId);
    `;

    await this.db.execAsync(createTableSQL);
  }

  // Expense operations
  async addExpense(expense: Omit<ExpenseRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const result = await this.db.runAsync(
      `INSERT INTO expenses (firebaseId, amount, category, merchant, description, date, receiptUrl, isRecurring, userId, createdAt, updatedAt, syncStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.firebaseId || null,
        expense.amount,
        expense.category,
        expense.merchant,
        expense.description,
        expense.date,
        expense.receiptUrl || null,
        expense.isRecurring ? 1 : 0,
        expense.userId,
        now,
        now,
        expense.syncStatus
      ]
    );

    return result.lastInsertRowId;
  }

  async getExpenses(userId: string, limit?: number): Promise<ExpenseRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = limit 
      ? `SELECT * FROM expenses WHERE userId = ? ORDER BY date DESC, createdAt DESC LIMIT ?`
      : `SELECT * FROM expenses WHERE userId = ? ORDER BY date DESC, createdAt DESC`;
    
    const params = limit ? [userId, limit] : [userId];
    const results = await this.db.getAllAsync(query, params);

    return results.map(this.mapExpenseResult);
  }

  async updateExpense(id: number, updates: Partial<ExpenseRecord>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const updateFields = Object.keys(updates).filter(key => key !== 'id');
    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => updates[field as keyof ExpenseRecord]);

    await this.db.runAsync(
      `UPDATE expenses SET ${setClause}, updatedAt = ? WHERE id = ?`,
      [...values, new Date().toISOString(), id]
    );
  }

  async deleteExpense(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
  }

  // Receipt operations
  async addReceipt(receipt: Omit<ReceiptRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const result = await this.db.runAsync(
      `INSERT INTO receipts (firebaseId, imageUri, merchantName, amount, date, items, category, processed, ocrConfidence, userId, createdAt, updatedAt, syncStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receipt.firebaseId || null,
        receipt.imageUri,
        receipt.merchantName,
        receipt.amount,
        receipt.date,
        receipt.items,
        receipt.category,
        receipt.processed ? 1 : 0,
        receipt.ocrConfidence,
        receipt.userId,
        now,
        now,
        receipt.syncStatus
      ]
    );

    return result.lastInsertRowId;
  }

  async getReceipts(userId: string, limit?: number): Promise<ReceiptRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = limit 
      ? `SELECT * FROM receipts WHERE userId = ? ORDER BY date DESC, createdAt DESC LIMIT ?`
      : `SELECT * FROM receipts WHERE userId = ? ORDER BY date DESC, createdAt DESC`;
    
    const params = limit ? [userId, limit] : [userId];
    const results = await this.db.getAllAsync(query, params);

    return results.map(this.mapReceiptResult);
  }

  // Financial Goal operations
  async addFinancialGoal(goal: Omit<FinancialGoalRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const result = await this.db.runAsync(
      `INSERT INTO financial_goals (firebaseId, title, description, targetAmount, currentAmount, deadline, category, userId, isActive, createdAt, updatedAt, syncStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        goal.firebaseId || null,
        goal.title,
        goal.description,
        goal.targetAmount,
        goal.currentAmount,
        goal.deadline,
        goal.category,
        goal.userId,
        goal.isActive ? 1 : 0,
        now,
        now,
        goal.syncStatus
      ]
    );

    return result.lastInsertRowId;
  }

  async getFinancialGoals(userId: string): Promise<FinancialGoalRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync(
      'SELECT * FROM financial_goals WHERE userId = ? ORDER BY createdAt DESC',
      [userId]
    );

    return results.map(this.mapFinancialGoalResult);
  }

  // Transaction operations
  async addTransaction(transaction: Omit<TransactionRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const result = await this.db.runAsync(
      `INSERT INTO transactions (firebaseId, type, amount, description, category, date, fromAccount, toAccount, userId, createdAt, updatedAt, syncStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.firebaseId || null,
        transaction.type,
        transaction.amount,
        transaction.description,
        transaction.category,
        transaction.date,
        transaction.fromAccount || null,
        transaction.toAccount || null,
        transaction.userId,
        now,
        now,
        transaction.syncStatus
      ]
    );

    return result.lastInsertRowId;
  }

  async getTransactions(userId: string, limit?: number): Promise<TransactionRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = limit 
      ? `SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC, createdAt DESC LIMIT ?`
      : `SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC, createdAt DESC`;
    
    const params = limit ? [userId, limit] : [userId];
    const results = await this.db.getAllAsync(query, params);

    return results.map(this.mapTransactionResult);
  }

  // Utility methods
  async getPendingSyncItems(userId: string): Promise<{
    expenses: ExpenseRecord[];
    receipts: ReceiptRecord[];
    goals: FinancialGoalRecord[];
    transactions: TransactionRecord[];
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const [expenses, receipts, goals, transactions] = await Promise.all([
      this.db.getAllAsync('SELECT * FROM expenses WHERE userId = ? AND syncStatus = ?', [userId, 'pending']),
      this.db.getAllAsync('SELECT * FROM receipts WHERE userId = ? AND syncStatus = ?', [userId, 'pending']),
      this.db.getAllAsync('SELECT * FROM financial_goals WHERE userId = ? AND syncStatus = ?', [userId, 'pending']),
      this.db.getAllAsync('SELECT * FROM transactions WHERE userId = ? AND syncStatus = ?', [userId, 'pending'])
    ]);

    return {
      expenses: expenses.map(this.mapExpenseResult),
      receipts: receipts.map(this.mapReceiptResult),
      goals: goals.map(this.mapFinancialGoalResult),
      transactions: transactions.map(this.mapTransactionResult)
    };
  }

  async clearUserData(userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      DELETE FROM expenses WHERE userId = ?;
      DELETE FROM receipts WHERE userId = ?;
      DELETE FROM financial_goals WHERE userId = ?;
      DELETE FROM transactions WHERE userId = ?;
      DELETE FROM educational_progress WHERE userId = ?;
      DELETE FROM user_achievements WHERE userId = ?;
      DELETE FROM crypto_wallets WHERE userId = ?;
    `, [userId, userId, userId, userId, userId, userId, userId]);
  }

  // Result mapping methods
  private mapExpenseResult(row: any): ExpenseRecord {
    return {
      id: row.id,
      firebaseId: row.firebaseId,
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
      syncStatus: row.syncStatus as 'synced' | 'pending' | 'error'
    };
  }

  private mapReceiptResult(row: any): ReceiptRecord {
    return {
      id: row.id,
      firebaseId: row.firebaseId,
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
      syncStatus: row.syncStatus as 'synced' | 'pending' | 'error'
    };
  }

  private mapFinancialGoalResult(row: any): FinancialGoalRecord {
    return {
      id: row.id,
      firebaseId: row.firebaseId,
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
      syncStatus: row.syncStatus as 'synced' | 'pending' | 'error'
    };
  }

  private mapTransactionResult(row: any): TransactionRecord {
    return {
      id: row.id,
      firebaseId: row.firebaseId,
      type: row.type as 'income' | 'expense' | 'transfer',
      amount: row.amount,
      description: row.description,
      category: row.category,
      date: row.date,
      fromAccount: row.fromAccount,
      toAccount: row.toAccount,
      userId: row.userId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      syncStatus: row.syncStatus as 'synced' | 'pending' | 'error'
    };
  }
}

export default SQLiteManager.getInstance();
