/**
 * Database Record Models
 * Defines the data structures for database records
 */

/**
 * SyncStatus Type
 * Represents the synchronization status of a record
 */
export type SyncStatus = 'synced' | 'pending' | 'error';

/**
 * Base Record Interface
 * Common properties for all database records
 */
export interface BaseRecord {
  id?: number;
  firebaseId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

/**
 * ExpenseRecord Interface
 * Represents an expense entry
 */
export interface ExpenseRecord extends BaseRecord {
  amount: number;
  category: string;
  merchant: string;
  description: string;
  date: string;
  receiptUrl?: string;
  isRecurring: boolean;
}

/**
 * ReceiptRecord Interface
 * Represents a scanned receipt
 */
export interface ReceiptRecord extends BaseRecord {
  imageUri: string;
  merchantName: string;
  amount: number;
  date: string;
  items: string; // JSON string
  category: string;
  processed: boolean;
  ocrConfidence: number;
}

/**
 * FinancialGoalRecord Interface
 * Represents a financial saving goal
 */
export interface FinancialGoalRecord extends BaseRecord {
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
  isActive: boolean;
}

/**
 * TransactionType Type
 * Represents the type of financial transaction
 */
export type TransactionType = 'income' | 'expense' | 'transfer';

/**
 * TransactionRecord Interface
 * Represents a financial transaction
 */
export interface TransactionRecord extends BaseRecord {
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string;
  fromAccount?: string;
  toAccount?: string;
}

/**
 * EducationalProgressRecord Interface
 * Represents a user's progress in educational content
 */
export interface EducationalProgressRecord {
  id?: number;
  userId: string;
  courseId: string;
  lessonId: string;
  completed: boolean;
  score: number;
  completedAt?: string;
  createdAt: string;
}

/**
 * UserAchievementRecord Interface
 * Represents a user's unlocked achievement
 */
export interface UserAchievementRecord {
  id?: number;
  userId: string;
  achievementId: string;
  unlockedAt: string;
}

/**
 * CryptoWalletRecord Interface
 * Represents a user's crypto wallet
 */
export interface CryptoWalletRecord {
  id?: number;
  userId: string;
  encryptedPrivateKey: string;
  publicKey: string;
  address: string;
  network: string;
  createdAt: string;
  updatedAt: string;
}
