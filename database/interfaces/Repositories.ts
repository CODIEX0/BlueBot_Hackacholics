import { IRepository } from './IRepository';
import { ExpenseRecord, ReceiptRecord, FinancialGoalRecord, TransactionRecord } from '../models/Records';

/**
 * IExpenseRepository Interface
 * Repository interface for expense records
 */
export interface IExpenseRepository extends IRepository<ExpenseRecord> {
  /**
   * Get expenses for a specific user
   * @param userId User ID
   * @param limit Maximum number of records to return
   * @returns Array of expense records
   */
  getByUserId(userId: string, limit?: number): Promise<ExpenseRecord[]>;
  
  /**
   * Get expenses by category
   * @param userId User ID
   * @param category Expense category
   * @param limit Maximum number of records to return
   * @returns Array of expense records
   */
  getByCategory(userId: string, category: string, limit?: number): Promise<ExpenseRecord[]>;
  
  /**
   * Get expenses within a date range
   * @param userId User ID
   * @param startDate Start date (ISO string)
   * @param endDate End date (ISO string)
   * @returns Array of expense records
   */
  getByDateRange(userId: string, startDate: string, endDate: string): Promise<ExpenseRecord[]>;
  
  /**
   * Get pending expenses for sync
   * @param userId User ID
   * @returns Array of expense records pending synchronization
   */
  getPendingSync(userId: string): Promise<ExpenseRecord[]>;
  
  /**
   * Update sync status for multiple expenses
   * @param ids Array of expense IDs
   * @param status New sync status
   * @returns Number of records updated
   */
  updateSyncStatus(ids: number[], status: 'synced' | 'pending' | 'error'): Promise<number>;
}

/**
 * IReceiptRepository Interface
 * Repository interface for receipt records
 */
export interface IReceiptRepository extends IRepository<ReceiptRecord> {
  /**
   * Get receipts for a specific user
   * @param userId User ID
   * @param limit Maximum number of records to return
   * @returns Array of receipt records
   */
  getByUserId(userId: string, limit?: number): Promise<ReceiptRecord[]>;
  
  /**
   * Get receipts by merchant name
   * @param userId User ID
   * @param merchantName Merchant name
   * @returns Array of receipt records
   */
  getByMerchant(userId: string, merchantName: string): Promise<ReceiptRecord[]>;
  
  /**
   * Get receipts within a date range
   * @param userId User ID
   * @param startDate Start date (ISO string)
   * @param endDate End date (ISO string)
   * @returns Array of receipt records
   */
  getByDateRange(userId: string, startDate: string, endDate: string): Promise<ReceiptRecord[]>;
  
  /**
   * Get pending receipts for sync
   * @param userId User ID
   * @returns Array of receipt records pending synchronization
   */
  getPendingSync(userId: string): Promise<ReceiptRecord[]>;
}

/**
 * IFinancialGoalRepository Interface
 * Repository interface for financial goal records
 */
export interface IFinancialGoalRepository extends IRepository<FinancialGoalRecord> {
  /**
   * Get financial goals for a specific user
   * @param userId User ID
   * @param activeOnly Whether to only return active goals
   * @returns Array of financial goal records
   */
  getByUserId(userId: string, activeOnly?: boolean): Promise<FinancialGoalRecord[]>;
  
  /**
   * Get goals by category
   * @param userId User ID
   * @param category Goal category
   * @returns Array of financial goal records
   */
  getByCategory(userId: string, category: string): Promise<FinancialGoalRecord[]>;
  
  /**
   * Update goal progress
   * @param id Goal ID
   * @param currentAmount New current amount
   * @returns Updated goal record
   */
  updateProgress(id: number, currentAmount: number): Promise<FinancialGoalRecord>;
  
  /**
   * Get pending goals for sync
   * @param userId User ID
   * @returns Array of financial goal records pending synchronization
   */
  getPendingSync(userId: string): Promise<FinancialGoalRecord[]>;
}

/**
 * ITransactionRepository Interface
 * Repository interface for transaction records
 */
export interface ITransactionRepository extends IRepository<TransactionRecord> {
  /**
   * Get transactions for a specific user
   * @param userId User ID
   * @param limit Maximum number of records to return
   * @returns Array of transaction records
   */
  getByUserId(userId: string, limit?: number): Promise<TransactionRecord[]>;
  
  /**
   * Get transactions by type
   * @param userId User ID
   * @param type Transaction type
   * @param limit Maximum number of records to return
   * @returns Array of transaction records
   */
  getByType(userId: string, type: 'income' | 'expense' | 'transfer', limit?: number): Promise<TransactionRecord[]>;
  
  /**
   * Get transactions within a date range
   * @param userId User ID
   * @param startDate Start date (ISO string)
   * @param endDate End date (ISO string)
   * @returns Array of transaction records
   */
  getByDateRange(userId: string, startDate: string, endDate: string): Promise<TransactionRecord[]>;
  
  /**
   * Get pending transactions for sync
   * @param userId User ID
   * @returns Array of transaction records pending synchronization
   */
  getPendingSync(userId: string): Promise<TransactionRecord[]>;
}
