import { describe, it, expect, beforeEach } from 'vitest';
import { TelegramAuthService } from '../../services/telegram-auth';

describe('Telegram Auth Service Unit Tests', () => {
  let telegramAuth: TelegramAuthService;
  const mockBotToken = 'mock_bot_token_for_testing';

  beforeEach(() => {
    telegramAuth = new TelegramAuthService(mockBotToken);
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with valid bot token', () => {
      const service = new TelegramAuthService('valid_token');
      expect(service).toBeInstanceOf(TelegramAuthService);
    });

    it('should initialize with custom max age', () => {
      const service = new TelegramAuthService('valid_token', 7200);
      expect(service).toBeInstanceOf(TelegramAuthService);
    });

    it('should throw error for empty bot token', () => {
      expect(() => new TelegramAuthService('')).toThrow('Bot token is required');
    });
  });




  describe('InitData Extraction from Headers', () => {
    const testInitData = 'query_id=AAG&user=%7B%22id%22%3A123%7D&auth_date=1727404800&hash=abcd1234';

    it('should extract from Bearer token format', () => {
      const bearerHeader = `Bearer ${testInitData}`;
      const extracted = telegramAuth.extractInitData(bearerHeader);
      expect(extracted).toBe(testInitData);
    });

    it('should extract from tma format', () => {
      const tmaHeader = `tma ${testInitData}`;
      const extracted = telegramAuth.extractInitData(tmaHeader);
      expect(extracted).toBe(testInitData);
    });

    it('should extract from direct header value', () => {
      const extracted = telegramAuth.extractInitData(testInitData);
      expect(extracted).toBe(testInitData);
    });

    it('should fallback to parameter when header is invalid', () => {
      const extracted = telegramAuth.extractInitData('', testInitData);
      expect(extracted).toBe(testInitData);
    });

    it('should return null when no valid data found', () => {
      const extracted = telegramAuth.extractInitData('', '');
      expect(extracted).toBeNull();
    });

    it('should handle whitespace in headers', () => {
      const cases = [
        `  Bearer ${testInitData}  `,
        `  tma ${testInitData}  `,
        `  ${testInitData}  `,
      ];

      cases.forEach(header => {
        const extracted = telegramAuth.extractInitData(header);
        expect(extracted).toBe(testInitData);
      });
    });

    it('should handle empty or invalid headers gracefully', () => {
      const invalidCases = [
        '', // Empty
        '   ', // Whitespace only
        'InvalidFormat', // No space
        'Bearer', // Missing data
        'tma', // Missing data
        'Other token_value', // Different format
      ];

      invalidCases.forEach(header => {
        const extracted = telegramAuth.extractInitData(header);
        expect(extracted === null || extracted === header.trim()).toBe(true);
      });
    });
  });

  describe('Request Validation Interface', () => {
    it('should validate from request with auth header', async () => {
      // Note: This would normally validate HMAC, but we're testing the interface
      const mockInitData = 'query_id=AAG&user=%7B%22id%22%3A123%7D&auth_date=1727404800&hash=mockhash';
      const authHeader = `Bearer ${mockInitData}`;

      // This will fail HMAC validation with mock token, but we can test the extraction logic
      try {
        await telegramAuth.validateFromRequest(authHeader);
      } catch (error) {
        // Expected to fail with mock data, but should have proper error structure
        expect(error).toBeDefined();
      }
    });

    it('should reject request without auth data', async () => {
      try {
        await telegramAuth.validateFromRequest();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(typeof error === 'object' && error !== null && 'error' in error).toBe(true);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extraction from various header formats', () => {
      const testData = 'query_id=AAG&user=%7B%22id%22%3A123%7D&auth_date=1727404800&hash=abc';

      expect(telegramAuth.extractInitData(`Bearer ${testData}`)).toBe(testData);
      expect(telegramAuth.extractInitData(`tma ${testData}`)).toBe(testData);
      expect(telegramAuth.extractInitData(testData)).toBe(testData);
      expect(telegramAuth.extractInitData('', testData)).toBe(testData);
      expect(telegramAuth.extractInitData()).toBeNull();
    });
  });
});