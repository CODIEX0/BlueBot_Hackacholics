/**
 * BlueBot AI Assistant Service
 * Handles AI-powered financial advice and chat functionality
 */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    userBalance?: number;
    recentExpenses?: Array<{
      amount: number;
      category: string;
      date: string;
    }>;
    financialGoals?: Array<{
      title: string;
      targetAmount: number;
      currentAmount: number;
    }>;
  };
}

interface AIResponse {
  message: string;
  suggestions?: string[];
  actionRequired?: {
    type: 'create_budget' | 'set_goal' | 'track_expense' | 'learn_more';
    data?: any;
  };
}

class BlueBotAIService {
  private apiKey: string = '';
  private baseURL: string = 'https://api.deepseek.com/v1'; // Using DeepSeek as specified
  
  constructor() {
    // In production, load from secure environment variables
    this.apiKey = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY || '';
  }

  /**
   * Send a message to BlueBot AI and get response
   */
  async sendMessage(
    message: string, 
    conversationHistory: ChatMessage[] = [],
    userContext?: ChatMessage['context']
  ): Promise<AIResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(userContext);
      const messages = this.buildMessageHistory(systemPrompt, conversationHistory, message);

      // If no API key available, use mock responses for development
      if (!this.apiKey) {
        return this.getMockResponse(message, userContext);
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          max_tokens: 500,
          temperature: 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage = data.choices[0]?.message?.content || 'Sorry, I couldn\'t process that request.';

      return this.parseAIResponse(aiMessage);
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        message: 'Sorry, I\'m having trouble connecting right now. Please try again later.',
        suggestions: ['Check your internet connection', 'Try a simpler question']
      };
    }
  }

  /**
   * Build system prompt with South African financial context
   */
  private buildSystemPrompt(userContext?: ChatMessage['context']): string {
    const basePrompt = `You are BlueBot, a helpful financial assistant for South African users. You provide practical, actionable financial advice tailored to the South African context.

Key guidelines:
- Use South African terminology (Rand, ZAR, SARB, POPIA, etc.)
- Reference South African financial institutions and services
- Consider local economic conditions and challenges
- Promote financial literacy and responsible spending
- Be empathetic to users who may be unbanked or have limited financial access
- Provide advice in both English and occasionally use local terms
- Focus on practical, achievable financial goals

You help users with:
- Budgeting and expense tracking
- Savings goals and strategies
- Understanding banking and financial products
- Cryptocurrency and digital payments for unbanked users
- Financial education and literacy
- POPIA-compliant privacy guidance

Always be encouraging, supportive, and provide specific, actionable advice.`;

    if (userContext) {
      let contextInfo = '\n\nCurrent user context:';
      
      if (userContext.userBalance !== undefined) {
        contextInfo += `\n- Current balance: R${userContext.userBalance.toFixed(2)}`;
      }
      
      if (userContext.recentExpenses && userContext.recentExpenses.length > 0) {
        contextInfo += '\n- Recent expenses:';
        userContext.recentExpenses.slice(0, 3).forEach(expense => {
          contextInfo += `\n  • R${expense.amount.toFixed(2)} on ${expense.category} (${expense.date})`;
        });
      }
      
      if (userContext.financialGoals && userContext.financialGoals.length > 0) {
        contextInfo += '\n- Financial goals:';
        userContext.financialGoals.slice(0, 2).forEach(goal => {
          const progress = ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1);
          contextInfo += `\n  • ${goal.title}: R${goal.currentAmount.toFixed(2)} / R${goal.targetAmount.toFixed(2)} (${progress}%)`;
        });
      }
      
      return basePrompt + contextInfo;
    }

    return basePrompt;
  }

  /**
   * Build message history for AI context
   */
  private buildMessageHistory(
    systemPrompt: string, 
    history: ChatMessage[], 
    currentMessage: string
  ): Array<{role: string; content: string}> {
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add recent conversation history (last 10 messages)
    const recentHistory = history.slice(-10);
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Add current user message
    messages.push({
      role: 'user',
      content: currentMessage
    });

    return messages;
  }

  /**
   * Parse AI response for actions and suggestions
   */
  private parseAIResponse(response: string): AIResponse {
    const result: AIResponse = {
      message: response
    };

    // Look for action indicators in the response
    if (response.toLowerCase().includes('create a budget') || response.toLowerCase().includes('set up a budget')) {
      result.actionRequired = {
        type: 'create_budget'
      };
    } else if (response.toLowerCase().includes('set a goal') || response.toLowerCase().includes('savings goal')) {
      result.actionRequired = {
        type: 'set_goal'
      };
    } else if (response.toLowerCase().includes('track') && response.toLowerCase().includes('expense')) {
      result.actionRequired = {
        type: 'track_expense'
      };
    } else if (response.toLowerCase().includes('learn more') || response.toLowerCase().includes('educational')) {
      result.actionRequired = {
        type: 'learn_more'
      };
    }

    // Extract suggestions if present
    const suggestionPatterns = [
      /(?:I suggest|I recommend|You could|Try to)([^.!?]+)/gi,
      /(?:Consider|Maybe|Perhaps)([^.!?]+)/gi
    ];

    const suggestions: string[] = [];
    suggestionPatterns.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches) {
        matches.forEach(match => {
          suggestions.push(match.trim());
        });
      }
    });

    if (suggestions.length > 0) {
      result.suggestions = suggestions.slice(0, 3); // Limit to 3 suggestions
    }

    return result;
  }

  /**
   * Mock responses for development/offline mode
   */
  private getMockResponse(message: string, userContext?: ChatMessage['context']): AIResponse {
    const lowerMessage = message.toLowerCase();

    // Budget-related queries
    if (lowerMessage.includes('budget') || lowerMessage.includes('spending')) {
      return {
        message: `Great question about budgeting! Based on South African financial best practices, I recommend the 50/30/20 rule: 50% for needs (rent, groceries), 30% for wants (entertainment), and 20% for savings. Given the current economic climate in SA, focus on building an emergency fund first - even R50 per month helps!`,
        suggestions: [
          'Track your expenses for a week to understand spending patterns',
          'Set up automatic transfers to savings on payday',
          'Use cash for discretionary spending to avoid overspending'
        ],
        actionRequired: {
          type: 'create_budget'
        }
      };
    }

    // Savings-related queries
    if (lowerMessage.includes('save') || lowerMessage.includes('goal')) {
      return {
        message: `Savings are crucial in South Africa's economic environment! Start small - even R20 per week adds up to over R1,000 per year. Consider using a 32-day notice account for better interest rates, or look into unit trust investments for long-term growth. Tax-free savings accounts (TFSA) are excellent for building wealth.`,
        suggestions: [
          'Open a separate savings account to avoid temptation',
          'Set up a debit order on payday',
          'Consider investing in the JSE through low-cost ETFs'
        ],
        actionRequired: {
          type: 'set_goal'
        }
      };
    }

    // Expense tracking queries
    if (lowerMessage.includes('track') || lowerMessage.includes('expense')) {
      return {
        message: `Expense tracking is the foundation of good financial health! In South Africa, with the high cost of living, every Rand counts. I recommend tracking everything for at least a month to understand your spending patterns. Use the envelope method for categories like groceries and transport.`,
        suggestions: [
          'Take photos of all receipts immediately',
          'Set weekly spending limits for each category',
          'Review your bank statements monthly'
        ],
        actionRequired: {
          type: 'track_expense'
        }
      };
    }

    // General financial advice
    if (lowerMessage.includes('help') || lowerMessage.includes('advice')) {
      return {
        message: `I'm here to help you navigate your financial journey in South Africa! Whether you're looking to budget better, save for goals, or understand investment options, I can provide guidance tailored to our local context. What specific area would you like to focus on?`,
        suggestions: [
          'Create a monthly budget plan',
          'Set up emergency savings',
          'Learn about investment options in SA'
        ]
      };
    }

    // Cryptocurrency/unbanked queries
    if (lowerMessage.includes('crypto') || lowerMessage.includes('unbanked') || lowerMessage.includes('digital')) {
      return {
        message: `Digital payments and cryptocurrency can be great alternatives for unbanked South Africans! Consider starting with well-regulated platforms like Luno or VALR for buying Bitcoin or Ethereum. For daily transactions, services like FNB eWallet or Capitec Global One offer bank-like features without traditional banking requirements.`,
        suggestions: [
          'Start with small amounts to learn',
          'Understand the tax implications of crypto in SA',
          'Keep your private keys secure'
        ]
      };
    }

    // Default response
    return {
      message: `Thanks for reaching out! I'm BlueBot, your South African financial assistant. I can help you with budgeting, saving money, understanding local banking options, and building better financial habits. What would you like to know about managing your finances?`,
      suggestions: [
        'Ask me about creating a budget',
        'Learn about saving strategies',
        'Get help with expense tracking'
      ]
    };
  }

  /**
   * Get financial insights based on user data
   */
  async getFinancialInsights(userContext: ChatMessage['context']): Promise<AIResponse> {
    if (!userContext?.recentExpenses || userContext.recentExpenses.length === 0) {
      return {
        message: `I notice you haven't tracked many expenses yet. Let's start building that habit! Tracking expenses is the first step to financial awareness and better decision-making.`,
        actionRequired: {
          type: 'track_expense'
        }
      };
    }

    // Analyze spending patterns
    const totalSpent = userContext.recentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const categoryTotals: Record<string, number> = {};
    
    userContext.recentExpenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const topCategory = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)[0];

    let insight = `Based on your recent expenses of R${totalSpent.toFixed(2)}, I can see that ${topCategory[0]} is your biggest spending category at R${topCategory[1].toFixed(2)}. `;

    // Provide context-specific advice
    if (topCategory[0].toLowerCase().includes('groceries') || topCategory[0].toLowerCase().includes('food')) {
      insight += `Food costs are rising in SA, but you can save by meal planning, buying in bulk, and shopping at multiple stores for the best deals.`;
    } else if (topCategory[0].toLowerCase().includes('transport') || topCategory[0].toLowerCase().includes('fuel')) {
      insight += `Transport costs are significant in SA. Consider carpooling, using public transport where safe, or combining trips to save on fuel.`;
    } else {
      insight += `This is a significant portion of your spending. Let's see if we can find ways to optimize this category.`;
    }

    return {
      message: insight,
      suggestions: [
        `Set a monthly limit for ${topCategory[0]}`,
        'Track expenses daily to stay aware',
        'Look for ways to reduce costs in your top spending category'
      ]
    };
  }

  /**
   * Generate personalized financial tips
   */
  getPersonalizedTips(userContext?: ChatMessage['context']): string[] {
    const tips = [
      'Build an emergency fund that covers 3-6 months of expenses',
      'Take advantage of South Africa\'s tax-free savings account (R36,000 annual limit)',
      'Consider investing in JSE-listed ETFs for long-term growth',
      'Use the 50/30/20 budgeting rule as a starting point',
      'Automate your savings with debit orders on payday',
      'Review your insurance needs annually',
      'Pay off high-interest debt (like credit cards) first',
      'Learn about your rights under the National Credit Act',
      'Consider retirement annuities for tax benefits',
      'Use cash for discretionary spending to avoid overspending'
    ];

    // Shuffle and return 3 random tips
    return tips.sort(() => Math.random() - 0.5).slice(0, 3);
  }
}

export default new BlueBotAIService();
export type { ChatMessage, AIResponse };
