import type { TelegramUser } from '../models/telegram-user';
import { validateTelegramUser } from '../models/telegram-user';
import { AuthErrors } from '../models/error-response';

/**
 * Telegram authentication service
 * Handles initData validation and user data extraction
 */
export class TelegramAuthService {
  private readonly botToken: string;
  private readonly maxAge: number;

  constructor(botToken: string, maxAge: number = 3600) {
    if (!botToken) {
      throw new Error('Bot token is required for Telegram authentication');
    }
    this.botToken = botToken;
    this.maxAge = maxAge; // 1 hour default
  }

  /**
   * Manual parsing of initData to extract user and other data
   */
   private parseInitData(initData: string): { user?: Record<string, unknown>; auth_date?: number; query_id?: string } {
    try {
      const params = new URLSearchParams(initData);
      const result: Record<string, unknown> = {};

      // Extract user data
      const userParam = params.get('user');
      if (userParam) {
        try {
          result.user = JSON.parse(decodeURIComponent(userParam));
        } catch {
          throw new Error('Invalid user data in initData');
        }
      }

      // Extract auth_date
      const authDate = params.get('auth_date');
      if (authDate) {
        result.auth_date = parseInt(authDate, 10);
      }

      // Extract query_id
      const queryId = params.get('query_id');
      if (queryId) {
        result.query_id = queryId;
      }

      return result;
    } catch (error) {
      throw new Error('Failed to parse initData: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Manual validation of Telegram initData using the official algorithm
   * Uses WebCrypto API for Cloudflare Workers compatibility
   */
  private async validateInitDataManually(initData: string): Promise<boolean> {
    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');

      if (!hash) {
        console.log('No hash found in initData');
        return false;
      }

      // Remove hash from params and sort
      urlParams.delete('hash');
      const sortedParams = Array.from(urlParams.entries()).sort();

      // Create data string for validation
      const dataToCheck = sortedParams
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      console.log('Data to check for validation:', dataToCheck.substring(0, 200) + '...');

      // Create secret key using "WebAppData" constant
      const webAppDataKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('WebAppData'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const secretKeyData = await crypto.subtle.sign(
        'HMAC',
        webAppDataKey,
        new TextEncoder().encode(this.botToken)
      );

      // Import the secret key for the final HMAC
      const secretKey = await crypto.subtle.importKey(
        'raw',
        secretKeyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      // Create signature
      const signatureData = await crypto.subtle.sign(
        'HMAC',
        secretKey,
        new TextEncoder().encode(dataToCheck)
      );

      // Convert to hex
      const calculatedHash = Array.from(new Uint8Array(signatureData))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      console.log('Expected hash:', hash);
      console.log('Calculated hash:', calculatedHash);
      console.log('Hashes match:', hash === calculatedHash);

      return hash === calculatedHash;
    } catch (error) {
      console.error('Manual validation error:', error);
      return false;
    }
  }

  /**
   * Validates Telegram Web App initData
   * @param initData - Raw initData string from Telegram Web App
   * @returns Validated and parsed user data
   * @throws Error if validation fails
   */
  async validateInitData(initData: string): Promise<TelegramUser> {
    if (!initData) {
      throw AuthErrors.missingInitData();
    }

    console.log('Validating initData:', {
      length: initData.length,
      preview: initData.substring(0, 100) + '...',
      botTokenLength: this.botToken.length,
      botTokenPrefix: this.botToken.substring(0, 10) + '...',
      maxAge: this.maxAge
    });

    try {
      console.log('Raw initData for validation:', initData);

      // First try manual validation to debug the signature issue
      console.log('=== Attempting manual validation ===');
      const manualValidationSuccess = await this.validateInitDataManually(initData);

      if (!manualValidationSuccess) {
        console.log('Manual validation failed - signature mismatch');
        throw AuthErrors.invalidInitData('Manual signature validation failed');
      }

      console.log('Manual validation successful! Proceeding with manual parsing...');

      // Parse the initData string manually
      const parsedData = this.parseInitData(initData);
      console.log('Parsed initData:', {
        hasUser: !!parsedData.user,
        authDate: parsedData.auth_date,
        queryId: parsedData.query_id,
        keys: Object.keys(parsedData)
      });

      // Check expiration manually since signature is valid
      const urlParams = new URLSearchParams(initData);
      const authDate = urlParams.get('auth_date');
      if (authDate) {
        const authTimestamp = parseInt(authDate, 10) * 1000; // Convert to milliseconds
        const now = Date.now();
        const maxAgeMs = this.maxAge * 1000;

        if ((now - authTimestamp) > maxAgeMs) {
          console.log('InitData has expired:', {
            authTimestamp,
            now,
            ageMs: now - authTimestamp,
            maxAgeMs
          });
          throw AuthErrors.expiredInitData();
        }
      }

      // Extract and validate user data
      if (!parsedData.user) {
        throw AuthErrors.invalidInitData('User data not found in initData');
      }

      // Validate user data directly (already parsed from JSON)
      return validateTelegramUser(parsedData.user);

    } catch (error) {
      if (error instanceof Error) {
        // Handle specific validation errors
        if (error.message.includes('expired') || error.message.includes('auth_date')) {
          throw AuthErrors.expiredInitData();
        }

        if (error.message.includes('signature') || error.message.includes('hash')) {
          throw AuthErrors.invalidInitData('Invalid signature or hash');
        }

        // Handle parsing errors
        if (error.message.includes('parse') || error.message.includes('JSON')) {
          throw AuthErrors.invalidInitData('Failed to parse initData');
        }
      }

      // Re-throw known auth errors
      if (typeof error === 'object' && error !== null && 'error' in error) {
        throw error;
      }

      // Wrap unknown errors
      throw AuthErrors.invalidInitData(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Extracts initData from various sources
   * Supports Authorization header and direct parameter
   */
  extractInitData(authHeader?: string, initDataParam?: string): string | null {
    // Try Authorization header first
    if (authHeader) {
      const trimmedHeader = authHeader.trim();

      // Handle "Bearer {initData}" format
      if (trimmedHeader.startsWith('Bearer ')) {
        return trimmedHeader.substring(7).trim();
      }

      // Handle "tma {initData}" format
      if (trimmedHeader.startsWith('tma ')) {
        return trimmedHeader.substring(4).trim();
      }

      // Handle direct initData in header
      return trimmedHeader;
    }

    // Fallback to direct parameter
    if (initDataParam) {
      return initDataParam.trim();
    }

    return null;
  }

  /**
   * Validates initData from HTTP request context
   * Extracts from Authorization header or query parameter
   */
  async validateFromRequest(
    authHeader?: string,
    initDataParam?: string
  ): Promise<TelegramUser> {
    const initData = this.extractInitData(authHeader, initDataParam);

    if (!initData) {
      throw AuthErrors.missingInitData();
    }

    return this.validateInitData(initData);
  }

  /**
   * Checks if initData is well-formed before validation
   * Useful for early validation without hitting rate limits
   */
  isWellFormedInitData(initData: string): boolean {
    if (!initData || typeof initData !== 'string') {
      return false;
    }

    // Check for required parameters
    const requiredParams = ['user', 'auth_date'];
    const hasRequiredParams = requiredParams.every(param =>
      initData.includes(`${param}=`)
    );

    if (!hasRequiredParams) {
      return false;
    }

    // Check for hash or signature (depending on validation method)
    const hasValidation = initData.includes('hash=') || initData.includes('signature=');

    return hasValidation;
  }

  /**
   * Extracts auth_date from initData for expiration checking
   * Returns null if auth_date is not found or invalid
   */
  extractAuthDate(initData: string): number | null {
    try {
      const params = new URLSearchParams(initData);
      const authDate = params.get('auth_date');

      if (!authDate) return null;

      // Validate that auth_date is a valid integer string (no decimals, only digits)
      if (!/^\d+$/.test(authDate)) return null;

      const timestamp = parseInt(authDate, 10);
      return isNaN(timestamp) ? null : timestamp * 1000; // Convert to milliseconds
    } catch {
      return null;
    }
  }

  /**
   * Checks if initData is expired without full validation
   * Useful for quick checks before expensive validation
   */
  isInitDataExpired(initData: string, currentTime: number = Date.now()): boolean {
    const authDate = this.extractAuthDate(initData);

    if (!authDate) return true; // Consider malformed as expired

    const maxAgeMs = this.maxAge * 1000;
    return (currentTime - authDate) > maxAgeMs;
  }

  /**
   * Gets the maximum age for initData validation
   */
  getMaxAge(): number {
    return this.maxAge;
  }

  /**
   * Creates a new instance with different settings
   */
  static create(botToken: string, maxAge: number = 3600): TelegramAuthService {
    return new TelegramAuthService(botToken, maxAge);
  }
}