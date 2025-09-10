/**
 * AWS Service Manager
 * Central manager for all AWS services in BlueBot
 */

import { awsDynamoDBService } from './AWSDynamoDBService';
import { awsTextractService } from './AWSTextractService';
import { awsCognitoService } from './AWSCognitoService';
import { awsBedrockService } from './AWSBedrockService';
import { awsS3Service } from './AWSS3Service';
import awsCfg from '../config/aws';

export interface AWSServiceStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  lastCheck: string;
  responseTime?: number;
}

export interface AWSServiceConfiguration {
  region: string;
  credentials: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
  };
  endpoints?: {
    dynamodb?: string;
    textract?: string;
    cognito?: string;
    bedrock?: string;
  };
}

/**
 * AWS Service Manager - Central hub for all AWS services
 */
export class AWSServiceManager {
  private static instance: AWSServiceManager;
  private configuration: AWSServiceConfiguration;
  private serviceStatus: Map<string, AWSServiceStatus> = new Map();

  constructor() {
    const { awsConfig } = awsCfg as any;
    this.configuration = {
      region: awsConfig?.region || process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1',
      credentials: {
        // Prefer EXPO_PUBLIC_* that work on client via app.json or .env
        accessKeyId: awsConfig?.credentials?.accessKeyId || process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID,
        secretAccessKey: awsConfig?.credentials?.secretAccessKey || process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.EXPO_PUBLIC_AWS_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN,
      }
    };
    
    this.initializeServices();
  }

  static getInstance(): AWSServiceManager {
    if (!AWSServiceManager.instance) {
      AWSServiceManager.instance = new AWSServiceManager();
    }
    return AWSServiceManager.instance;
  }

  private async initializeServices() {
    console.log('Initializing AWS Service Manager...');
    await this.checkAllServicesHealth();
  }

  /**
   * Database Operations (DynamoDB)
   */
  get database() {
    return awsDynamoDBService;
  }

  /**
   * OCR Operations (Textract)
   */
  get ocr() {
    return awsTextractService;
  }

  /**
   * Authentication Operations (Cognito)
   */
  get auth() {
    return awsCognitoService;
  }

  /**
   * AI Operations (Bedrock)
   */
  get ai() {
    return awsBedrockService;
  }

  /**
   * File Storage (S3)
   */
  get storage() {
    return awsS3Service;
  }

  /**
   * Check health of all AWS services
   */
  async checkAllServicesHealth(): Promise<AWSServiceStatus[]> {
    console.log('Checking health of all AWS services...');
    
    const services = [
      { name: 'DynamoDB', service: this.database },
      { name: 'Textract', service: this.ocr },
      { name: 'Cognito', service: this.auth },
  { name: 'Bedrock', service: this.ai },
  { name: 'S3', service: this.storage }
    ];

    const results: AWSServiceStatus[] = [];

    for (const { name, service } of services) {
      try {
        const startTime = Date.now();
        const isHealthy = await service.healthCheck();
        const responseTime = Date.now() - startTime;

        const status: AWSServiceStatus = {
          service: name,
          status: isHealthy ? 'healthy' : 'degraded',
          lastCheck: new Date().toISOString(),
          responseTime
        };

        this.serviceStatus.set(name, status);
        results.push(status);
      } catch (error) {
        const status: AWSServiceStatus = {
          service: name,
          status: 'unavailable',
          lastCheck: new Date().toISOString()
        };

        this.serviceStatus.set(name, status);
        results.push(status);
        console.error(`Health check failed for ${name}:`, error);
      }
    }

    return results;
  }

  /**
   * Get service status
   */
  getServiceStatus(serviceName?: string): AWSServiceStatus | AWSServiceStatus[] {
    if (serviceName) {
      return this.serviceStatus.get(serviceName) || {
        service: serviceName,
        status: 'unavailable',
        lastCheck: new Date().toISOString()
      };
    }
    
    return Array.from(this.serviceStatus.values());
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: Partial<AWSServiceConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
    console.log('AWS configuration updated');
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfiguration(): Partial<AWSServiceConfiguration> {
    return {
      region: this.configuration.region,
      endpoints: this.configuration.endpoints
    };
  }

  /**
   * Comprehensive user data operations
   */
  async createUserAccount(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  }) {
    try {
      console.log('Creating comprehensive user account...');
      
      // 1. Create Cognito user
      const cognitoResult = await this.auth.signUp(
        userData.email,
        userData.password,
        userData.firstName,
        userData.lastName,
        userData.phoneNumber
      );

      // 2. Create DynamoDB user record
      const dbUser = await this.database.createUser({
        email: userData.email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phoneNumber: userData.phoneNumber,
        subscription: 'free',
        preferences: {
          currency: 'ZAR',
          language: 'en',
          notifications: true
        }
      });

      // 3. Initialize user progress
      await this.database.updateUserProgress(dbUser.userId, {
        totalXP: 0,
        currentLevel: 1,
        completedCourses: [],
        completedLessons: [],
        courseProgress: {},
        achievements: [],
        studyStreak: 0,
        totalStudyTime: 0,
        lastActive: new Date().toISOString(),
        goals: [],
        certifications: []
      });

      return {
        cognitoUser: cognitoResult,
        dbUser,
        success: true
      };
    } catch (error) {
      console.error('Error creating user account:', error);
      throw error;
    }
  }

