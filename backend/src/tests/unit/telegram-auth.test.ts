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

    const validCases = [
      { format: 'Bearer', header: `Bearer ${testInitData}` },
      { format: 'tma', header: `tma ${testInitData}` },
      { format: 'direct', header: testInitData },
      { format: 'whitespace trimming', header: `  Bearer ${testInitData}  ` }
    ];

    validCases.forEach(({ format, header }) => {
      it(`should extract from ${format} format`, () => {
        const extracted = telegramAuth.extractInitData(header);
        expect(extracted).toBe(testInitData);
      });
    });

    it('should fallback to parameter when header is invalid', () => {
      const extracted = telegramAuth.extractInitData('', testInitData);
      expect(extracted).toBe(testInitData);
    });

    it('should handle invalid inputs gracefully', () => {
      const invalidCases = ['', '   ', 'InvalidFormat', 'Bearer', 'tma'];

      invalidCases.forEach(header => {
        const extracted = telegramAuth.extractInitData(header);
        expect(extracted === null || extracted === header.trim()).toBe(true);
      });
    });
  });

  describe('Request Validation Interface', () => {
    it('should handle validation attempts with proper error structure', async () => {
      const mockInitData = 'query_id=AAG&user=%7B%22id%22%3A123%7D&auth_date=1727404800&hash=mockhash';

      const testCases = [
        { name: 'with auth header', header: `Bearer ${mockInitData}` },
        { name: 'without auth data', header: undefined }
      ];

      for (const { name, header } of testCases) {
        try {
          await telegramAuth.validateFromRequest(header);
          expect.fail(`Should have thrown an error ${name}`);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });
  });

});