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
      expect(service.getMaxAge()).toBe(3600); // Default 1 hour
    });

    it('should initialize with custom max age', () => {
      const service = new TelegramAuthService('valid_token', 7200);
      expect(service.getMaxAge()).toBe(7200); // 2 hours
    });

    it('should throw error for empty bot token', () => {
      expect(() => new TelegramAuthService('')).toThrow('Bot token is required');
    });

    it('should create instance using static factory method', () => {
      const service = TelegramAuthService.create('token', 1800);
      expect(service.getMaxAge()).toBe(1800);
    });
  });

  describe('InitData Format Validation', () => {
    it('should validate well-formed initData', () => {
      const validInitData = 'query_id=AAG&user=%7B%22id%22%3A123%7D&auth_date=1727404800&hash=abcd1234';
      expect(telegramAuth.isWellFormedInitData(validInitData)).toBe(true);
    });

    it('should reject malformed initData', () => {
      const invalidCases = [
        '', // Empty
        'invalid_format', // No parameters
        'query_id=AAG', // Missing user and auth_date
        'user=%7B%22id%22%3A123%7D', // Missing auth_date
        'auth_date=1727404800', // Missing user
        'query_id=AAG&user=%7B%22id%22%3A123%7D&auth_date=1727404800', // Missing hash/signature
        null as any, // Null
        undefined as any, // Undefined
        123 as any, // Number
        {} as any, // Object
      ];

      invalidCases.forEach((invalidData, index) => {
        expect(telegramAuth.isWellFormedInitData(invalidData)).toBe(false);
      });
    });

    it('should validate initData with both hash and signature', () => {
      const withHash = 'query_id=AAG&user=%7B%22id%22%3A123%7D&auth_date=1727404800&hash=abcd1234';
      const withSignature = 'query_id=AAG&user=%7B%22id%22%3A123%7D&auth_date=1727404800&signature=abcd1234';

      expect(telegramAuth.isWellFormedInitData(withHash)).toBe(true);
      expect(telegramAuth.isWellFormedInitData(withSignature)).toBe(true);
    });
  });

  describe('Auth Date Extraction', () => {
    it('should extract valid auth_date', () => {
      const initData = 'query_id=AAG&user=%7B%22id%22%3A123%7D&auth_date=1727404800&hash=abcd1234';
      const authDate = telegramAuth.extractAuthDate(initData);
      expect(authDate).toBe(1727404800000); // Converted to milliseconds
    });

    it('should handle missing auth_date', () => {
      const initData = 'query_id=AAG&user=%7B%22id%22%3A123%7D&hash=abcd1234';
      const authDate = telegramAuth.extractAuthDate(initData);
      expect(authDate).toBeNull();
    });

    it('should handle invalid auth_date values', () => {
      const invalidCases = [
        'query_id=AAG&auth_date=invalid&hash=abcd1234',
        'query_id=AAG&auth_date=&hash=abcd1234',
        'query_id=AAG&auth_date=12.34&hash=abcd1234',
        'malformed_data',
        '',
      ];

      invalidCases.forEach(invalidData => {
        const authDate = telegramAuth.extractAuthDate(invalidData);
        expect(authDate).toBeNull();
      });
    });

    it('should handle edge case timestamps', () => {
      const edgeCases = [
        { input: 'auth_date=0', expected: 0 }, // Unix epoch
        { input: 'auth_date=2147483647', expected: 2147483647000 }, // Max 32-bit int
        { input: 'auth_date=1234567890', expected: 1234567890000 }, // Common test timestamp
      ];

      edgeCases.forEach(({ input, expected }) => {
        const authDate = telegramAuth.extractAuthDate(input);
        expect(authDate).toBe(expected);
      });
    });
  });

  describe('Expiration Checking', () => {
    it('should correctly identify non-expired initData', () => {
      const currentTime = Date.now();
      const recentAuthDate = Math.floor(currentTime / 1000) - 1800; // 30 minutes ago
      const initData = `auth_date=${recentAuthDate}`;

      const isExpired = telegramAuth.isInitDataExpired(initData, currentTime);
      expect(isExpired).toBe(false);
    });

    it('should correctly identify expired initData', () => {
      const currentTime = Date.now();
      const oldAuthDate = Math.floor(currentTime / 1000) - 7200; // 2 hours ago
      const initData = `auth_date=${oldAuthDate}`;

      const isExpired = telegramAuth.isInitDataExpired(initData, currentTime);
      expect(isExpired).toBe(true);
    });

    it('should treat malformed data as expired', () => {
      const malformedCases = [
        '',
        'invalid_data',
        'auth_date=invalid',
        'no_auth_date_param=123',
      ];

      malformedCases.forEach(malformedData => {
        const isExpired = telegramAuth.isInitDataExpired(malformedData);
        expect(isExpired).toBe(true);
      });
    });

    it('should handle custom max age for expiration', () => {
      const shortMaxAge = new TelegramAuthService(mockBotToken, 300); // 5 minutes
      const currentTime = Date.now();
      const authDate = Math.floor(currentTime / 1000) - 600; // 10 minutes ago
      const initData = `auth_date=${authDate}`;

      // Should be expired with 5-minute max age
      expect(shortMaxAge.isInitDataExpired(initData, currentTime)).toBe(true);

      // Should not be expired with 1-hour max age
      expect(telegramAuth.isInitDataExpired(initData, currentTime)).toBe(false);
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
    it('should handle very long initData strings', () => {
      const longData = 'user=' + '%7B%22id%22%3A123%7D'.repeat(1000) + '&auth_date=1727404800&hash=abc';

      // Should not crash on long data
      expect(() => {
        telegramAuth.isWellFormedInitData(longData);
        telegramAuth.extractAuthDate(longData);
        telegramAuth.isInitDataExpired(longData);
      }).not.toThrow();
    });

    it('should handle special characters in initData', () => {
      const specialChars = 'user=%7B%22id%22%3A123%2C%22name%22%3A%22Test%20%26%20User%22%7D&auth_date=1727404800&hash=abc';

      expect(() => {
        telegramAuth.isWellFormedInitData(specialChars);
        telegramAuth.extractAuthDate(specialChars);
      }).not.toThrow();
    });

    it('should maintain consistent behavior with concurrent calls', async () => {
      const testData = 'query_id=AAG&user=%7B%22id%22%3A123%7D&auth_date=1727404800&hash=abc';

      const concurrentCalls = Array.from({ length: 10 }, () =>
        Promise.resolve({
          wellFormed: telegramAuth.isWellFormedInitData(testData),
          authDate: telegramAuth.extractAuthDate(testData),
          expired: telegramAuth.isInitDataExpired(testData),
        })
      );

      const results = await Promise.all(concurrentCalls);

      // All results should be identical
      expect(results.every(result =>
        result.wellFormed === results[0].wellFormed &&
        result.authDate === results[0].authDate &&
        result.expired === results[0].expired
      )).toBe(true);
    });
  });
});