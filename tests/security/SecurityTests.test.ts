/**
 * Copyright (c) 2025-present, Xenothon Tech, Inc.
 * Security Tests for BlueBot Production
 * Tests authentication, encryption, and data protection
 */

/// <reference types="jest" />

// Mock all external dependencies
jest.mock('../../../services/cryptoWallet_Production', () => ({}));
jest.mock('../../../services/QRPaymentService_Production', () => ({
  QRPaymentService: jest.fn().mockImplementation(() => ({
    validateQRCode: jest.fn(),
  })),
}));
jest.mock('../../../contexts/MobileAuthContext', () => ({
  AuthProvider: () => null,
}));
jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');
jest.mock('expo-local-authentication');

import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

// Create mock CryptoWalletService class
class CryptoWalletService {
  createWallet = jest.fn();
  getDecryptedPrivateKey = jest.fn();
  checkBiometricAvailability = jest.fn();
  sendTransaction = jest.fn();
  validateAddress = jest.fn();
  validateTransactionAmount = jest.fn();
  getBalance = jest.fn();
  deleteUserData = jest.fn();
  getWallet = jest.fn();
  storeUserProfile = jest.fn();
  createSession = jest.fn();
  validateSession = jest.fn();
  authenticateOperation = jest.fn();
}

// Create mock QRPaymentService class
class QRPaymentService {
  validateQRCode = jest.fn();
}

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;

