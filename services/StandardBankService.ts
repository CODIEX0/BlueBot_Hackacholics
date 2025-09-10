/**
 * Standard Bank Service
 * Core service for Standard Bank customer features and financial products
 */

export interface StandardBankProduct {
  id: string;
  name: string;
  type: 'savings' | 'checking' | 'credit' | 'investment' | 'loan';
  description: string;
  features: string[];
  eligibility: string[];
  interestRate?: string;
  fees?: string[];
  minimumBalance?: number;
}

export interface StandardBankCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountNumber: string;
  branch: string;
  accountType: string;
  balance: number;
  creditScore?: number;
  isActive: boolean;
}

export interface FinancialGoal {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: 'savings' | 'investment' | 'debt_repayment' | 'emergency_fund';
  priority: 'high' | 'medium' | 'low';
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  color: string;
  icon: string;
}

export class StandardBankService {
  private static instance: StandardBankService;
  private products: StandardBankProduct[] = [];
  private customer: StandardBankCustomer | null = null;

  private constructor() {
    this.initializeProducts();
  }

  public static getInstance(): StandardBankService {
    if (!StandardBankService.instance) {
      StandardBankService.instance = new StandardBankService();
    }
    return StandardBankService.instance;
  }

  private initializeProducts(): void {
    this.products = [
      {
        id: 'sb_savings_classic',
        name: 'MyMo Classic Savings',
        type: 'savings',
        description: 'A flexible savings account with competitive interest rates',
        features: [
          'No monthly fees',
          'Competitive interest rates',
          'Online and mobile banking',
          'Free ATM access at Standard Bank ATMs'
        ],
        eligibility: [
          'South African citizen or permanent resident',
          'Minimum age 18 years',
          'Valid ID document'
        ],
        interestRate: '4.5% p.a.',
        minimumBalance: 0
      },
      {
        id: 'sb_checking_elite',
        name: 'Elite Cheque Account',
        type: 'checking',
        description: 'Premium banking with exclusive benefits',
        features: [
          'Unlimited transactions',
          'Premium customer service',
          'Travel insurance',
          'Concierge services'
        ],
        eligibility: [
          'Minimum monthly income R30,000',
          'Good credit history',
          'Valid ID and proof of income'
        ],
        fees: ['R299 monthly fee'],
        minimumBalance: 25000
      },
      {
        id: 'sb_credit_classic',
        name: 'Standard Bank Credit Card',
        type: 'credit',
        description: 'Flexible credit card for everyday purchases',
        features: [
          'Contactless payments',
          'Reward points',
          'Purchase protection',
          'Emergency cash advances'
        ],
        eligibility: [
          'Minimum monthly income R5,000',
          'Good credit record',
          'Existing Standard Bank customer'
        ],
        interestRate: '22.5% p.a.'
      }
    ];
  }

  // Product Methods
  public getProducts(): StandardBankProduct[] {
    return this.products;
  }

  public getProductsByType(type: StandardBankProduct['type']): StandardBankProduct[] {
    return this.products.filter(product => product.type === type);
  }

  public getProductById(id: string): StandardBankProduct | undefined {
    return this.products.find(product => product.id === id);
  }

  // Customer Methods
  public setCustomer(customer: StandardBankCustomer): void {
    this.customer = customer;
  }

  public getCustomer(): StandardBankCustomer | null {
    return this.customer;
  }

  // Demo customer for testing
  public getDemoCustomer(): StandardBankCustomer {
    return {
      id: 'demo_001',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+27 11 123 4567',
      accountNumber: '12345678901',
      branch: 'Sandton City',
      accountType: 'Elite Cheque Account',
      balance: 45750.00,
      creditScore: 720,
      isActive: true
    };
  }

