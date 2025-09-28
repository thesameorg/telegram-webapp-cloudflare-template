import { expect } from 'vitest';
import app from '../../src/index';

export const mockEnv = {
  TELEGRAM_BOT_TOKEN: 'test-token',
  BOT_TOKEN: 'test_bot_token',
  ENVIRONMENT: 'test',
  TELEGRAM_ADMIN_ID: 'test_admin_id',
};

export const makeRequest = async (
  path: string,
  options: RequestInit = {},
  env = mockEnv
) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return app.request(path, {
    ...options,
    headers: defaultHeaders,
  }, env);
};

export const expectJsonResponse = (response: Response) => {
  expect(response.headers.get('content-type')).toContain('application/json');
};

export const expectValidTimestamp = (timestamp: string) => {
  expect(() => new Date(timestamp)).not.toThrow();
  expect(new Date(timestamp).getTime()).toBeGreaterThan(0);
};

export const expectValidEnvironment = (environment: string) => {
  expect(['local', 'preview', 'prod', 'test']).toContain(environment);
};