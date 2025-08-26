import { IDatabaseManager } from '../interfaces/IDatabaseManager';
import { IExpenseRepository } from '../interfaces/Repositories';
import { ExpenseRecord } from '../models/Records';
import { ILogger } from '../interfaces/ILogger';
import { QueryError } from '../errors/DatabaseErrors';

/**
 * ExpenseRepository Class
 * Implements the IExpenseRepository interface for expense-related database operations
 */
export class ExpenseRepository implements IExpenseRepository {
  private readonly dbManager: IDatabaseManager;
  private readonly logger: ILogger;
  
  /**
   * ExpenseRepository constructor
   * @param dbManager Database manager instance
   * @param logger Logger instance
   */
  constructor(dbManager: IDatabaseManager, logger: ILogger) {
    this.dbManager = dbManager;
    this.logger = logger;
  }
  
  /**
   * Create a new expense record
   * @param expense Expense data to create
   * @returns Created expense ID
   */
  async create(expense: Omit<ExpenseRecord, 'id'>): Promise<number> {
    this.logger.debug('Creating expense record', { expense });
    
    const now = new Date().toISOString();
    const result = await this.dbManager.execute<{ lastInsertRowId: number }>(
      `INSERT INTO expenses (
        firebaseId, amount, category, merchant, description, date, 
        receiptUrl, isRecurring, userId, createdAt, updatedAt, syncStatus
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        expense.createdAt || now,
        expense.updatedAt || now,
        expense.syncStatus
      ]
    );
    
    this.logger.info(`Expense created with ID: ${result.lastInsertRowId}`);
    return result.lastInsertRowId;
  }
  
  /**
   * Get an expense record by ID
   * @param id Expense ID
   * @returns Expense record or null if not found
   */
  async getById(id: number): Promise<ExpenseRecord | null> {
    this.logger.debug(`Getting expense by ID: ${id}`);
    
    const results = await this.dbManager.execute<ExpenseRecord[]>(
      'SELECT * FROM expenses WHERE id = ?',
      [id]
    );
    
    if (results.length === 0) {
      this.logger.debug(`No expense found with ID: ${id}`);
      return null;
    }
    
    return this.mapExpenseResult(results[0]);
  }
  
  /**
   * Update an existing expense record
   * @param id Expense ID
   * @param updates Expense data to update
   * @returns true if update successful
   */
  async update(id: number, updates: Partial<ExpenseRecord>): Promise<boolean> {
    this.logger.debug(`Updating expense with ID: ${id}`, { updates });
    
    // Filter out id field and create update fields
    const updateFields = Object.keys(updates).filter(key => key !== 'id');
    
    if (updateFields.length === 0) {
      this.logger.warn('No fields to update');
      return false;
    }
    
    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => 
      field === 'isRecurring' 
        ? updates.isRecurring ? 1 : 0 
        : updates[field as keyof ExpenseRecord]
    );
    
    // Add updatedAt and id to parameters
    const now = new Date().toISOString();
    values.push(now);
    values.push(id);
    
    const result = await this.dbManager.execute<{ changes: number }>(
      `UPDATE expenses SET ${setClause}, updatedAt = ? WHERE id = ?`,
      values
    );
    
    this.logger.info(`Updated expense ID ${id}, rows affected: ${result.changes}`);
    return result.changes > 0;
  }
  
  /**
   * Delete an expense record
   * @param id Expense ID
   * @returns true if deletion successful
   */
  async delete(id: number): Promise<boolean> {
    this.logger.debug(`Deleting expense with ID: ${id}`);
    
    const result = await this.dbManager.execute<{ changes: number }>(
      'DELETE FROM expenses WHERE id = ?',
      [id]
    );
    
    this.logger.info(`Deleted expense ID ${id}, rows affected: ${result.changes}`);
    return result.changes > 0;
  }
  
  /**
   * Get expense records with optional filtering
   * @param filter Filter criteria
   * @param limit Maximum number of records to return
   * @param offset Number of records to skip
   * @returns Array of expense records
   */
  async getMany(
    filter?: Partial<ExpenseRecord>,
    limit?: number,
    offset: number = 0
  ): Promise<ExpenseRecord[]> {
    // Build WHERE clause from filter
    let whereClause = '';
    const params: any[] = [];
    
    if (filter && Object.keys(filter).length > 0) {
      const conditions = Object.keys(filter).map(key => {
        params.push(
          key === 'isRecurring' 
            ? filter.isRecurring ? 1 : 0 
            : filter[key as keyof ExpenseRecord]
        );
        return `${key} = ?`;
      });
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }
    
    // Add pagination parameters
    if (limit !== undefined) {
      params.push(limit);
      params.push(offset);
    }
    
    const query = `
      SELECT * FROM expenses 
      ${whereClause} 
      ORDER BY date DESC, createdAt DESC
      ${limit !== undefined ? 'LIMIT ? OFFSET ?' : ''}
    `;
    
    this.logger.debug(`Getting expenses with filter`, { filter, limit, offset });
    
    const results = await this.dbManager.execute<ExpenseRecord[]>(query, params);
    return results.map(this.mapExpenseResult);
  }
  
  /**
   * Get expenses for a specific user
   * @param userId User ID
   * @param limit Maximum number of records to return
   * @returns Array of expense records
   */
  async getByUserId(userId: string, limit?: number): Promise<ExpenseRecord[]> {
    this.logger.debug(`Getting expenses for user: ${userId}`, { limit });
    
    const query = limit 
      ? 'SELECT * FROM expenses WHERE userId = ? ORDER BY date DESC, createdAt DESC LIMIT ?'
      : 'SELECT * FROM expenses WHERE userId = ? ORDER BY date DESC, createdAt DESC';
    
    const params = limit ? [userId, limit] : [userId];
    const results = await this.dbManager.execute<ExpenseRecord[]>(query, params);
    
    return results.map(this.mapExpenseResult);
  }
  
  /**
   * Get expenses by category
   * @param userId User ID
   * @param category Expense category
   * @param limit Maximum number of records to return
   * @returns Array of expense records
   */
  async getByCategory(userId: string, category: string, limit?: number): Promise<ExpenseRecord[]> {
    this.logger.debug(`Getting expenses for user ${userId} in category: ${category}`, { limit });
    
    const query = limit 
      ? 'SELECT * FROM expenses WHERE userId = ? AND category = ? ORDER BY date DESC, createdAt DESC LIMIT ?'
      : 'SELECT * FROM expenses WHERE userId = ? AND category = ? ORDER BY date DESC, createdAt DESC';
    
    const params = limit ? [userId, category, limit] : [userId, category];
    const results = await this.dbManager.execute<ExpenseRecord[]>(query, params);
    
    return results.map(this.mapExpenseResult);
  }
  
  /**
   * Get expenses within a date range
   * @param userId User ID
   * @param startDate Start date (ISO string)
   * @param endDate End date (ISO string)
   * @returns Array of expense records
   */
  async getByDateRange(userId: string, startDate: string, endDate: string): Promise<ExpenseRecord[]> {
    this.logger.debug(`Getting expenses for user ${userId} between ${startDate} and ${endDate}`);
    
    const results = await this.dbManager.execute<ExpenseRecord[]>(
      'SELECT * FROM expenses WHERE userId = ? AND date >= ? AND date <= ? ORDER BY date DESC, createdAt DESC',
      [userId, startDate, endDate]
    );
    
    return results.map(this.mapExpenseResult);
  }
  
  /**
   * Get pending expenses for sync
   * @param userId User ID
   * @returns Array of expense records pending synchronization
   */
  async getPendingSync(userId: string): Promise<ExpenseRecord[]> {
    this.logger.debug(`Getting pending sync expenses for user: ${userId}`);
    
    const results = await this.dbManager.execute<ExpenseRecord[]>(
      'SELECT * FROM expenses WHERE userId = ? AND syncStatus = ? ORDER BY createdAt ASC',
      [userId, 'pending']
    );
    
    return results.map(this.mapExpenseResult);
  }
  
  /**
   * Update sync status for multiple expenses
   * @param ids Array of expense IDs
   * @param status New sync status
   * @returns Number of records updated
   */
  async updateSyncStatus(ids: number[], status: 'synced' | 'pending' | 'error'): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    
    this.logger.debug(`Updating sync status to ${status} for expense IDs: ${ids.join(', ')}`);
    
    // Generate placeholders for the IN clause
    const placeholders = ids.map(() => '?').join(',');
    const now = new Date().toISOString();
    
    const result = await this.dbManager.execute<{ changes: number }>(
      `UPDATE expenses SET syncStatus = ?, updatedAt = ? WHERE id IN (${placeholders})`,
      [status, now, ...ids]
    );
    
    this.logger.info(`Updated sync status for ${result.changes} expenses`);
    return result.changes;
  }
  
  /**
   * Get expense statistics for analysis
   * @param userId User ID
   * @param period Period to analyze ('week', 'month', 'year')
   * @returns Expense statistics
   */
  async getStatistics(userId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<{
    total: number;
    average: number;
    byCategory: { category: string; total: number; percentage: number }[];
    mostExpensive: ExpenseRecord | null;
  }> {
    this.logger.debug(`Getting expense statistics for user ${userId} for period: ${period}`);
    
    // Determine date filter based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'month':
      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    
    try {
      // Get total expenses
      const totalResult = await this.dbManager.execute<{ total: number }[]>(
        'SELECT SUM(amount) as total FROM expenses WHERE userId = ? AND date >= ?',
        [userId, startDateStr]
      );
      const total = totalResult[0]?.total || 0;
      
      // Get expenses by category
      const categoriesResult = await this.dbManager.execute<{ category: string; total: number }[]>(
        'SELECT category, SUM(amount) as total FROM expenses WHERE userId = ? AND date >= ? GROUP BY category ORDER BY total DESC',
        [userId, startDateStr]
      );
      
      const byCategory = categoriesResult.map(item => ({
        category: item.category,
        total: item.total,
        percentage: total > 0 ? (item.total / total) * 100 : 0
      }));
      
      // Get most expensive transaction
      const expensiveResult = await this.dbManager.execute<ExpenseRecord[]>(
        'SELECT * FROM expenses WHERE userId = ? AND date >= ? ORDER BY amount DESC LIMIT 1',
        [userId, startDateStr]
      );
      
      const mostExpensive = expensiveResult.length > 0
        ? this.mapExpenseResult(expensiveResult[0])
        : null;
      
      // Calculate average (daily)
      const daysDiff = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const average = total / daysDiff;
      
      return {
        total,
        average,
        byCategory,
        mostExpensive
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get expense statistics: ${errorMessage}`, 
        error instanceof Error ? error : undefined);
      throw new QueryError(`Failed to get expense statistics: ${errorMessage}`);
    }
  }
  
  /**
   * Map a raw expense result to ExpenseRecord type
   * @param row Raw database row
   * @returns Formatted ExpenseRecord
   */
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
}