  // Financial Planning Methods
  public getDefaultBudgetCategories(): BudgetCategory[] {
    return [
      {
        id: 'housing',
        name: 'Housing',
        allocated: 12000,
        spent: 11800,
        remaining: 200,
        color: '#3B82F6',
        icon: 'home'
      },
      {
        id: 'transportation',
        name: 'Transportation',
        allocated: 3500,
        spent: 2890,
        remaining: 610,
        color: '#10B981',
        icon: 'car'
      },
      {
        id: 'food',
        name: 'Food & Dining',
        allocated: 4000,
        spent: 3245,
        remaining: 755,
        color: '#F59E0B',
        icon: 'restaurant'
      },
      {
        id: 'entertainment',
        name: 'Entertainment',
        allocated: 2000,
        spent: 1450,
        remaining: 550,
        color: '#EF4444',
        icon: 'game-controller'
      },
      {
        id: 'savings',
        name: 'Savings',
        allocated: 5000,
        spent: 5000,
        remaining: 0,
        color: '#8B5CF6',
        icon: 'piggy-bank'
      }
    ];
  }

  public getDefaultFinancialGoals(): FinancialGoal[] {
    return [
      {
        id: 'emergency_fund',
        title: 'Emergency Fund',
        description: 'Build a 6-month emergency fund for unexpected expenses',
        targetAmount: 50000,
        currentAmount: 15000,
        targetDate: '2025-12-31',
        category: 'emergency_fund',
        priority: 'high'
      },
      {
        id: 'vacation_savings',
        title: 'Holiday Trip',
        description: 'Save for a family vacation to Cape Town',
        targetAmount: 25000,
        currentAmount: 8500,
        targetDate: '2025-06-30',
        category: 'savings',
        priority: 'medium'
      },
      {
        id: 'home_deposit',
        title: 'Home Deposit',
        description: 'Save for a house deposit',
        targetAmount: 200000,
        currentAmount: 45000,
        targetDate: '2027-01-01',
        category: 'investment',
        priority: 'high'
      }
    ];
  }

  // Financial Insights
  public generateFinancialInsights(expenses: any[]): string[] {
    const insights: string[] = [];
    
    // Calculate total spending
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    if (totalSpent > 20000) {
      insights.push("Your spending this month is higher than recommended. Consider reviewing your budget.");
    }
    
    // Category analysis
    const categories = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});
    
    const foodSpending = categories['Food'] || 0;
    if (foodSpending > 4000) {
      insights.push("Your food spending is above average. Consider meal planning to reduce costs.");
    }
    
    const entertainmentSpending = categories['Entertainment'] || 0;
    if (entertainmentSpending > 2500) {
      insights.push("Entertainment expenses are high. Look for free or low-cost activities.");
    }
    
    // Positive insights
    if (totalSpent < 15000) {
      insights.push("Great job! Your spending is well within budget this month.");
    }
    
    if (insights.length === 0) {
      insights.push("Your spending patterns look healthy. Keep up the good work!");
    }
    
    return insights;
  }

  // Product Recommendations
  public getProductRecommendations(customer: StandardBankCustomer): StandardBankProduct[] {
    const recommendations: StandardBankProduct[] = [];
    
    // High balance - recommend investment products
    if (customer.balance > 50000) {
      const investment = this.getProductsByType('investment')[0];
      if (investment) recommendations.push(investment);
    }
    
    // Good credit score - recommend credit products
    if (customer.creditScore && customer.creditScore > 700) {
      const credit = this.getProductsByType('credit')[0];
      if (credit) recommendations.push(credit);
    }
    
    // Always recommend savings
    const savings = this.getProductsByType('savings')[0];
    if (savings) recommendations.push(savings);
    
    return recommendations;
  }

  // Web search helpers (best-effort client-side)
  async searchWeb(query: string) {
    const mod = await import('./StandardBankWebSearch');
    return mod.searchStandardBank(query);
  }

  async fetchRates() {
    const mod = await import('./StandardBankWebSearch');
    return mod.getStandardBankRates();
  }
}

export const standardBankService = StandardBankService.getInstance();
