import { describe, it, expect } from 'vitest';
import { makeRequest } from '../../../tests/utils/test-helpers';

describe('POST /api/auth', () => {
  const testCases = [
    {
      name: 'expired initData',
      authHeader: 'Bearer query_id=test&user=%7B%22id%22%3A123%7D&auth_date=1234567890&hash=invalid'
    },
    {
      name: 'invalid initData signature',
      authHeader: 'Bearer invalid_init_data_string'
    }
  ];

  testCases.forEach(({ name, authHeader }) => {
    it(`should return 401 for ${name}`, async () => {
      const response = await makeRequest('/api/auth', {
        method: 'POST',
        headers: { Authorization: authHeader }
      });

      expect(response.status).toBe(401);
    });
  });

  it('should return 401 when authorization header is missing', async () => {
    const response = await makeRequest('/api/auth', { method: 'POST' });

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data).toMatchObject({
      authenticated: false,
      message: 'Authentication required',
      reason: 'no_auth_data'
    });
  });
});