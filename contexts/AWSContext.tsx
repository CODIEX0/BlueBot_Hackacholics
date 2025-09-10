/**
 * AWS Context
 * React context for AWS services integration
 */

import React from 'react';
import { awsServiceManager, AWSServiceStatus } from '../services/AWSServiceManager';
import { DynamoDBUser, DynamoDBExpense, DynamoDBBudget, DynamoDBUserProgress } from '../services/AWSDynamoDBService';
import { CognitoUser, AuthenticationResult } from '../services/AWSCognitoService';

export interface AWSContextType {
  // Service status
  serviceStatus: AWSServiceStatus[];
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Authentication
  currentUser: CognitoUser | null;
  isAuthenticated: boolean;
  authTokens: AuthenticationResult | null;

  // User data
  userData: DynamoDBUser | null;
  userProgress: DynamoDBUserProgress | null;
  expenses: DynamoDBExpense[];
  budgets: DynamoDBBudget[];

  // Authentication methods
  signUp: (email: string, password: string, firstName?: string, lastName?: string, phoneNumber?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  resendConfirmationCode?: (email: string) => Promise<void>;

  // Data methods
  refreshUserData: () => Promise<void>;
  createExpense: (expenseData: any) => Promise<DynamoDBExpense>;
  updateExpense: (expenseId: string, updates: any) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  createBudget: (budgetData: any) => Promise<DynamoDBBudget>;
  updateBudget: (budgetId: string, updates: any) => Promise<void>;
  
  // OCR and AI methods
  processReceipt: (imageUri: string) => Promise<any>;
  getFinancialAdvice: (question: string) => Promise<any>;
  getFinancialInsights: () => Promise<any>;
  chatWithAI: (message: string) => Promise<string>;

  // Service management
  checkServicesHealth: () => Promise<void>;
  getServiceStatus: (serviceName?: string) => AWSServiceStatus | AWSServiceStatus[];
}

const AWSContext = React.createContext<AWSContextType | undefined>(undefined);

export interface AWSProviderProps {
  children: React.ReactNode;
}

export const AWSProvider: React.FC<AWSProviderProps> = ({ children }) => {
  // State management
  const [serviceStatus, setServiceStatus] = React.useState<AWSServiceStatus[]>([]);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Authentication state
  const [currentUser, setCurrentUser] = React.useState<CognitoUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [authTokens, setAuthTokens] = React.useState<AuthenticationResult | null>(null);

  // User data state
  const [userData, setUserData] = React.useState<DynamoDBUser | null>(null);
  const [userProgress, setUserProgress] = React.useState<DynamoDBUserProgress | null>(null);
  const [expenses, setExpenses] = React.useState<DynamoDBExpense[]>([]);
  const [budgets, setBudgets] = React.useState<DynamoDBBudget[]>([]);

  // Initialize AWS services
  React.useEffect(() => {
    initializeAWSServices();
  }, []);

  const initializeAWSServices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Initializing AWS services...');
      
      // Check service health
      const status = await awsServiceManager.checkAllServicesHealth();
      setServiceStatus(status);

      // Check for existing authentication
      await checkExistingAuth();

      setIsInitialized(true);
    } catch (err: any) {
      console.error('Failed to initialize AWS services:', err);
      setError(err.message || 'Failed to initialize AWS services');
    } finally {
      setIsLoading(false);
    }
  };

  const checkExistingAuth = async () => {
    try {
      // Check for stored tokens and validate them
      const storedTokens = localStorage.getItem('aws-auth-tokens');
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens);
        const isValid = await awsServiceManager.auth.validateToken(tokens.accessToken);
        
        if (isValid) {
          setAuthTokens(tokens);
          const user = await awsServiceManager.auth.getCurrentUser(tokens.accessToken);
          setCurrentUser(user);
          setIsAuthenticated(true);
          await loadUserData(user.userId);
        } else {
          localStorage.removeItem('aws-auth-tokens');
        }
      }
    } catch (error) {
      console.error('Error checking existing auth:', error);
      localStorage.removeItem('aws-auth-tokens');
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      // Load user data from DynamoDB
      const [user, progress, userExpenses, userBudgets] = await Promise.all([
        awsServiceManager.database.getUserById(userId),
        awsServiceManager.database.getUserProgress(userId),
        awsServiceManager.database.getExpensesByUserId(userId, 50),
        awsServiceManager.database.getBudgetsByUserId(userId)
      ]);

      setUserData(user);
      setUserProgress(progress);
      setExpenses(userExpenses);
      setBudgets(userBudgets);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Authentication methods
  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, phoneNumber?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await awsServiceManager.createUserAccount({
        email,
        password,
        firstName,
        lastName,
        phoneNumber
      });

      console.log('User account created successfully:', result);
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const tokens = await awsServiceManager.auth.signIn(email, password);
      const user = await awsServiceManager.auth.getCurrentUser(tokens.accessToken);

      setAuthTokens(tokens);
      setCurrentUser(user);
      setIsAuthenticated(true);

      // Store tokens securely
      localStorage.setItem('aws-auth-tokens', JSON.stringify(tokens));

      // Load user data
      await loadUserData(user.userId);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (authTokens) {
        await awsServiceManager.auth.signOut(authTokens.accessToken);
      }

      // Clear state
      setCurrentUser(null);
      setIsAuthenticated(false);
      setAuthTokens(null);
      setUserData(null);
      setUserProgress(null);
      setExpenses([]);
      setBudgets([]);

      // Clear stored tokens
      localStorage.removeItem('aws-auth-tokens');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const confirmSignUp = async (email: string, code: string) => {
    try {
      setIsLoading(true);
      await awsServiceManager.auth.confirmSignUp(email, code);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm sign up');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setIsLoading(true);
      await awsServiceManager.auth.forgotPassword(email);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate password reset');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmForgotPassword = async (email: string, code: string, newPassword: string) => {
    try {
      setIsLoading(true);
      await awsServiceManager.auth.confirmForgotPassword(email, code, newPassword);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm password reset');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resendConfirmationCode = async (email: string) => {
    try {
      setIsLoading(true);
      await awsServiceManager.auth.resendConfirmationCode(email);
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation code');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Data methods
  const refreshUserData = async () => {
    if (currentUser) {
      await loadUserData(currentUser.userId);
    }
  };

  const createExpense = async (expenseData: any): Promise<DynamoDBExpense> => {
    // Demo-mode: allow local expense creation when not authenticated
    if (!currentUser) {
      const timestamp = new Date().toISOString();
      const demoExpense: DynamoDBExpense = {
        expenseId: `demo_${Math.random().toString(36).slice(2)}`,
        userId: 'demo',
        amount: Number(expenseData.amount) || 0,
        currency: 'ZAR',
        category: expenseData.category || 'Other',
        description: expenseData.description || '',
        date: expenseData.date || timestamp.slice(0,10),
        receiptUrl: expenseData.receiptUrl,
        isRecurring: !!expenseData.isRecurring,
        tags: expenseData.tags,
        paymentMethod: expenseData.paymentMethod,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      setExpenses((prev) => [demoExpense, ...prev]);
      return demoExpense;
    }

    const expense = await awsServiceManager.database.createExpense({
      ...expenseData,
      userId: currentUser.userId
    });

    // Refresh expenses
    const updatedExpenses = await awsServiceManager.database.getExpensesByUserId(currentUser.userId, 50);
    setExpenses(updatedExpenses);

    return expense;
  };

  const updateExpense = async (expenseId: string, updates: any) => {
    if (!currentUser) {
      setExpenses((prev) => prev.map((e) =>
        (e.expenseId === expenseId || (e as any).id === expenseId)
          ? { ...e, ...updates, updatedAt: new Date().toISOString() }
          : e
      ));
      return;
    }
    await awsServiceManager.database.updateExpense(expenseId, updates);
    await refreshUserData();
  };

  const deleteExpense = async (expenseId: string) => {
    if (!currentUser) {
      setExpenses((prev) => prev.filter((e) => e.expenseId !== expenseId && (e as any).id !== expenseId));
      return;
    }
    await awsServiceManager.database.deleteExpense(expenseId, currentUser.userId);
    await refreshUserData();
  };

  const createBudget = async (budgetData: any): Promise<DynamoDBBudget> => {
    if (!currentUser) throw new Error('User not authenticated');

    const budget = await awsServiceManager.database.createBudget({
      ...budgetData,
      userId: currentUser.userId
    });

    // Refresh budgets
    const updatedBudgets = await awsServiceManager.database.getBudgetsByUserId(currentUser.userId);
    setBudgets(updatedBudgets);

    return budget;
  };

  const updateBudget = async (budgetId: string, updates: any) => {
    await awsServiceManager.database.updateExpense(budgetId, updates);
    await refreshUserData();
  };

  // OCR and AI methods
  const processReceipt = async (imageUri: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    return await awsServiceManager.processReceiptFullPipeline(imageUri, currentUser.userId);
  };

  const getFinancialAdvice = async (question: string) => {
    if (!currentUser) throw new Error('User not authenticated');

    return await awsServiceManager.ai.getFinancialAdvice({
      userId: currentUser.userId,
      question,
      context: {
        expenses,
        budget: budgets[0],
        riskProfile: 'moderate'
      }
    });
  };

  const getFinancialInsights = async () => {
    if (!currentUser) throw new Error('User not authenticated');
    
    return await awsServiceManager.getFinancialInsights(currentUser.userId);
  };

  const chatWithAI = async (message: string): Promise<string> => {
    if (!currentUser) throw new Error('User not authenticated');

    const response = await awsServiceManager.ai.chat([
      { role: 'user', content: message, timestamp: new Date().toISOString() }
    ], currentUser.userId);

    return response.content;
  };

  // Service management
  const checkServicesHealth = async () => {
    const status = await awsServiceManager.checkAllServicesHealth();
    setServiceStatus(status);
  };

  const getServiceStatus = (serviceName?: string) => {
    return awsServiceManager.getServiceStatus(serviceName);
  };

  const contextValue: AWSContextType = {
    // Service status
    serviceStatus,
    isInitialized,
    isLoading,
    error,

    // Authentication
    currentUser,
    isAuthenticated,
    authTokens,

    // User data
    userData,
    userProgress,
    expenses,
    budgets,

    // Authentication methods
    signUp,
    signIn,
    signOut,
    confirmSignUp,
    forgotPassword,
    confirmForgotPassword,
  resendConfirmationCode,

    // Data methods
    refreshUserData,
    createExpense,
    updateExpense,
    deleteExpense,
    createBudget,
    updateBudget,

    // OCR and AI methods
    processReceipt,
    getFinancialAdvice,
    getFinancialInsights,
    chatWithAI,

    // Service management
    checkServicesHealth,
    getServiceStatus
  };

  return (
    <AWSContext.Provider value={contextValue}>
      {children}
    </AWSContext.Provider>
  );
};

export const useAWS = (): AWSContextType => {
  const context = React.useContext(AWSContext);
  if (context === undefined) {
    throw new Error('useAWS must be used within an AWSProvider');
  }
  return context;
};

export default AWSContext;
