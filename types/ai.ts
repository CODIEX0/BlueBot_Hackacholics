/**
 * AI Service Types for BlueBot
 */

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  context?: {
    userId?: string;
    location?: string;
    language?: string;
    financialProfile?: {
      income?: number;
      expenses?: number;
      goals?: string[];
    };
    sessionContext?: string;
  };
  metadata?: {
    provider?: string;
    confidence?: number;
    processingTime?: number;
  };
}

export interface AIResponse {
  message: string;
  suggestions?: string[];
  actionRequired?: {
    type: 'create_budget' | 'set_goal' | 'track_expense' | 'educate' | 'learn_more';
    data?: any;
  };
  provider: string;
  confidence: number;
  metadata: {
    responseTime: number;
    tokensUsed?: number;
    cost?: number;
    cached?: boolean;
  };
}

export interface AIProvider {
  name: string;
  apiKey?: string;
  baseURL: string;
  model: string;
  available: boolean;
  priority?: number;
  costPer1kTokens?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface FinancialContext {
  userId: string;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  savingsGoals?: Array<{
    id: string;
    title: string;
    target: number;
    current: number;
    deadline: string;
  }>;
  recentTransactions?: Array<{
    amount: number;
    category: string;
    date: string;
    merchant?: string;
  }>;
  location: 'South Africa' | string;
  language: 'en' | 'af' | 'zu' | 'xh';
  bankingStatus: 'banked' | 'underbanked' | 'unbanked';
}

export interface ConversationState {
  sessionId: string;
  messages: ChatMessage[];
  context: FinancialContext;
  activeTopics: string[];
  lastInteraction: Date;
}

export interface AIServiceConfig {
  primaryProvider: string;
  fallbackProviders: string[];
  maxRetries: number;
  timeout: number;
  enableCaching: boolean;
  cacheExpiry: number;
  enableLocalFallback: boolean;
  localModelPath?: string;
}

export interface AIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  providerUsage: Record<string, number>;
  errorRates: Record<string, number>;
  costTracking: {
    totalCost: number;
    costByProvider: Record<string, number>;
  };
}
