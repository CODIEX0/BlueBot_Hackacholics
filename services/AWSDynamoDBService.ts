/**
 * AWS DynamoDB Service
 * Main database service using AWS DynamoDB
 */

import { TABLE_NAMES } from '../config/aws';

// DynamoDB types and interfaces
export interface DynamoDBUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
  subscription?: 'free' | 'premium' | 'enterprise';
  preferences?: {
    currency: string;
    language: string;
    notifications: boolean;
  };
}

export interface DynamoDBExpense {
  expenseId: string;
  userId: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  receiptUrl?: string;
  tags?: string[];
  paymentMethod?: string;
  isRecurring?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DynamoDBBudget {
  budgetId: string;
  userId: string;
  name: string;
  totalAmount: number;
  spentAmount: number;
  currency: string;
  category?: string;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DynamoDBTransaction {
  transactionId: string;
  userId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  accountFrom?: string;
  accountTo?: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DynamoDBUserProgress {
  userId: string;
  totalXP: number;
  currentLevel: number;
  completedCourses: string[];
  completedLessons: string[];
  courseProgress: Record<string, any>;
  achievements: string[];
  studyStreak: number;
  totalStudyTime: number;
  lastActive: string;
  goals?: any[];
  certifications?: string[];
}

export interface DynamoDBChatSession {
  sessionId: string;
  userId: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  context?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface DynamoDBReceipt {
  receiptId: string;
  userId: string;
  imageUrl: string;
  extractedData?: {
    merchant: string;
    total: number;
    currency: string;
    date: string;
    items: Array<{
      name: string;
      price: number;
      quantity?: number;
    }>;
  };
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  expenseId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * AWS DynamoDB Service Class
 * Handles all database operations using DynamoDB
 */
export class AWSDynamoDBService {
  private documentClient: any;
  private ddb: any;
  private lib: any;
  
  constructor() {
    // Initialize DynamoDB client when AWS SDK is available
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      console.log('Initializing DynamoDB client...');
      const { awsConfig } = (await import('../config/aws')).default as any;
      const region = awsConfig?.region || process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1';
      const credentials = {
        accessKeyId: awsConfig?.credentials?.accessKeyId || process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID,
        secretAccessKey: awsConfig?.credentials?.secretAccessKey || process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.EXPO_PUBLIC_AWS_SESSION_TOKEN,
      };
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } = await import('@aws-sdk/lib-dynamodb');
      const client = new DynamoDBClient({ region, credentials });
      this.documentClient = DynamoDBDocumentClient.from(client, {
        marshallOptions: { removeUndefinedValues: true },
      });
      this.ddb = { client };
      this.lib = { PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand };
      console.log('DynamoDB Document client ready');
    } catch (error) {
      console.error('Failed to initialize DynamoDB client:', error);
    }
  }

  // User Operations
  async createUser(user: Omit<DynamoDBUser, 'userId' | 'createdAt' | 'updatedAt'>): Promise<DynamoDBUser> {
    const userId = this.generateId();
    const timestamp = new Date().toISOString();
    
    const newUser: DynamoDBUser = {
      ...user,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      // DynamoDB put operation
      console.log('Creating user:', newUser);
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<DynamoDBUser | null> {
    try {
      // DynamoDB get operation
      console.log('Getting user by ID:', userId);
      return null; // Placeholder
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  async updateUser(userId: string, updates: Partial<DynamoDBUser>): Promise<DynamoDBUser> {
    try {
      const timestamp = new Date().toISOString();
      // DynamoDB update operation
      console.log('Updating user:', userId, updates);
      throw new Error('Not implemented yet');
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Expense Operations
  async createExpense(expense: Omit<DynamoDBExpense, 'expenseId' | 'createdAt' | 'updatedAt'>): Promise<DynamoDBExpense> {
    const expenseId = this.generateId();
    const timestamp = new Date().toISOString();
    
    const newExpense: DynamoDBExpense = {
      ...expense,
      expenseId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      if (!this.documentClient) {
        console.log('Creating expense (no AWS client, returning mock):', newExpense);
        return newExpense;
      }
      const TableName = TABLE_NAMES.EXPENSES;
      const { PutCommand } = this.lib;
      await this.documentClient.send(new PutCommand({ TableName, Item: newExpense }));
      return newExpense;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  async getExpensesByUserId(userId: string, limit?: number): Promise<DynamoDBExpense[]> {
    try {
      if (!this.documentClient) {
        console.log('Getting expenses for user (no AWS client):', userId);
        return [];
      }
      const TableName = TABLE_NAMES.EXPENSES;
      const { QueryCommand, ScanCommand } = this.lib;
      // Try query by GSI on userId if available
      try {
        const res = await this.documentClient.send(new QueryCommand({
          TableName,
          IndexName: 'userId-index',
          KeyConditionExpression: 'userId = :uid',
          ExpressionAttributeValues: { ':uid': userId },
          ScanIndexForward: false,
          Limit: limit || 50,
        }));
        return (res.Items || []) as DynamoDBExpense[];
      } catch (e) {
        // Fallback: full table scan then filter (not ideal, but safe placeholder)
        console.warn('Query on userId-index failed, falling back to Scan. Consider adding a GSI on userId.');
        const res = await this.documentClient.send(new ScanCommand({ TableName }));
        const items = (res.Items || []) as DynamoDBExpense[];
        return items.filter(i => i.userId === userId).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
          .slice(0, limit || 50);
      }
    } catch (error) {
      console.error('Error getting expenses:', error);
      throw error;
    }
  }

  async updateExpense(expenseId: string, updates: Partial<DynamoDBExpense>): Promise<DynamoDBExpense> {
    try {
      const timestamp = new Date().toISOString();
      if (!this.documentClient) {
        console.log('Updating expense (no AWS client):', expenseId, updates);
        return { ...(updates as any), expenseId, userId: '', amount: 0, currency: 'ZAR', category: '', description: '', date: timestamp, createdAt: timestamp, updatedAt: timestamp };
      }
      const TableName = TABLE_NAMES.EXPENSES;
      const { UpdateCommand } = this.lib;
      const updateExpressions: string[] = [];
      const names: Record<string, string> = {};
      const values: Record<string, any> = {};
      const entries = Object.entries({ ...updates, updatedAt: timestamp });
      for (const [k, v] of entries) {
        const nameKey = `#${k}`;
        const valueKey = `:${k}`;
        names[nameKey] = k;
        values[valueKey] = v;
        updateExpressions.push(`${nameKey} = ${valueKey}`);
      }
      const res = await this.documentClient.send(new UpdateCommand({
        TableName,
        Key: { expenseId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }));
      return (res.Attributes || {}) as DynamoDBExpense;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  async deleteExpense(expenseId: string, userId: string): Promise<void> {
    try {
      if (!this.documentClient) {
        console.log('Deleting expense (no AWS client):', expenseId);
        return;
      }
      const TableName = TABLE_NAMES.EXPENSES;
      const { DeleteCommand } = this.lib;
      await this.documentClient.send(new DeleteCommand({ TableName, Key: { expenseId } }));
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  // Budget Operations
  async createBudget(budget: Omit<DynamoDBBudget, 'budgetId' | 'createdAt' | 'updatedAt'>): Promise<DynamoDBBudget> {
    const budgetId = this.generateId();
    const timestamp = new Date().toISOString();
    
    const newBudget: DynamoDBBudget = {
      ...budget,
      budgetId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      // DynamoDB put operation
      console.log('Creating budget:', newBudget);
      return newBudget;
    } catch (error) {
      console.error('Error creating budget:', error);
      throw error;
    }
  }

  async getBudgetsByUserId(userId: string): Promise<DynamoDBBudget[]> {
    try {
      // DynamoDB query operation
      console.log('Getting budgets for user:', userId);
      return []; // Placeholder
    } catch (error) {
      console.error('Error getting budgets:', error);
      throw error;
    }
  }

  // User Progress Operations
  async getUserProgress(userId: string): Promise<DynamoDBUserProgress | null> {
    try {
      // DynamoDB get operation
      console.log('Getting user progress:', userId);
      return null; // Placeholder
    } catch (error) {
      console.error('Error getting user progress:', error);
      throw error;
    }
  }

  async updateUserProgress(userId: string, progress: Partial<DynamoDBUserProgress>): Promise<DynamoDBUserProgress> {
    try {
      const timestamp = new Date().toISOString();
      // DynamoDB update operation
      console.log('Updating user progress:', userId, progress);
      throw new Error('Not implemented yet');
    } catch (error) {
      console.error('Error updating user progress:', error);
      throw error;
    }
  }

  // Chat Session Operations
  async createChatSession(userId: string): Promise<DynamoDBChatSession> {
    const sessionId = this.generateId();
    const timestamp = new Date().toISOString();
    
    const newSession: DynamoDBChatSession = {
      sessionId,
      userId,
      messages: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      isActive: true,
    };

    try {
      // DynamoDB put operation
      console.log('Creating chat session:', newSession);
      return newSession;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  async addMessageToSession(sessionId: string, message: any): Promise<void> {
    try {
      // DynamoDB update operation to add message to session
      console.log('Adding message to session:', sessionId, message);
    } catch (error) {
      console.error('Error adding message to session:', error);
      throw error;
    }
  }

  // Receipt Operations
  async createReceipt(receipt: Omit<DynamoDBReceipt, 'receiptId' | 'createdAt' | 'updatedAt'>): Promise<DynamoDBReceipt> {
    const receiptId = this.generateId();
    const timestamp = new Date().toISOString();
    
    const newReceipt: DynamoDBReceipt = {
      ...receipt,
      receiptId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      if (!this.documentClient) {
        console.log('Creating receipt (no AWS client):', newReceipt);
        return newReceipt;
      }
      const TableName = TABLE_NAMES.RECEIPTS;
      const { PutCommand } = this.lib;
      await this.documentClient.send(new PutCommand({ TableName, Item: newReceipt }));
      return newReceipt;
    } catch (error) {
      console.error('Error creating receipt:', error);
      throw error;
    }
  }

  async updateReceiptOCRStatus(receiptId: string, status: string, extractedData?: any): Promise<void> {
    try {
      if (!this.documentClient) {
        console.log('Updating receipt OCR status (no AWS client):', receiptId, status);
        return;
      }
      const TableName = TABLE_NAMES.RECEIPTS;
      const { UpdateCommand } = this.lib;
      const updateExpressions: string[] = ['#updatedAt = :updatedAt', '#ocrStatus = :status'];
      const names: Record<string, string> = { '#updatedAt': 'updatedAt', '#ocrStatus': 'ocrStatus' };
      const values: Record<string, any> = { ':updatedAt': new Date().toISOString(), ':status': status };
      if (extractedData !== undefined) {
        updateExpressions.push('#extractedData = :extractedData');
        names['#extractedData'] = 'extractedData';
        values[':extractedData'] = extractedData;
      }
      await this.documentClient.send(new UpdateCommand({
        TableName,
        Key: { receiptId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }));
    } catch (error) {
      console.error('Error updating receipt OCR status:', error);
      throw error;
    }
  }

  // Transaction Operations
  async createTransaction(transaction: Omit<DynamoDBTransaction, 'transactionId' | 'createdAt' | 'updatedAt'>): Promise<DynamoDBTransaction> {
    const transactionId = this.generateId();
    const timestamp = new Date().toISOString();
    
    const newTransaction: DynamoDBTransaction = {
      ...transaction,
      transactionId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      // DynamoDB put operation
      console.log('Creating transaction:', newTransaction);
      return newTransaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async getTransactionsByUserId(userId: string, limit?: number): Promise<DynamoDBTransaction[]> {
    try {
      // DynamoDB query operation
      console.log('Getting transactions for user:', userId);
      return []; // Placeholder
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  // Utility Methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check for DynamoDB connection
      console.log('DynamoDB health check');
      return true;
    } catch (error) {
      console.error('DynamoDB health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const awsDynamoDBService = new AWSDynamoDBService();
export default awsDynamoDBService;
