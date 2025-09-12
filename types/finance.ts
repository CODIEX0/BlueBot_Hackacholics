export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense';
  merchant?: string;
  recurring?: boolean;
  tags?: string[];
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
  endDate: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  description?: string;
}

export interface AIInsight {
  id: string;
  type: 'tip' | 'warning' | 'achievement' | 'recommendation';
  title: string;
  message: string;
  confidence: number;
  actionable: boolean;
  actionText?: string;
  category?: string;
  timestamp: string;
}

export interface UserFinancialProfile {
  id: string;
  userId: string;
  monthlyIncome: number;
  riskTolerance: 'low' | 'medium' | 'high';
  financialGoals: string[];
  preferredCategories: string[];
  budgetingStyle: 'strict' | 'flexible' | 'automated';
  savingsRate: number;
  lastUpdated: string;
}



export interface BankAccount {
  id: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'credit';
  balance: number;
  currency: string;
  bankName: string;
  isLinked: boolean;
  isPrimary: boolean;
}

export interface Receipt {
  id: string;
  imageUrl: string;
  merchantName: string;
  amount: number;
  date: string;
  items: ReceiptItem[];
  category: string;
  processed: boolean;
  ocrConfidence: number;
  manuallyVerified: boolean;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

export interface FinancialEducationModule {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // in minutes
  topics: string[];
  completed: boolean;
  progress: number; // percentage
  prerequisites: string[];
  rewards: {
    points: number;
    badges: string[];
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'savings' | 'budgeting' | 'education' | 'engagement';
  iconName: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: {
    current: number;
    target: number;
  };
}

export interface NotificationPreferences {
  budgetAlerts: boolean;
  goalReminders: boolean;
  transactionNotifications: boolean;
  aiInsights: boolean;
  stokvelUpdates: boolean;
  educationalContent: boolean;
  marketingMessages: boolean;
  whatsappNotifications: boolean;
}