import { describe, it, expect } from 'vitest';
import { isAdmin, getAdminRole } from '../../services/admin-auth';
import type { Env } from '../../types/env';

describe('Admin Authorization Service', () => {
  const createMockEnv = (adminId: string | number): Partial<Env> => ({
    TELEGRAM_ADMIN_ID: String(adminId),
  });

  describe('isAdmin', () => {
    it('should return true when telegram ID matches admin ID (number)', () => {
      const env = createMockEnv(12345) as Env;
      expect(isAdmin(12345, env)).toBe(true);
    });

    it('should return true when telegram ID matches admin ID (string)', () => {
      const env = createMockEnv('12345') as Env;
      expect(isAdmin(12345, env)).toBe(true);
    });

    it('should return false when telegram ID does not match admin ID', () => {
      const env = createMockEnv(12345) as Env;
      expect(isAdmin(54321, env)).toBe(false);
    });

    it('should return false when admin ID is not configured', () => {
      const env = { TELEGRAM_ADMIN_ID: '' } as Env;
      expect(isAdmin(12345, env)).toBe(false);
    });

    it('should return false when admin ID is invalid', () => {
      const env = { TELEGRAM_ADMIN_ID: 'invalid' } as Env;
      expect(isAdmin(12345, env)).toBe(false);
    });
  });

  describe('getAdminRole', () => {
    it('should return "admin" for admin user', () => {
      const env = createMockEnv(12345) as Env;
      expect(getAdminRole(12345, env)).toBe('admin');
    });

    it('should return "user" for non-admin user', () => {
      const env = createMockEnv(12345) as Env;
      expect(getAdminRole(54321, env)).toBe('user');
    });

    it('should return "user" when admin ID is not configured', () => {
      const env = { TELEGRAM_ADMIN_ID: '' } as Env;
      expect(getAdminRole(12345, env)).toBe('user');
    });
  });
});