import type { TelegramUser } from '../models/telegram-user';
import { validateTelegramUser } from '../models/telegram-user';
import { AuthErrors } from '../models/error-response';

export class TelegramAuthService {
  private readonly botToken: string;
  private readonly maxAge: number;

  constructor(botToken: string, maxAge: number = 3600) {
    if (!botToken) {
      throw new Error('Bot token is required for Telegram authentication');
    }
    this.botToken = botToken;
    this.maxAge = maxAge;
  }

  private parseInitData(initData: string): { user?: Record<string, unknown>; auth_date?: number } {
    const params = new URLSearchParams(initData);

    const userParam = params.get('user');
    const authDate = params.get('auth_date');

    if (!userParam) {
      throw new Error('User data not found in initData');
    }

    try {
      return {
        user: JSON.parse(decodeURIComponent(userParam)),
        auth_date: authDate ? parseInt(authDate, 10) : undefined
      };
    } catch {
      throw new Error('Invalid user data in initData');
    }
  }

  private async validateSignature(initData: string): Promise<boolean> {
    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');

      if (!hash) return false;

      urlParams.delete('hash');
      const sortedParams = Array.from(urlParams.entries()).sort();
      const dataToCheck = sortedParams.map(([key, value]) => `${key}=${value}`).join('\n');

      const webAppDataKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('WebAppData'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const secretKeyData = await crypto.subtle.sign('HMAC', webAppDataKey, new TextEncoder().encode(this.botToken));
      const secretKey = await crypto.subtle.importKey('raw', secretKeyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const signatureData = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(dataToCheck));

      const calculatedHash = Array.from(new Uint8Array(signatureData))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return hash === calculatedHash;
    } catch {
      return false;
    }
  }

  async validateInitData(initData: string): Promise<TelegramUser> {
    if (!initData) {
      throw AuthErrors.missingInitData();
    }

    if (!await this.validateSignature(initData)) {
      throw AuthErrors.invalidInitData('Invalid signature');
    }

    const parsedData = this.parseInitData(initData);

    if (parsedData.auth_date) {
      const authTimestamp = parsedData.auth_date * 1000;
      const maxAgeMs = this.maxAge * 1000;

      if ((Date.now() - authTimestamp) > maxAgeMs) {
        throw AuthErrors.expiredInitData();
      }
    }

    if (!parsedData.user) {
      throw AuthErrors.invalidInitData('User data not found');
    }

    return validateTelegramUser(parsedData.user);
  }

  extractInitData(authHeader?: string, initDataParam?: string): string | null {
    if (authHeader) {
      const trimmed = authHeader.trim();
      if (trimmed.startsWith('Bearer ')) return trimmed.substring(7).trim();
      if (trimmed.startsWith('tma ')) return trimmed.substring(4).trim();
      return trimmed;
    }
    return initDataParam?.trim() || null;
  }

  async validateFromRequest(authHeader?: string, initDataParam?: string): Promise<TelegramUser> {
    const initData = this.extractInitData(authHeader, initDataParam);
    if (!initData) throw AuthErrors.missingInitData();
    return this.validateInitData(initData);
  }
}