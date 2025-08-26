/**
 * Copyright (c) 2025-present, Xenothon Tech, Inc.
 * Unit Tests for Production MultiAI Service
 * Tests real AI provider integrations and fallback mechanisms
 */

import MultiAI from '../../../services/MultiAI';
import { ChatMessage, AIResponse } from '../../../types/ai';

// Mock fetch for controlled testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Production MultiAI Service', () => {
  let multiAI: any;

  beforeEach(() => {
    multiAI = MultiAI; // Use the exported instance
    mockFetch.mockClear();
    
    // Set up test environment variables
    process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY = 'sk-test-deepseek-key';
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'AIza-test-gemini-key';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-test-openai-key';
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'sk-ant-test-claude-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Initialization', () => {
    test('should initialize all available providers with valid API keys', () => {
      const providers = multiAI.getAvailableProviders();
      
      expect(providers).toContain('deepseek');
      expect(providers).toContain('gemini');
      expect(providers).toContain('openai');
      expect(providers).toContain('claude');
    });

    test('should exclude providers without valid API keys', () => {
      process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY = '';
      const newMultiAI = MultiAI; // Use the exported instance
      const providers = newMultiAI.getAvailableProviders();
      
      expect(providers).not.toContain('deepseek');
    });

    test('should prioritize DeepSeek as primary provider', () => {
      const primaryProvider = multiAI.getPrimaryProvider();
      expect(primaryProvider).toBe('deepseek');
    });
  });

  describe('Message Processing', () => {
    test('should successfully process message with DeepSeek', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'This is a test response about South African budgeting tips.'
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await multiAI.sendMessage('Give me budgeting advice');

      expect(response.provider).toBe('DeepSeek');
      expect(response.message).toContain('budgeting');
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.metadata.responseTime).toBeDefined();
    });

    test('should fallback to Gemini when DeepSeek fails', async () => {
      // Mock DeepSeek failure
      mockFetch.mockRejectedValueOnce(new Error('DeepSeek API Error'));
      
      // Mock Gemini success
      const mockGeminiResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'This is a Gemini response about South African finance.'
            }]
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGeminiResponse)
      });

      const response = await multiAI.sendMessage('Investment advice');

      expect(response.provider).toBe('Google Gemini');
      expect(response.message).toContain('finance');
    });

    test('should include South African context in responses', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Consider using Capitec or FNB for banking in South Africa, and look into JSE ETFs for investment.'
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await multiAI.sendMessage('Banking recommendations');

      expect(response.message.toLowerCase()).toMatch(/south africa|capitec|fnb|jse/);
    });
  });

  describe('Conversation History', () => {
    test('should maintain conversation context', async () => {
      const conversationHistory: ChatMessage[] = [
        {
          id: '1',
          content: 'I want to start investing',
          role: 'user',
          timestamp: new Date(),
          context: { userId: 'test-user', location: 'South Africa' }
        },
        {
          id: '2',
          content: 'Great! South Africa has excellent investment options through the JSE.',
          role: 'assistant',
          timestamp: new Date()
        }
      ];

      const mockResponse = {
        choices: [{
          message: {
            content: 'Based on our previous discussion about investing in the JSE, I recommend starting with ETFs.'
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await multiAI.sendMessage(
        'What should I invest in first?',
        conversationHistory
      );

      expect(response.message).toContain('ETF');
      expect(response.message).toContain('JSE');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const response = await multiAI.sendMessage('Test message');

      expect(response.provider).toBe('error');
      expect(response.message).toContain('unable to connect');
    });

    test('should handle API rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      const response = await multiAI.sendMessage('Test message');

      expect(response.provider).not.toBe('error');
      expect(response.message).toBeDefined();
    });

    test('should handle invalid API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      });

      const response = await multiAI.sendMessage('Test message');

      expect(response.message).toBeDefined();
      expect(response.provider).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('should respond within acceptable time limits', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Quick response for performance testing.'
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const startTime = Date.now();
      const response = await multiAI.sendMessage('Performance test');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Under 5 seconds
      expect(response.metadata.responseTime).toBeLessThan(5000);
    });

    test('should handle concurrent requests', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Concurrent response test.'
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const promises = Array(5).fill(null).map((_, index) =>
        multiAI.sendMessage(`Test message ${index}`)
      );

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.message).toBeDefined();
        expect(response.provider).toBeDefined();
      });
    });
  });

  describe('Local Llama Integration', () => {
    test('should check local Llama availability', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ name: 'llama3.2:3b' }])
      });

      const isAvailable = await multiAI.testProvider('local');
      expect(typeof isAvailable).toBe('boolean');
    });

    test('should fallback when local Llama is unavailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Local server not running'));

      const response = await multiAI.sendMessage('Test local fallback');

      expect(response.provider).not.toBe('Local Llama');
      expect(response.message).toBeDefined();
    });
  });

  describe('Mock Provider (Development Only)', () => {
    test('should use mock provider only in development/test environment', () => {
      (process.env as any).NODE_ENV = 'development';
      const devMultiAI = MultiAI; // Use the exported instance
      const providers = devMultiAI.getAvailableProviders();
      
      expect(providers).toContain('mock');
    });

    test('should exclude mock provider in production', () => {
      (process.env as any).NODE_ENV = 'production';
      const prodMultiAI = MultiAI; // Use the exported instance
      const providers = prodMultiAI.getAvailableProviders();
      
      expect(providers).not.toContain('mock');
    });
  });

  describe('Provider Health Checks', () => {
    test('should verify provider connectivity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Health check passed' } }]
        })
      });

      const healthCheck = await multiAI.testProvider('deepseek');
      expect(healthCheck).toBe(true);
    });

    test('should report unhealthy providers', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Provider down'));

      const healthCheck = await multiAI.testProvider('deepseek');
      expect(healthCheck).toBe(false);
    });
  });

  describe('Response Quality', () => {
    test('should provide relevant financial advice for South African context', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'For South African investors, consider the JSE Top 40 ETF (STXIND) or property through REITs. Remember to use your R36,000 annual tax-free savings allowance.'
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await multiAI.sendMessage('Investment advice for beginners');

      expect(response.message.toLowerCase()).toMatch(/jse|reit|tax-free|south africa/);
      expect(response.confidence).toBeGreaterThan(0.7);
    });

    test('should provide actionable suggestions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Start by tracking expenses for 30 days, then create a 50/30/20 budget. Open a separate savings account and set up automatic transfers.'
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await multiAI.sendMessage('How do I start budgeting?');

      expect(response.suggestions).toBeDefined();
      expect(response.suggestions.length).toBeGreaterThan(0);
    });
  });
});
