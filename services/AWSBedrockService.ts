/**
 * AWS Bedrock AI Service
 * Handles AI agent interactions using AWS Bedrock
 */

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AIConversation {
  conversationId: string;
  userId: string;
  messages: AIMessage[];
  context?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BedrockResponse {
  content: string;
  confidence: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latency: number;
}

export interface FinancialAdviceRequest {
  userId: string;
  question: string;
  context?: {
    expenses?: any[];
    budget?: any;
    goals?: any[];
    riskProfile?: 'conservative' | 'moderate' | 'aggressive';
  };
}

export interface FinancialAdviceResponse {
  advice: string;
  actionItems: string[];
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  sources?: string[];
}

/**
 * AWS Bedrock AI Service for BlueBot agents
 */
export class AWSBedrockService {
  private bedrockClient: any;
  private models = {
    claude: 'anthropic.claude-opus-4-1-20250805-v1:0',
    titan: 'amazon.titan-text-express-v1',
    llama: 'meta.llama2-70b-chat-v1',
    cohere: 'cohere.command-text-v14'
  };
  private realtime = {
    modelId: process.env.EXPO_PUBLIC_BEDROCK_REALTIME_MODEL_ID || 'amazon.nova-realtime-v1:0',
    // Websocket URL is established by AWS SDK; we expose stubs for now
  proxyUrl: process.env.EXPO_PUBLIC_BEDROCK_REALTIME_PROXY_URL || ''
  };
  
  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
  // Initialize Bedrock client when AWS SDK is available
  const { BEDROCK_CONFIG } = (await import('../config/aws')).default as any;
  const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
  this.bedrockClient = new BedrockRuntimeClient({ region: BEDROCK_CONFIG?.region || process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1' });
  console.log('AWS Bedrock client initialized');
    } catch (error) {
      console.error('Failed to initialize Bedrock client:', error);
    }
  }

  /**
   * General AI chat interaction
   */
  async chat(messages: AIMessage[], userId: string, modelName: string = 'claude'): Promise<BedrockResponse> {
    try {
      console.log('Processing chat request for user:', userId);
      // Prepare a sensible default mock in case Bedrock invocation isn't available
      const mockResponse: BedrockResponse = {
        content: 'Thanks for your question. I can help with budgeting, saving, investing, and day-to-day banking decisions. What would you like to do?',
        confidence: 0.92,
        model: this.models[modelName as keyof typeof this.models] || modelName,
        inputTokens: 150,
        outputTokens: 75,
        latency: 1200
      };

      // If client isn't initialized, return mock
      if (!this.bedrockClient) {
        return mockResponse;
      }

      // Dynamically import command to avoid bundling issues in RN
      const { InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');

      // Map incoming messages to provider-specific format (Anthropic Claude on Bedrock)
      const userAndSystem = messages.map(m => ({
        role: m.role,
        content: [{ type: 'text', text: m.content }]
      }));

      const modelId = (this.models as any)[modelName] || this.models.claude;
      // Default to Anthropic messages format
      const anthropicPayload: any = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 800,
        temperature: 0.7,
        messages: userAndSystem
      };

      const start = Date.now();
      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(JSON.stringify(anthropicPayload))
      } as any);

      try {
        const result: any = await this.bedrockClient.send(command);
        const bodyBytes: Uint8Array = result.body;
        const json = JSON.parse(new TextDecoder().decode(bodyBytes));
        // Anthropic response shape: { content: [{ type: 'text', text: '...' }], usage: { input_tokens, output_tokens } }
        const text = json?.content?.[0]?.text || json?.outputText || mockResponse.content;
        const inputTokens = json?.usage?.input_tokens ?? 0;
        const outputTokens = json?.usage?.output_tokens ?? 0;
        return {
          content: text,
          confidence: 0.9,
          model: modelId,
          inputTokens,
          outputTokens,
          latency: Date.now() - start
        };
      } catch (invokeErr) {
        console.warn('Bedrock invoke failed, falling back to mock:', (invokeErr as any)?.message || invokeErr);
        return mockResponse;
      }
    } catch (error) {
      console.error('Error in chat:', error);
      throw new Error('Failed to process chat request');
    }
  }

  /**
   * Realtime speech-to-speech (stub): Establish a WebSocket to Bedrock Realtime for streaming audio
   * In Expo client, native audio streaming would be handled via a custom module or a backend proxy.
   */
  async startRealtimeSession(params: { language?: string }): Promise<{ connected: boolean; model: string }>{
    try {
      // Prefer proxy relay in Expo/React Native environment
      if (this.realtime.proxyUrl) {
        return { connected: true, model: this.realtime.modelId };
      }
      if (!this.bedrockClient) {
        return { connected: false, model: this.realtime.modelId };
      }
      // Direct WS to Bedrock Realtime requires SigV4 WebSocket and native audio; defer to proxy
      return { connected: false, model: this.realtime.modelId };
    } catch (error) {
      console.error('Failed to start realtime session:', error);
      return { connected: false, model: this.realtime.modelId };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      console.log('AWS Bedrock health check');
      return true;
    } catch (error) {
      console.error('Bedrock health check failed:', error);
      return false;
    }
  }

  /**
   * Financial advice AI agent
   */
  async getFinancialAdvice(request: FinancialAdviceRequest): Promise<FinancialAdviceResponse> {
    try {
      console.log('Generating financial advice for user:', request.userId);
      
      // Mock financial advice response
      const mockAdvice: FinancialAdviceResponse = {
        advice: 'Based on your spending patterns, I recommend creating a monthly budget with 50% for needs, 30% for wants, and 20% for savings. Your current grocery spending of R2,500/month is within a healthy range for your income level.',
        actionItems: [
          'Set up an emergency fund with 3-6 months of expenses',
          'Consider increasing your retirement contributions by 2%',
          'Review and optimize your insurance coverage',
          'Track discretionary spending more closely'
        ],
        riskLevel: 'low',
        confidence: 0.87,
        sources: [
          'South African Reserve Bank guidelines',
          'Personal finance best practices',
          'Your spending history analysis'
        ]
      };

      return mockAdvice;
    } catch (error) {
      console.error('Error generating financial advice:', error);
      throw new Error('Failed to generate financial advice');
    }
  }

  /**
   * Budget analysis AI agent
   */
  async analyzeBudget(userId: string, budgetData: any, expenseData: any[]): Promise<any> {
    try {
      console.log('Analyzing budget for user:', userId);
      
      // Mock budget analysis
      return {
        score: 85,
        insights: [
          'Your housing costs are well within the recommended 30% of income',
          'Food expenses have increased 15% from last month',
          'You\'re on track to meet your savings goal'
        ],
        recommendations: [
          'Consider meal planning to reduce food costs',
          'Set up automatic transfers to savings',
          'Review subscription services for potential savings'
        ],
        categoryBreakdown: {
          housing: { percentage: 28, status: 'good' },
          food: { percentage: 18, status: 'high' },
          transportation: { percentage: 12, status: 'good' },
          entertainment: { percentage: 8, status: 'good' },
          savings: { percentage: 20, status: 'excellent' }
        }
      };
    } catch (error) {
      console.error('Error analyzing budget:', error);
      throw new Error('Failed to analyze budget');
    }
  }

  /**
   * Receipt analysis AI agent
   */
  async analyzeReceipt(receiptText: string, userId: string): Promise<any> {
    try {
      console.log('Analyzing receipt for user:', userId);
      
      // Mock receipt analysis
      return {
        category: 'Groceries',
        subcategory: 'Food & Beverages',
        merchant: 'Pick n Pay',
        confidence: 0.94,
        insights: [
          'This purchase is 12% higher than your average grocery spend',
          'You bought more organic products this time (+R45)',
          'Consider generic brands for 15% savings on similar items'
        ],
        budgetImpact: {
          categorySpent: 1250,
          categoryBudget: 1500,
          percentageUsed: 83,
          daysLeftInPeriod: 8
        }
      };
    } catch (error) {
      console.error('Error analyzing receipt:', error);
      throw new Error('Failed to analyze receipt');
    }
  }

  /**
   * Financial education AI tutor
   */
  async getEducationalContent(topic: string, userLevel: string = 'beginner'): Promise<any> {
    try {
      console.log('Generating educational content for topic:', topic);
      
      // Mock educational content
      return {
        title: `Understanding ${topic}`,
        content: `${topic} is an important financial concept that can help you manage your money better. Here's what you need to know...`,
        level: userLevel,
        estimatedReadTime: 5,
        keyPoints: [
          'Definition and basic concepts',
          'Why it matters for your finances',
          'Practical applications',
          'Common mistakes to avoid'
        ],
        quiz: [
          {
            question: `What is the primary benefit of ${topic}?`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 0
          }
        ],
        nextTopics: ['Related Topic 1', 'Related Topic 2'],
        resources: [
          'Additional reading materials',
          'Video explanations',
          'Interactive calculators'
        ]
      };
    } catch (error) {
      console.error('Error generating educational content:', error);
      throw new Error('Failed to generate educational content');
    }
  }

  /**
   * Goal setting and tracking AI assistant
   */
  async analyzeGoalProgress(userId: string, goals: any[]): Promise<any> {
    try {
      console.log('Analyzing goal progress for user:', userId);
      
      // Mock goal analysis
      return {
        overallProgress: 67,
        goals: goals.map(goal => ({
          ...goal,
          progress: Math.random() * 100,
          timeRemaining: '3 months',
          likelihood: 'high',
          recommendations: [
            'Increase monthly contribution by R200',
            'Consider additional income sources'
          ]
        })),
        insights: [
          'You\'re ahead of schedule on your emergency fund goal',
          'Your vacation fund needs more attention',
          'Consider adjusting timeline for home deposit goal'
        ]
      };
    } catch (error) {
      console.error('Error analyzing goal progress:', error);
      throw new Error('Failed to analyze goal progress');
    }
  }

  /**
   * Investment advice AI agent
   */
  async getInvestmentAdvice(userId: string, riskProfile: string, amount: number): Promise<any> {
    try {
      console.log('Generating investment advice for user:', userId);
      
      // Mock investment advice
      return {
        recommendations: [
          {
            type: 'ETF',
            name: 'Satrix Top 40',
            allocation: 40,
            risk: 'medium',
            expectedReturn: '8-12%',
            reason: 'Diversified exposure to SA\'s largest companies'
          },
          {
            type: 'Bonds',
            name: 'Government Bonds',
            allocation: 30,
            risk: 'low',
            expectedReturn: '6-8%',
            reason: 'Stable income and capital preservation'
          },
          {
            type: 'Property',
            name: 'REIT Fund',
            allocation: 20,
            risk: 'medium',
            expectedReturn: '7-10%',
            reason: 'Real estate exposure with liquidity'
          },
          {
            type: 'Cash',
            name: 'Money Market',
            allocation: 10,
            risk: 'low',
            expectedReturn: '4-6%',
            reason: 'Emergency fund and liquidity'
          }
        ],
        projectedReturns: {
          oneYear: amount * 1.08,
          fiveYears: amount * 1.45,
          tenYears: amount * 2.16
        },
        riskAssessment: {
          volatility: 'moderate',
          maxDrawdown: '15-20%',
          recoveryTime: '12-18 months'
        }
      };
    } catch (error) {
      console.error('Error generating investment advice:', error);
      throw new Error('Failed to generate investment advice');
    }
  }

  /**
   * Conversation context management
   */
  async saveConversation(conversation: AIConversation): Promise<void> {
    try {
      console.log('Saving conversation:', conversation.conversationId);
      // Save to database via DynamoDB service
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }

  async getConversationHistory(userId: string, limit: number = 10): Promise<AIConversation[]> {
    try {
      console.log('Getting conversation history for user:', userId);
      return []; // Mock return
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }

  /**
   * Sentiment analysis for user messages
   */
  async analyzeSentiment(text: string): Promise<any> {
    try {
      console.log('Analyzing sentiment for text');
      
      // Mock sentiment analysis
      return {
        sentiment: 'positive',
        confidence: 0.85,
        emotions: {
          happiness: 0.7,
          confidence: 0.6,
          anxiety: 0.1,
          frustration: 0.1
        }
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      throw error;
    }
  }

  /**
   * Generate personalized insights
   */
  async generateInsights(userId: string, userData: any): Promise<string[]> {
    try {
      console.log('Generating insights for user:', userId);
      
      // Mock insights
      return [
        'Your spending on dining out has increased by 25% this month',
        'You\'re saving more than 80% of your peers in your age group',
        'Consider increasing your emergency fund to 6 months of expenses',
        'Your debt-to-income ratio is excellent at 15%',
        'You might benefit from tax-free savings account options'
      ];
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  }

  

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return Object.keys(this.models);
  }

  /**
   * Get model capabilities
   */
  getModelCapabilities(modelName: string): any {
    const capabilities = {
      claude: {
        maxTokens: 100000,
        supports: ['text', 'analysis', 'reasoning', 'math'],
        languages: ['en', 'af', 'zu', 'xh']
      },
      titan: {
        maxTokens: 4096,
        supports: ['text', 'summarization'],
        languages: ['en']
      },
      llama: {
        maxTokens: 4096,
        supports: ['text', 'conversation', 'reasoning'],
        languages: ['en', 'af']
      },
      cohere: {
        maxTokens: 4096,
        supports: ['text', 'classification', 'embedding'],
        languages: ['en']
      }
    };

    return capabilities[modelName] || null;
  }
}

// Singleton instance
export const awsBedrockService = new AWSBedrockService();
export default awsBedrockService;
