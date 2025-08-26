import { useDatabase } from '../contexts/EnhancedDatabaseContext';
import { useAuth } from '../contexts/AuthContext';

interface AIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  type?: 'text' | 'insight' | 'warning' | 'tip' | 'analysis';
  metadata?: {
    category?: string;
    amount?: number;
    confidence?: number;
  };
}

interface FinancialAnalysis {
  spendingTrends: {
    category: string;
    amount: number;
    change: number; // percentage
    insight: string;
  }[];
  budgetStatus: {
    totalSpent: number;
    totalBudget: number;
    categoryBreakdown: { [key: string]: { spent: number; budget: number } };
    recommendations: string[];
  };
  savingsOpportunities: {
    category: string;
    potential: number;
    suggestion: string;
  }[];
  riskAlerts: {
    type: 'overspending' | 'unusual_transaction' | 'budget_exceeded';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }[];
}

export class AIService {
  private static instance: AIService;
  private apiEndpoint = 'https://api.deepseek.com/v1/chat/completions'; // Example endpoint
  private apiKey = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY || 'demo_key';

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async generateResponse(
    message: string,
    context: {
      expenses?: any[];
      user?: any;
      recentTransactions?: any[];
    }
  ): Promise<AIMessage> {
    try {
      // For demo purposes, we'll use rule-based responses
      // In production, this would call the actual AI API
      const response = await this.getRuleBasedResponse(message, context);
      
      return {
        id: `ai_${Date.now()}`,
        content: response.content,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        type: response.type,
        metadata: response.metadata,
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.getErrorResponse();
    }
  }

  private async getRuleBasedResponse(
    message: string,
    context: any
  ): Promise<{ content: string; type: AIMessage['type']; metadata?: any }> {
    const lowerMessage = message.toLowerCase();
    const { expenses = [], user, recentTransactions = [] } = context;

    // Spending analysis queries
    if (lowerMessage.includes('spending') || lowerMessage.includes('analyze')) {
      const analysis = this.analyzeSpending(expenses);
      return {
        content: `📊 **Spending Analysis**\n\nI've analyzed your recent spending patterns:\n\n• **This month**: R${analysis.totalSpent.toFixed(2)}\n• **Top category**: ${analysis.topCategory} (${analysis.topCategoryPercentage}%)\n• **Trend**: ${analysis.trend}\n\n**Insight**: ${analysis.insight}`,
        type: 'analysis',
        metadata: { category: 'spending', amount: analysis.totalSpent }
      };
    }

    // Budget advice
    if (lowerMessage.includes('budget') || lowerMessage.includes('advice')) {
      return {
        content: `💡 **Budget Advice**\n\nBased on your spending patterns, here's my recommendation:\n\n• Set aside 50% for needs (rent, groceries, transport)\n• Allocate 30% for wants (entertainment, dining out)\n• Save 20% for goals and emergencies\n\n**Tip**: Try the envelope method - allocate cash for each category to stay on track!`,
        type: 'tip',
        metadata: { category: 'budgeting' }
      };
    }

    // Savings goals
    if (lowerMessage.includes('save') || lowerMessage.includes('goal')) {
      return {
        content: `🎯 **Savings Strategy**\n\nGreat question! Here's how to boost your savings:\n\n• **Automate**: Set up automatic transfers on payday\n• **Track progress**: Use visual goals to stay motivated\n• **Start small**: Even R50/week adds up to R2,600/year\n• **Cut subscriptions**: Review unused apps and services\n\n**Quick win**: Check if you can reduce one category by 10% this month!`,
        type: 'tip',
        metadata: { category: 'savings' }
      };
    }

    // Debt management
    if (lowerMessage.includes('debt') || lowerMessage.includes('credit')) {
      return {
        content: `⚠️ **Debt Management**\n\nSmart debt strategy:\n\n• **Priority order**: Pay minimums on all debts, then focus extra payments on highest interest rate\n• **Debt snowball**: Alternative - pay smallest debt first for motivation\n• **Avoid new debt**: Use cash or debit until existing debt is cleared\n• **Emergency fund**: Build R1,000 emergency fund first\n\n**Remember**: Every extra payment saves you money on interest!`,
        type: 'warning',
        metadata: { category: 'debt' }
      };
    }

    // Investment basics
    if (lowerMessage.includes('invest') || lowerMessage.includes('crypto')) {
      return {
        content: `📈 **Investment Basics**\n\nBefore investing:\n\n• **Emergency fund**: 3-6 months expenses saved\n• **High-interest debt**: Pay off credit cards first\n• **Start simple**: Consider index funds or ETFs\n• **Crypto**: Only invest what you can afford to lose\n\n**South African options**: Tax-Free Savings Account (TFSA), Unit Trusts, JSE ETFs\n\n*Not financial advice - consult a qualified advisor*`,
        type: 'insight',
        metadata: { category: 'investing' }
      };
    }

    // General financial education
    if (lowerMessage.includes('learn') || lowerMessage.includes('explain')) {
      return {
        content: `🎓 **Financial Education**\n\nHere are key concepts every South African should know:\n\n• **Compound interest**: Your money earning money over time\n• **Credit score**: Affects loan approvals and rates\n• **Tax benefits**: Use TFSA and retirement annuities\n• **Insurance**: Protect your income and assets\n\n**Resources**: Check out the financial literacy modules in the Education tab!`,
        type: 'insight',
        metadata: { category: 'education' }
      };
    }

    // Receipt scanning help
    if (lowerMessage.includes('receipt') || lowerMessage.includes('scan')) {
      return {
        content: `📱 **Receipt Scanning Tips**\n\nGet the best results:\n\n• **Good lighting**: Natural light works best\n• **Flat surface**: Lay receipt flat, no wrinkles\n• **Full receipt**: Include top and bottom\n• **Clear focus**: Wait for camera to focus\n\n**Pro tip**: BlueBot can automatically categorize your expenses and track spending patterns!`,
        type: 'tip',
        metadata: { category: 'receipts' }
      };
    }

    // Stokvel information
    if (lowerMessage.includes('stokvel') || lowerMessage.includes('group')) {
      return {
        content: `👥 **Stokvel Success**\n\nMaking the most of group savings:\n\n• **Clear rules**: Agree on contributions, payouts, and penalties\n• **Regular meetings**: Keep everyone engaged and accountable\n• **Record keeping**: Track all contributions and payments\n• **Emergency fund**: Have group rules for unexpected situations\n\n**Digital advantage**: Use BlueBot to track contributions and send reminders!`,
        type: 'tip',
        metadata: { category: 'stokvel' }
      };
    }

    // Default helpful response
    return {
      content: `🤖 **BlueBot here!**\n\nI'm your AI financial assistant. I can help with:\n\n• 💰 Spending analysis and budgeting\n• 🎯 Savings goals and strategies\n• 📊 Expense categorization\n• 💳 Debt management advice\n• 📈 Basic investment guidance\n• 👥 Stokvel and group savings\n\nTry asking: "Analyze my spending" or "Give me budget advice"`,
      type: 'text',
      metadata: { category: 'general' }
    };
  }

  private analyzeSpending(expenses: any[]) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear;
    });

    const totalSpent = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Category analysis
    const categoryTotals: { [key: string]: number } = {};
    monthlyExpenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const topCategory = Object.keys(categoryTotals).reduce((a, b) => 
      categoryTotals[a] > categoryTotals[b] ? a : b, 'food'
    );
    
    const topCategoryPercentage = totalSpent > 0 
      ? ((categoryTotals[topCategory] / totalSpent) * 100).toFixed(0)
      : '0';

    // Simple trend analysis (comparing to average)
    const avgSpending = totalSpent / Math.max(new Date().getDate(), 1) * 30; // Projected monthly
    const trend = avgSpending > totalSpent ? 'spending less than usual' : 'on track with spending';

    const insight = totalSpent > 5000 
      ? 'Consider reviewing your largest expense categories for potential savings.'
      : 'Your spending looks well-controlled this month!';

    return {
      totalSpent,
      topCategory,
      topCategoryPercentage,
      trend,
      insight,
      categoryTotals
    };
  }

  async analyzeFinancialHealth(context: {
    expenses: any[];
    income?: number;
    goals?: any[];
  }): Promise<FinancialAnalysis> {
    const { expenses, income = 0, goals = [] } = context;
    
    // Analyze spending trends
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentExpenses = expenses.filter(
      expense => new Date(expense.date) >= last30Days
    );

    const categoryTotals: { [key: string]: number } = {};
    recentExpenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const spendingTrends = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      change: Math.random() * 20 - 10, // Mock percentage change
      insight: amount > 1000 
        ? `High spending in ${category} - consider ways to reduce`
        : `${category} spending is within normal range`
    }));

    // Budget analysis
    const totalSpent = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    const budgetStatus = {
      totalSpent,
      totalBudget: income * 0.8, // Assume 80% of income for spending
      categoryBreakdown: Object.fromEntries(
        Object.keys(categoryTotals).map(category => [
          category,
          { spent: categoryTotals[category], budget: income * 0.2 } // Mock budget
        ])
      ),
      recommendations: [
        'Consider setting up automatic savings',
        'Review subscription services for potential savings',
        'Track daily expenses to identify spending leaks'
      ]
    };

    // Savings opportunities
    const savingsOpportunities = Object.entries(categoryTotals)
      .filter(([_, amount]) => amount > 500)
      .map(([category, amount]) => ({
        category,
        potential: amount * 0.1, // 10% reduction potential
        suggestion: `Reduce ${category} spending by 10% to save R${(amount * 0.1).toFixed(2)}/month`
      }));

    // Risk alerts
    const riskAlerts: {
      type: 'overspending' | 'unusual_transaction' | 'budget_exceeded';
      message: string;
      severity: 'low' | 'medium' | 'high';
    }[] = [];
    if (totalSpent > income * 0.9) {
      riskAlerts.push({
        type: 'overspending' as const,
        message: 'You\'re spending more than 90% of your income',
        severity: 'high' as const
      });
    }

    return {
      spendingTrends,
      budgetStatus,
      savingsOpportunities,
      riskAlerts
    };
  }

  private getErrorResponse(): AIMessage {
    return {
      id: `error_${Date.now()}`,
      content: `🤖 Sorry, I'm having trouble processing your request right now. Please try again in a moment, or ask me something else about your finances!`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      type: 'text'
    };
  }

  // Financial education content
  getEducationalContent(topic: string): { title: string; content: string; level: string } {
    const content: { [key: string]: any } = {
      budgeting: {
        title: 'Budgeting Basics',
        content: 'Learn the 50/30/20 rule and how to create a budget that works for you.',
        level: 'beginner'
      },
      investing: {
        title: 'Investment Fundamentals',
        content: 'Understand different investment options available in South Africa.',
        level: 'intermediate'
      },
      crypto: {
        title: 'Cryptocurrency Basics',
        content: 'A beginner\'s guide to digital currencies and blockchain technology.',
        level: 'beginner'
      },
      savings: {
        title: 'Effective Saving Strategies',
        content: 'Build wealth through smart saving techniques and goal setting.',
        level: 'beginner'
      }
    };

    return content[topic] || content.budgeting;
  }
}

export const aiService = AIService.getInstance();
