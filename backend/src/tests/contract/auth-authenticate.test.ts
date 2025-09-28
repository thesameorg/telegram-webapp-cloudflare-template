import { describe, it, expect } from 'vitest';
import app from '../../index';

// Test the simplified auth endpoint
describe('POST /api/auth Contract Test', () => {
  const mockEnv = {
    BOT_TOKEN: 'test_bot_token',
    ENVIRONMENT: 'test',
    TELEGRAM_BOT_TOKEN: 'test_bot_token',
    TELEGRAM_ADMIN_ID: 'test_admin_id',
  };

  it('should return 401 for expired initData', async () => {
    const expiredInitData = "query_id=test&user=%7B%22id%22%3A123%7D&auth_date=1234567890&hash=invalid";

    const response = await app.request('/api/auth', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${expiredInitData}`,
        'Content-Type': 'application/json',
      },
    }, mockEnv);

    expect(response.status).toBe(401);
  });

  it('should return 401 when authorization header is missing', async () => {
    const response = await app.request('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, mockEnv);

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data).toHaveProperty('authenticated', false);
    expect(data).toHaveProperty('message', 'Authentication required');
    expect(data).toHaveProperty('reason', 'no_auth_data');
  });

  it('should return 401 when initData signature is invalid', async () => {
    const invalidInitData = 'invalid_init_data_string';

    const response = await app.request('/api/auth', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${invalidInitData}`,
        'Content-Type': 'application/json',
      },
    }, mockEnv);

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('message');
  });
});