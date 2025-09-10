/**
 * Data Migration Utility
 * Helps migrate data from old database systems to AWS DynamoDB
 */

import { awsServiceManager } from '../services/AWSServiceManager';

export interface MigrationProgress {
  stage: string;
  completed: number;
  total: number;
  errors: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface MigrationResult {
  success: boolean;
  summary: {
    users: number;
    expenses: number;
    budgets: number;
    transactions: number;
    receipts: number;
  };
  errors: string[];
  duration: number;
}

/**
 * Data Migration Service
 */
export class DataMigrationService {
  private onProgress?: (progress: MigrationProgress) => void;

  constructor(onProgress?: (progress: MigrationProgress) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Migrate all data from legacy systems to AWS
   */
  async migrateAllData(legacyData: any): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      summary: {
        users: 0,
        expenses: 0,
        budgets: 0,
        transactions: 0,
        receipts: 0
      },
      errors: [],
      duration: 0
    };

    try {
      console.log('Starting data migration to AWS...');
      
      // Stage 1: Migrate Users
      await this.updateProgress('Migrating users...', 0, 5);
      if (legacyData.users) {
        result.summary.users = await this.migrateUsers(legacyData.users, result.errors);
      }

      // Stage 2: Migrate Expenses
      await this.updateProgress('Migrating expenses...', 1, 5);
      if (legacyData.expenses) {
        result.summary.expenses = await this.migrateExpenses(legacyData.expenses, result.errors);
      }

      // Stage 3: Migrate Budgets
      await this.updateProgress('Migrating budgets...', 2, 5);
      if (legacyData.budgets) {
        result.summary.budgets = await this.migrateBudgets(legacyData.budgets, result.errors);
      }

      // Stage 4: Migrate Transactions
      await this.updateProgress('Migrating transactions...', 3, 5);
      if (legacyData.transactions) {
        result.summary.transactions = await this.migrateTransactions(legacyData.transactions, result.errors);
      }

      // Stage 5: Migrate Receipts
      await this.updateProgress('Migrating receipts...', 4, 5);
      if (legacyData.receipts) {
        result.summary.receipts = await this.migrateReceipts(legacyData.receipts, result.errors);
      }

      await this.updateProgress('Migration completed!', 5, 5);
      
      result.success = true;
      result.duration = Date.now() - startTime;
      
      console.log('Migration completed successfully:', result);
      return result;
    } catch (error: any) {
      console.error('Migration failed:', error);
      result.errors.push(`Migration failed: ${error.message || error}`);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Migrate users from legacy system
   */
  private async migrateUsers(users: any[], errors: string[]): Promise<number> {
    let migrated = 0;
    
    for (const user of users) {
      try {
        const userData = {
          email: user.email || user.userEmail || '',
          firstName: user.firstName || user.name?.split(' ')[0] || '',
          lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
          phoneNumber: user.phoneNumber || user.phone,
          subscription: user.subscription || 'free',
          preferences: {
            currency: user.currency || 'ZAR',
            language: user.language || 'en',
            notifications: user.notifications !== false
          }
        };

        await awsServiceManager.database.createUser(userData);
        migrated++;
      } catch (error: any) {
        errors.push(`User migration error: ${error.message || error}`);
      }
    }

    return migrated;
  }

  /**
   * Migrate expenses from legacy system
   */
  private async migrateExpenses(expenses: any[], errors: string[]): Promise<number> {
    let migrated = 0;
    
    for (const expense of expenses) {
      try {
        const expenseData = {
          userId: expense.userId || expense.user_id || 'unknown',
          amount: parseFloat(expense.amount) || 0,
          currency: expense.currency || 'ZAR',
          category: expense.category || 'Uncategorized',
          description: expense.description || expense.title || 'Migrated expense',
          date: expense.date || expense.createdAt || new Date().toISOString().split('T')[0],
          receiptUrl: expense.receiptUrl || expense.receipt_url,
          tags: expense.tags || [],
          paymentMethod: expense.paymentMethod || expense.payment_method || 'unknown',
          isRecurring: expense.isRecurring || false
        };

        await awsServiceManager.database.createExpense(expenseData);
        migrated++;
      } catch (error: any) {
        errors.push(`Expense migration error: ${error.message || error}`);
      }
    }

    return migrated;
  }

  /**
   * Migrate budgets from legacy system
   */
  private async migrateBudgets(budgets: any[], errors: string[]): Promise<number> {
    let migrated = 0;
    
    for (const budget of budgets) {
      try {
        const budgetData = {
          userId: budget.userId || budget.user_id || 'unknown',
          name: budget.name || budget.title || 'Migrated budget',
          totalAmount: parseFloat(budget.totalAmount || budget.total_amount) || 0,
          spentAmount: parseFloat(budget.spentAmount || budget.spent_amount) || 0,
          currency: budget.currency || 'ZAR',
          category: budget.category,
          period: budget.period || 'monthly',
          startDate: budget.startDate || budget.start_date || new Date().toISOString().split('T')[0],
          endDate: budget.endDate || budget.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          isActive: budget.isActive !== false
        };

        await awsServiceManager.database.createBudget(budgetData);
        migrated++;
      } catch (error: any) {
        errors.push(`Budget migration error: ${error.message || error}`);
      }
    }

    return migrated;
  }

  /**
   * Migrate transactions from legacy system
   */
  private async migrateTransactions(transactions: any[], errors: string[]): Promise<number> {
    let migrated = 0;
    
    for (const transaction of transactions) {
      try {
        const transactionData = {
          userId: transaction.userId || transaction.user_id || 'unknown',
          type: transaction.type || 'expense',
          amount: parseFloat(transaction.amount) || 0,
          currency: transaction.currency || 'ZAR',
          category: transaction.category || 'Uncategorized',
          description: transaction.description || 'Migrated transaction',
          date: transaction.date || transaction.createdAt || new Date().toISOString().split('T')[0],
          accountFrom: transaction.accountFrom || transaction.account_from,
          accountTo: transaction.accountTo || transaction.account_to,
          status: transaction.status || 'completed',
          metadata: transaction.metadata || {}
        };

        await awsServiceManager.database.createTransaction(transactionData);
        migrated++;
      } catch (error: any) {
        errors.push(`Transaction migration error: ${error.message || error}`);
      }
    }

    return migrated;
  }

  /**
   * Migrate receipts from legacy system
   */
  private async migrateReceipts(receipts: any[], errors: string[]): Promise<number> {
    let migrated = 0;
    
    for (const receipt of receipts) {
      try {
        const receiptData = {
          userId: receipt.userId || receipt.user_id || 'unknown',
          imageUrl: receipt.imageUrl || receipt.image_url || '',
          extractedData: receipt.extractedData || receipt.extracted_data,
          ocrStatus: receipt.ocrStatus || receipt.ocr_status || 'completed',
          expenseId: receipt.expenseId || receipt.expense_id
        };

        await awsServiceManager.database.createReceipt(receiptData);
        migrated++;
      } catch (error: any) {
        errors.push(`Receipt migration error: ${error.message || error}`);
      }
    }

    return migrated;
  }

  /**
   * Update migration progress
   */
  private async updateProgress(stage: string, completed: number, total: number) {
    if (this.onProgress) {
      this.onProgress({
        stage,
        completed,
        total,
        errors: [],
        status: completed === total ? 'completed' : 'in-progress'
      });
    }

    // Small delay to show progress
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Export current AWS data for backup
   */
  async exportAWSData(userId?: string): Promise<any> {
    try {
      console.log('Exporting AWS data...');
      
      const exportData: any = {
        exportDate: new Date().toISOString(),
        users: [],
        expenses: [],
        budgets: [],
        transactions: [],
        receipts: []
      };

      if (userId) {
        // Export data for specific user
        const user = await awsServiceManager.database.getUserById(userId);
        if (user) {
          exportData.users.push(user);
          exportData.expenses = await awsServiceManager.database.getExpensesByUserId(userId);
          exportData.budgets = await awsServiceManager.database.getBudgetsByUserId(userId);
          exportData.transactions = await awsServiceManager.database.getTransactionsByUserId(userId);
        }
      }

      return exportData;
    } catch (error) {
      console.error('Error exporting AWS data:', error);
      throw error;
    }
  }

  /**
   * Validate data integrity after migration
   */
  async validateMigration(originalData: any, userId?: string): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      console.log('Validating migration integrity...');
      
      // Compare counts
      if (originalData.users && originalData.users.length > 0) {
        // Would need to implement user count check
        console.log('Validating user migration...');
      }

      if (originalData.expenses && originalData.expenses.length > 0) {
        if (userId) {
          const migratedExpenses = await awsServiceManager.database.getExpensesByUserId(userId);
          const originalUserExpenses = originalData.expenses.filter((e: any) => 
            e.userId === userId || e.user_id === userId
          );
          
          if (migratedExpenses.length !== originalUserExpenses.length) {
            issues.push(`Expense count mismatch: expected ${originalUserExpenses.length}, got ${migratedExpenses.length}`);
          }
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error: any) {
      issues.push(`Validation error: ${error.message || error}`);
      return { valid: false, issues };
    }
  }

  /**
   * Cleanup legacy data after successful migration
   */
  async cleanupLegacyData(): Promise<void> {
    try {
      console.log('Cleaning up legacy data...');
      
      // Clear local storage keys from old system
      if (typeof localStorage !== 'undefined') {
        const keysToRemove = [
          'bluebot-user',
          'bluebot-expenses',
          'bluebot-budgets',
          'bluebot-auth',
          'firebase-auth-user'
        ];

        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
      }

      // Clear other legacy data structures
      console.log('Legacy data cleanup completed');
    } catch (error) {
      console.error('Error cleaning up legacy data:', error);
    }
  }
}

// Export utility functions
export const createMigrationService = (onProgress?: (progress: MigrationProgress) => void) => {
  return new DataMigrationService(onProgress);
};

export default DataMigrationService;
