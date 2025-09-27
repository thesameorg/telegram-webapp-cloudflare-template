# Data Model: Telegram Authorization System

**Feature**: Telegram Authorization System
**Date**: 2025-09-27
**Source**: Derived from feature specification and research findings

## Core Entities

### Session Entity
**Purpose**: Represents an authenticated user's session with expiration and metadata

```typescript
interface Session {
  sessionId: string;        // Primary key: UUID v4 format
  userId: number;           // Telegram user ID (immutable)
  username?: string;        // Telegram username (can change)
  displayName: string;      // Combined first_name + last_name
  profilePictureUrl?: string; // Telegram profile picture URL
  createdAt: number;        // Unix timestamp of session creation
  expiresAt: number;        // Unix timestamp of session expiration
  isActive: boolean;        // Session validity flag
}
```

**Storage**: Cloudflare KV with key pattern `session:{sessionId}`
**TTL**: 3600 seconds (1 hour) - automatic expiration
**Validation Rules**:
- sessionId must be unique UUID v4
- userId must be positive integer from Telegram
- displayName cannot be empty string
- createdAt < expiresAt
- expiresAt = createdAt + 3600000 (1 hour in milliseconds)

### Telegram User Entity
**Purpose**: Telegram user identity information extracted from initData

```typescript
interface TelegramUser {
  id: number;                    // Unique Telegram user ID
  first_name: string;           // User's first name
  last_name?: string;           // User's last name (optional)
  username?: string;            // Telegram username (optional)
  language_code: string;        // User's language preference
  is_premium?: boolean;         // Telegram Premium status
  allows_write_to_pm?: boolean; // PM permission setting
  photo_url?: string;           // Profile picture URL
}
```

**Source**: Telegram Web App initData validation
**Immutability**: ID is immutable, other fields may change between sessions
**Validation Rules**:
- id must be positive integer
- first_name cannot be empty
- language_code must follow ISO 639-1 format

### Auth Token Entity
**Purpose**: Secure identifier for frontend-backend session linking

```typescript
interface AuthToken {
  token: string;           // Session ID used as token
  type: 'session';         // Token type identifier
  expiresAt: number;       // Token expiration timestamp
}
```

**Format**: Session ID serves dual purpose as auth token
**Transport**: Authorization header with "Bearer {token}" format
**Validation Rules**:
- token must match existing session ID
- expiresAt must be future timestamp
- type must be 'session'

## Entity Relationships

```
TelegramUser (1) --creates--> (1) Session
Session (1) --generates--> (1) AuthToken
```

### Relationship Rules
1. **One TelegramUser creates one active Session** - No concurrent sessions per user
2. **One Session generates one AuthToken** - Session ID serves as token
3. **Session expiration invalidates AuthToken** - Coupled lifecycle

## State Transitions

### Session Lifecycle
```
[No Session] --authenticate--> [Active Session] --expire/logout--> [Expired Session]
                                      |
                                  --refresh--> [Active Session]
```

**State Transition Rules**:
1. **Authentication**: TelegramUser initData → Active Session
2. **Expiration**: TTL reaches zero → Expired Session (automatic)
3. **Logout**: Explicit invalidation → Expired Session (manual)
4. **Refresh**: New initData validation → New Active Session (replaces old)

### Session State Validation
- **Active**: currentTime < expiresAt && isActive === true
- **Expired**: currentTime >= expiresAt || isActive === false
- **Invalid**: Session not found in KV storage

## Data Storage Patterns

### KV Storage Schema
```
Key Pattern: "session:{sessionId}"
Value: JSON.stringify(Session)
TTL: 3600 seconds (automatic cleanup)
```

### Data Access Patterns
1. **Create Session**: PUT session:{uuid} with TTL
2. **Validate Session**: GET session:{sessionId} + timestamp check
3. **Invalidate Session**: DELETE session:{sessionId}
4. **Auto-Cleanup**: KV TTL handles expired sessions

## Validation Rules Summary

### Session Validation
- Session ID must exist in KV storage
- Current timestamp must be < expiresAt
- isActive flag must be true
- User ID must match authenticated Telegram user

### Data Integrity
- All timestamps in Unix milliseconds
- All optional strings either present or undefined (not empty)
- Boolean flags explicitly true/false (not truthy/falsy)
- User ID immutable once set in session

### Security Constraints
- Session IDs generated using cryptographically secure random
- No sensitive data stored in sessions (passwords, tokens, etc.)
- Profile picture URLs validated as HTTPS only
- Username validation for allowed characters (@username format)

## Performance Considerations

### KV Access Patterns
- **Read-heavy**: Session validation on every protected request
- **Write-light**: Session creation only on authentication
- **TTL-based cleanup**: No manual cleanup required

### Optimization Strategies
- **Single KV read** per session validation
- **Batch operations** for multiple session operations
- **Edge caching** for frequently accessed sessions
- **Minimal data storage** to reduce KV bandwidth