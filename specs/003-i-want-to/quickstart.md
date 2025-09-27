# Quickstart: Telegram Authorization System

**Feature**: Telegram Authorization System
**Purpose**: Step-by-step validation guide for authentication implementation
**Target**: End-to-end verification of authentication flow

## Prerequisites

### Environment Setup
- [ ] Telegram Bot created via @BotFather
- [ ] Bot token stored in environment variable `BOT_TOKEN`
- [ ] Cloudflare KV namespace configured in wrangler.toml
- [ ] Development environment running (frontend + backend)

### Dependencies Installed
- [ ] `@telegram-apps/init-data-node` in backend
- [ ] `@twa-dev/sdk` in frontend
- [ ] Backend running on Cloudflare Workers (dev mode)
- [ ] Frontend accessible as Telegram Web App

## Test Scenarios

### Scenario 1: First-Time Authentication
**Objective**: Verify new user can authenticate and receive session

**Steps**:
1. **Open Telegram Web App** in test environment
2. **Verify initData availability**:
   ```javascript
   // Frontend check
   import { initData } from '@twa-dev/sdk';
   console.log('InitData available:', !!initData);
   ```
3. **Send authentication request**:
   ```bash
   curl -X POST http://localhost:8787/api/auth/authenticate \
     -H "Authorization: Bearer {initData}" \
     -H "Content-Type: application/json"
   ```
4. **Verify response**:
   - Status: 200 OK
   - Response contains sessionId (UUID format)
   - Response contains user object with Telegram data
   - Set-Cookie header with session cookie

**Expected Result**:
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "user": {
    "id": 123456789,
    "first_name": "Test",
    "username": "testuser",
    "language_code": "en"
  },
  "expiresAt": 1727408400000
}
```

### Scenario 2: Session Validation
**Objective**: Verify active session can access protected endpoints

**Steps**:
1. **Use session from Scenario 1**
2. **Validate session**:
   ```bash
   curl -X GET http://localhost:8787/api/auth/validate \
     -H "Authorization: Bearer {sessionId}"
   ```
3. **Access protected profile endpoint**:
   ```bash
   curl -X GET http://localhost:8787/api/auth/profile \
     -H "Authorization: Bearer {sessionId}"
   ```

**Expected Results**:
- Validation returns `{"valid": true, "user": {...}}`
- Profile returns user data and session info
- Both requests complete in <100ms

### Scenario 3: Session Expiration
**Objective**: Verify sessions expire after 1 hour

**Steps**:
1. **Create session** (Scenario 1)
2. **Wait for expiration** (or modify KV TTL for testing)
3. **Attempt to validate expired session**:
   ```bash
   curl -X GET http://localhost:8787/api/auth/validate \
     -H "Authorization: Bearer {expiredSessionId}"
   ```

**Expected Result**:
```json
{
  "error": "INVALID_SESSION",
  "message": "Session expired or not found"
}
```

### Scenario 4: Explicit Logout
**Objective**: Verify manual session invalidation

**Steps**:
1. **Create session** (Scenario 1)
2. **Logout**:
   ```bash
   curl -X POST http://localhost:8787/api/auth/logout \
     -H "Authorization: Bearer {sessionId}"
   ```
3. **Attempt to use invalidated session**:
   ```bash
   curl -X GET http://localhost:8787/api/auth/validate \
     -H "Authorization: Bearer {sessionId}"
   ```

**Expected Results**:
- Logout returns `{"success": true, "message": "Session invalidated"}`
- Subsequent validation fails with INVALID_SESSION error
- Set-Cookie header clears session cookie

### Scenario 5: Invalid InitData
**Objective**: Verify security against tampered authentication data

**Steps**:
1. **Attempt authentication with invalid initData**:
   ```bash
   curl -X POST http://localhost:8787/api/auth/authenticate \
     -H "Authorization: Bearer invalid_init_data" \
     -H "Content-Type: application/json"
   ```
2. **Attempt with expired initData** (auth_date > 1 hour old)
3. **Attempt with tampered signature**

**Expected Result**:
```json
{
  "error": "INVALID_INIT_DATA",
  "message": "Invalid or expired initData"
}
```

## Integration Testing

### Frontend Integration Test
**File**: `frontend/src/tests/auth.integration.test.ts`

```typescript
describe('Telegram Authentication', () => {
  test('should authenticate user automatically', async () => {
    // Mock @twa-dev/sdk initData
    const mockInitData = "query_id=...&user=...&auth_date=...&hash=...";

    // Send authentication request
    const response = await fetch('/api/auth/authenticate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mockInitData}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.sessionId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
```

### Backend Integration Test
**File**: `backend/src/tests/auth.integration.test.ts`

```typescript
describe('Auth API Endpoints', () => {
  test('POST /auth/authenticate with valid initData', async () => {
    const validInitData = generateValidInitData();

    const response = await app.request('/api/auth/authenticate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${validInitData}` }
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.sessionId).toBeDefined();
    expect(data.user.id).toBeGreaterThan(0);
  });
});
```

## Performance Validation

### Response Time Requirements
- **Authentication**: <100ms end-to-end
- **Session validation**: <50ms
- **Profile retrieval**: <75ms

### Load Testing
```bash
# Test concurrent authentication requests
ab -n 100 -c 10 -H "Authorization: Bearer {validInitData}" \
  http://localhost:8787/api/auth/authenticate

# Test session validation under load
ab -n 1000 -c 50 -H "Authorization: Bearer {sessionId}" \
  http://localhost:8787/api/auth/validate
```

### KV Storage Verification
```typescript
// Verify session stored correctly in KV
const session = await env.SESSIONS.get(`session:${sessionId}`);
expect(JSON.parse(session)).toMatchObject({
  sessionId,
  userId: expect.any(Number),
  displayName: expect.any(String),
  createdAt: expect.any(Number),
  expiresAt: expect.any(Number),
  isActive: true
});
```

## Checklist: Ready for Production

### Security Verification
- [ ] Bot token secured in environment variables
- [ ] HTTPS enforced for all authentication endpoints
- [ ] Session cookies configured with HttpOnly, Secure, SameSite
- [ ] InitData validation includes expiration check
- [ ] No sensitive data logged or exposed

### Performance Verification
- [ ] Authentication completes in <100ms
- [ ] Session validation in <50ms
- [ ] KV operations performing within expected latency
- [ ] No memory leaks in session management

### Functionality Verification
- [ ] All test scenarios pass consistently
- [ ] Error handling graceful and informative
- [ ] Session expiration working automatically
- [ ] Manual logout invalidates sessions
- [ ] Invalid initData properly rejected

### Documentation Verification
- [ ] API contracts match implementation
- [ ] Error responses documented and consistent
- [ ] Integration examples working as documented
- [ ] Performance benchmarks achieved

## Troubleshooting

### Common Issues
1. **"Invalid initData" errors**: Check bot token configuration and initData format
2. **Session not found**: Verify KV namespace binding in wrangler.toml
3. **CORS errors**: Ensure proper headers for cross-origin requests
4. **Performance issues**: Check Cloudflare Workers cold start times

### Debug Commands
```bash
# Check KV storage contents
wrangler kv:key list --binding=SESSIONS

# View session data
wrangler kv:key get "session:{sessionId}" --binding=SESSIONS

# Monitor request logs
wrangler tail
```