  /**
   * Process receipt with full pipeline
   */
  async processReceiptFullPipeline(imageUri: string, userId: string) {
    try {
      console.log('Processing receipt with full AWS pipeline...');
      
      // 0. Upload to S3 first (best-effort; fallback to local URI)
      const key = `receipts/${userId}/${Date.now()}.jpg`;
      const uploadedUrl = await this.storage.uploadImageFromUri(imageUri, key, 'image/jpeg');

      // 1. Create receipt record
      const receipt = await this.database.createReceipt({
        userId,
        imageUrl: uploadedUrl,
        ocrStatus: 'processing'
      });

      // 2. Process with Textract
      const ocrResult = await this.ocr.processReceiptImage(imageUri, userId);

      // 3. Update receipt with OCR data
      await this.database.updateReceiptOCRStatus(
        receipt.receiptId,
        'completed',
        ocrResult
      );

      // 4. Create expense from OCR data
      if (ocrResult.total && ocrResult.total > 0) {
        const expense = await this.database.createExpense({
          userId,
          amount: ocrResult.total,
          currency: ocrResult.currency || 'ZAR',
          category: 'Uncategorized', // Will be categorized by AI
          description: ocrResult.merchant || 'Receipt purchase',
          date: ocrResult.date || new Date().toISOString().split('T')[0],
          receiptUrl: uploadedUrl,
          paymentMethod: 'unknown'
        });

        // 5. Get AI analysis
        const aiAnalysis = await this.ai.analyzeReceipt(ocrResult.rawText || '', userId);

        // 6. Update expense with AI categorization
        await this.database.updateExpense(expense.expenseId, {
          category: aiAnalysis.category,
          description: `${aiAnalysis.merchant} - ${aiAnalysis.subcategory}`
        });

        return {
          receipt,
          ocrResult,
          expense,
          aiAnalysis,
          success: true
        };
      }

      return {
        receipt,
        ocrResult,
        success: true
      };
    } catch (error) {
      console.error('Error in receipt processing pipeline:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive financial insights
   */
  async getFinancialInsights(userId: string) {
    try {
      console.log('Generating comprehensive financial insights...');
      
      // 1. Get user data
      const user = await this.database.getUserById(userId);
      const expenses = await this.database.getExpensesByUserId(userId, 100);
      const budgets = await this.database.getBudgetsByUserId(userId);
      const transactions = await this.database.getTransactionsByUserId(userId, 50);

      // 2. Generate AI insights
      const aiInsights = await this.ai.generateInsights(userId, {
        user,
        expenses,
        budgets,
        transactions
      });

      // 3. Analyze budget
      const budgetAnalysis = await this.ai.analyzeBudget(userId, budgets[0], expenses);

      // 4. Get financial advice
      const financialAdvice = await this.ai.getFinancialAdvice({
        userId,
        question: 'What are my current financial insights?',
        context: {
          expenses,
          budget: budgets[0],
          riskProfile: 'moderate'
        }
      });

      return {
        insights: aiInsights,
        budgetAnalysis,
        financialAdvice,
        dataPoints: {
          totalExpenses: expenses.length,
          totalBudgets: budgets.length,
          totalTransactions: transactions.length
        },
        success: true
      };
    } catch (error) {
      console.error('Error generating financial insights:', error);
      throw error;
    }
  }

  /**
   * Migrate data from old system
   */
  async migrateFromOldDatabase(oldData: any) {
    try {
      console.log('Migrating data to AWS services...');
      
      const results = {
        users: 0,
        expenses: 0,
        budgets: 0,
        transactions: 0,
        errors: [] as string[]
      };

      // Migrate users
      if (oldData.users) {
        for (const user of oldData.users) {
          try {
            await this.database.createUser(user);
            results.users++;
          } catch (error: any) {
            results.errors.push(`User migration error: ${error.message || error}`);
          }
        }
      }

      // Migrate expenses
      if (oldData.expenses) {
        for (const expense of oldData.expenses) {
          try {
            await this.database.createExpense(expense);
            results.expenses++;
          } catch (error: any) {
            results.errors.push(`Expense migration error: ${error.message || error}`);
          }
        }
      }

      // Migrate budgets
      if (oldData.budgets) {
        for (const budget of oldData.budgets) {
          try {
            await this.database.createBudget(budget);
            results.budgets++;
          } catch (error: any) {
            results.errors.push(`Budget migration error: ${error.message || error}`);
          }
        }
      }

      console.log('Migration completed:', results);
      return results;
    } catch (error) {
      console.error('Error in data migration:', error);
      throw error;
    }
  }

  /**
   * Emergency shutdown
   */
  async emergencyShutdown(): Promise<void> {
    console.log('Initiating emergency shutdown of AWS services...');
    
    try {
      // Close any open connections
      // Clear sensitive data from memory
      this.serviceStatus.clear();
      console.log('Emergency shutdown completed');
    } catch (error) {
      console.error('Error during emergency shutdown:', error);
    }
  }
}

// Export singleton instance
export const awsServiceManager = AWSServiceManager.getInstance();
export default awsServiceManager;
