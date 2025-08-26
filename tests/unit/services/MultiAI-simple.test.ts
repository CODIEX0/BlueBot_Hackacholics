/**
 * Simple Unit Tests for MultiAI Service
 */

import MultiAI from '../../../services/MultiAI';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      choices: [{
        message: {
          content: 'Test response'
        }
      }]
    })
  })
) as jest.Mock;

describe('MultiAI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(MultiAI).toBeDefined();
  });

  it('should have required methods', () => {
    expect(typeof MultiAI.sendMessage).toBe('function');
    expect(typeof MultiAI.getAvailableProviders).toBe('function');
    expect(typeof MultiAI.getCurrentProvider).toBe('function');
  });

  it('should return available providers', () => {
    const providers = MultiAI.getAvailableProviders();
    expect(Array.isArray(providers)).toBe(true);
  });

  it('should have a current provider', () => {
    const provider = MultiAI.getCurrentProvider();
    expect(typeof provider).toBe('string');
    expect(provider.length).toBeGreaterThan(0);
  });

  it('should send messages', async () => {
    const result = await MultiAI.sendMessage('Hello');
    expect(result).toBeDefined();
    expect(typeof result.message).toBe('string');
  });
});