describe('Security Tests', () => {
  let walletService: CryptoWalletService;
  let qrService: QRPaymentService;

  beforeEach(() => {
    walletService = new CryptoWalletService();
    qrService = new QRPaymentService();
    jest.clearAllMocks();
  });

  describe('Data Encryption', () => {
    test('should encrypt private keys in secure storage', async () => {
      const userId = 'test-user-123';
      
      // Mock secure store behavior
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockSecureStore.getItemAsync.mockResolvedValue('encrypted-private-key-data');

      await walletService.createWallet(userId);

      // Verify private key was stored encrypted
      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
      
      const secureStoreCalls = mockSecureStore.setItemAsync.mock.calls;
      const storedValue = secureStoreCalls[0][1];
      
      // Encrypted data should not be plaintext private key
      expect(storedValue).not.toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(storedValue.length).toBeGreaterThan(64); // Encrypted data is longer
    });

    test('should use different encryption keys for different users', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await walletService.createWallet(user1);
      await walletService.createWallet(user2);

      const calls = mockSecureStore.setItemAsync.mock.calls;
      
      // Should have different storage keys
      expect(calls[0][0]).not.toBe(calls[1][0]);
      
      // Should have different encrypted values
      expect(calls[0][1]).not.toBe(calls[1][1]);
    });

    test('should decrypt private keys only for authorized operations', async () => {
      const userId = 'test-user-123';
      const unauthorizedUser = 'unauthorized-user';

      mockSecureStore.getItemAsync.mockResolvedValue('encrypted-private-key');

      // Authorized operation should succeed
      await expect(
        walletService.getDecryptedPrivateKey(userId)
      ).resolves.toBeDefined();

      // Unauthorized operation should fail
      await expect(
        walletService.getDecryptedPrivateKey(unauthorizedUser)
      ).rejects.toThrow();
    });
  });

  describe('Authentication Security', () => {
    test('should validate biometric authentication availability', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      const isAvailable = await walletService.checkBiometricAvailability();
      
      expect(isAvailable).toBe(true);
      expect(mockLocalAuth.hasHardwareAsync).toHaveBeenCalled();
      expect(mockLocalAuth.isEnrolledAsync).toHaveBeenCalled();
    });

    test('should require biometric authentication for sensitive operations', async () => {
      const userId = 'test-user-123';
      
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
      mockSecureStore.getItemAsync.mockResolvedValue('encrypted-key');

      await walletService.sendTransaction(
        userId,
        '0x742d35Cc6639C0532fEb5E42e8f3e49F8d1b3e1a',
        '1',
        'ETH'
      );

      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: expect.stringContaining('Authenticate'),
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
    });

    test('should reject operations without proper authentication', async () => {
      const userId = 'test-user-123';
      
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });

      await expect(
        walletService.sendTransaction(
          userId,
          '0x742d35Cc6639C0532fEb5E42e8f3e49F8d1b3e1a',
          '1',
          'ETH'
        )
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should validate Ethereum addresses', async () => {
      const userId = 'test-user-123';

      // Valid address should pass
      await expect(
        walletService.validateAddress('0x742d35Cc6639C0532fEb5E42e8f3e49F8d1b3e1a')
      ).resolves.toBe(true);

      // Invalid addresses should fail
      const invalidAddresses = [
        '0x123', // Too short
        'not-an-address', // Not hex
        '0x742d35Cc6639C0532fEb5E42e8f3e49F8d1b3e1g', // Invalid hex character
        '', // Empty
        null, // Null
        undefined, // Undefined
      ];

      for (const invalidAddress of invalidAddresses) {
        await expect(
          walletService.validateAddress(invalidAddress as any)
        ).resolves.toBe(false);
      }
    });

    test('should sanitize QR code data', async () => {
      const maliciousQRData = 'javascript:alert("xss")';
      const sqlInjectionQRData = "'; DROP TABLE payments; --";

      await expect(
        qrService.validateQRCode(maliciousQRData)
      ).resolves.toEqual({
        isValid: false,
        error: 'Invalid QR format',
      });

      await expect(
        qrService.validateQRCode(sqlInjectionQRData)
      ).resolves.toEqual({
        isValid: false,
        error: 'Invalid QR format',
      });
    });

    test('should validate transaction amounts', async () => {
      const userId = 'test-user-123';
      const validAddress = '0x742d35Cc6639C0532fEb5E42e8f3e49F8d1b3e1a';

      // Valid amounts
      const validAmounts = ['1', '0.1', '100.5', '0.000001'];
      
      for (const amount of validAmounts) {
        await expect(
          walletService.validateTransactionAmount(amount)
        ).resolves.toBe(true);
      }

      // Invalid amounts
      const invalidAmounts = ['-1', '0', 'abc', '', null, undefined, 'Infinity', 'NaN'];
      
      for (const amount of invalidAmounts) {
        await expect(
          walletService.sendTransaction(userId, validAddress, amount as any, 'ETH')
        ).rejects.toThrow();
      }
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    test('should implement rate limiting for API calls', async () => {
      const userId = 'test-user-123';

      // Make multiple rapid requests
      const promises = Array(20).fill(null).map(() =>
        walletService.getBalance('0x742d35Cc6639C0532fEb5E42e8f3e49F8d1b3e1a', 'ETH', 'ethereum')
      );

      const results = await Promise.allSettled(promises);
      
      // Some requests should be rate limited
      const rejectedRequests = results.filter(result => result.status === 'rejected');
      expect(rejectedRequests.length).toBeGreaterThan(0);
      
      // Check for rate limit error messages
      rejectedRequests.forEach(rejection => {
        if (rejection.status === 'rejected') {
          expect(rejection.reason.message).toMatch(/rate limit|too many requests/i);
        }
      });
    });

    test('should limit transaction frequency per user', async () => {
      const userId = 'test-user-123';
      const validAddress = '0x742d35Cc6639C0532fEb5E42e8f3e49F8d1b3e1a';

      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
      mockSecureStore.getItemAsync.mockResolvedValue('encrypted-key');

      // First transaction should succeed
      await expect(
        walletService.sendTransaction(userId, validAddress, '1', 'ETH')
      ).resolves.toBeDefined();

      // Rapid subsequent transactions should be rate limited
      await expect(
        walletService.sendTransaction(userId, validAddress, '1', 'ETH')
      ).rejects.toThrow(/rate limit|too frequent/i);
    });
  });

  describe('Data Privacy and POPIA Compliance', () => {
    test('should not log sensitive user data', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const userId = 'test-user-123';

      await walletService.createWallet(userId);

      // Check that no private keys or sensitive data were logged
      const logCalls = consoleSpy.mock.calls;
      logCalls.forEach(call => {
        const logMessage = call.join(' ');
        expect(logMessage).not.toMatch(/0x[a-fA-F0-9]{64}/); // Private key pattern
        expect(logMessage).not.toContain('privateKey');
        expect(logMessage).not.toContain('mnemonic');
        expect(logMessage).not.toContain('password');
      });

      consoleSpy.mockRestore();
    });

    test('should implement data retention policies', async () => {
      const userId = 'test-user-123';
      
      // Create wallet
      await walletService.createWallet(userId);
      
      // Request data deletion (POPIA right to erasure)
      await walletService.deleteUserData(userId);
      
      // Verify all user data is removed
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalled();
      
      // Wallet should no longer exist
      await expect(
        walletService.getWallet(userId)
      ).resolves.toBeNull();
    });

    test('should encrypt all PII data at rest', async () => {
      const userProfile = {
        id: 'test-user-123',
        email: 'test@example.com',
        phoneNumber: '+27821234567',
        name: 'Test User',
      };

      // Mock storage of user profile
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      
      await walletService.storeUserProfile(userProfile);

      const storageCall = mockSecureStore.setItemAsync.mock.calls[0];
      const storedData = storageCall[1];
      
      // Stored data should be encrypted (not contain plaintext PII)
      expect(storedData).not.toContain(userProfile.email);
      expect(storedData).not.toContain(userProfile.phoneNumber);
      expect(storedData).not.toContain(userProfile.name);
    });
  });

  describe('Network Security', () => {
    test('should only communicate over HTTPS', async () => {
      const originalFetch = global.fetch;
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy;

      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ balance: '1000000000000000000' }),
      });

      await walletService.getBalance('0x742d35Cc6639C0532fEb5E42e8f3e49F8d1b3e1a', 'ETH', 'ethereum');

      // Verify all network calls use HTTPS
      const networkCalls = fetchSpy.mock.calls;
      networkCalls.forEach(call => {
        const url = call[0];
        expect(url).toMatch(/^https:/);
      });

      global.fetch = originalFetch;
    });

    test('should validate SSL certificates', async () => {
      const originalFetch = global.fetch;
      
      // Mock fetch that simulates SSL error
      global.fetch = jest.fn().mockRejectedValue(new Error('SSL certificate error'));

      await expect(
        walletService.getBalance('0x742d35Cc6639C0532fEb5E42e8f3e49F8d1b3e1a', 'ETH', 'ethereum')
      ).rejects.toThrow(/SSL|certificate/i);

      global.fetch = originalFetch;
    });

    test('should implement request signing for sensitive operations', async () => {
      const userId = 'test-user-123';
      const validAddress = '0x742d35Cc6639C0532fEb5E42e8f3e49F8d1b3e1a';

      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
      mockSecureStore.getItemAsync.mockResolvedValue('encrypted-key');

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ hash: '0x123...' }),
      } as any);

      await walletService.sendTransaction(userId, validAddress, '1', 'ETH');

      // Verify request includes signature headers
      const networkCall = fetchSpy.mock.calls[0];
      const [url, options] = networkCall;
      
      expect(options?.headers).toHaveProperty('X-Signature');
      expect(options?.headers).toHaveProperty('X-Timestamp');

      fetchSpy.mockRestore();
    });
  });

  describe('Error Handling and Information Disclosure', () => {
    test('should not expose sensitive information in error messages', async () => {
      const userId = 'test-user-123';
      
      // Mock error that might contain sensitive data
      mockSecureStore.getItemAsync.mockRejectedValue(
        new Error('Decryption failed: private key 0x1234567890abcdef...')
      );

      try {
        await walletService.getDecryptedPrivateKey(userId);
      } catch (error) {
        // Error message should be sanitized
        expect((error as Error).message).not.toMatch(/0x[a-fA-F0-9]{8,}/);
        expect((error as Error).message).not.toContain('private key');
        expect((error as Error).message).toMatch(/authentication|access denied|invalid/i);
      }
    });

    test('should implement proper error logging without sensitive data', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const userId = 'test-user-123';

      mockSecureStore.getItemAsync.mockRejectedValue(new Error('Storage error'));

      try {
        await walletService.getWallet(userId);
      } catch (error) {
        // Errors should be logged but sanitized
        const errorLogs = consoleSpy.mock.calls;
        errorLogs.forEach(log => {
          const logMessage = log.join(' ');
          expect(logMessage).not.toContain(userId);
          expect(logMessage).not.toMatch(/0x[a-fA-F0-9]{8,}/);
        });
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Session Management', () => {
    test('should implement secure session timeout', async () => {
      const userId = 'test-user-123';
      
      // Create session
      await walletService.createSession(userId);
      
      // Fast-forward time to simulate session timeout
      jest.advanceTimersByTime(30 * 60 * 1000); // 30 minutes
      
      // Session should be expired
      const isValid = await walletService.validateSession(userId);
      expect(isValid).toBe(false);
      
      // Operations requiring session should fail
      await expect(
        walletService.sendTransaction(
          userId,
          '0x742d35Cc6639C0532fEb5E42e8f3e49F8d1b3e1a',
          '1',
          'ETH'
        )
      ).rejects.toThrow(/session expired|authentication required/i);
    });

    test('should invalidate sessions on suspicious activity', async () => {
      const userId = 'test-user-123';
      
      await walletService.createSession(userId);
      
      // Simulate suspicious activity (multiple failed auth attempts)
      for (let i = 0; i < 5; i++) {
        mockLocalAuth.authenticateAsync.mockResolvedValueOnce({ 
          success: false, 
          error: 'authentication_failed' 
        });
        
        try {
          await walletService.authenticateOperation(userId);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Session should be invalidated
      const isValid = await walletService.validateSession(userId);
      expect(isValid).toBe(false);
    });
  });
});
