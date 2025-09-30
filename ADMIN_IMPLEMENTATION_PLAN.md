# Admin Functionality Implementation Plan

**Document Version:** 1.0
**Created:** 2025-09-30
**Feature:** Admin role with post deletion capabilities

---

## Requirements Summary

Based on `temp_docs/20-admin-1-delete-posts.md`:

1. **Admin Authentication & Role Management**
   - Auth based on `user.telegram_id == envs.TELEGRAM_ADMIN_ID`
   - Role stored and accessible on both backend and frontend
   - Separate validation file with special security care

2. **Frontend Admin UI Enhancements**
   - Same frontend for all users, with conditional admin elements
   - "ADMIN" badge with red marker on Account page (near "premium")
   - Delete button on every post in feed (admin can delete any post)
   - Confirmation dialog before deletion

3. **Security & Authorization**
   - Test that non-admin users cannot delete others' posts
   - Only allow editing/deleting own posts for regular users

4. **Bot Notifications**
   - When admin deletes a user's post, send bot message: "admin has deleted your post"

---

## Current State Analysis

### ✅ Already Implemented

1. **Environment Variable**
   - `TELEGRAM_ADMIN_ID` exists in `backend/src/types/env.ts:21`
   - Available in worker environment bindings

2. **Post Deletion Infrastructure**
   - `deletePost` endpoint exists in `backend/src/api/posts.ts:209-242`
   - Current implementation checks ownership (user can only delete their own posts)
   - Post deletion service method exists in `PostService`
   - Cascade delete configured in schema for images

3. **Authentication System**
   - Session-based auth with `authenticateUser()` helper in posts.ts
   - Session validation through `SessionManager`
   - Authorization headers supported

4. **Frontend Post UI**
   - `PostItem` component exists with delete button (`frontend/src/components/PostItem.tsx`)
   - Currently shows delete button only for post owner (`canEditDelete` logic line 54)
   - Delete confirmation dialog exists (`DeletePostConfirm.tsx`)
   - User profile display on Account page

5. **Bot Integration**
   - Grammy bot setup in `backend/src/webhook.ts`
   - Bot can send messages (demonstrated in `/start` command)

6. **Database Schema**
   - User profiles table includes `telegramId` field
   - Posts table includes `userId` field for ownership tracking

---

## Gap Analysis

### 🔴 Missing Components

1. **Admin Validation Module**
   - No dedicated admin validation/authorization service
   - No centralized admin role checking
   - Security-focused validation file not implemented

2. **Backend Admin Authorization**
   - `deletePost` endpoint only allows owners to delete
   - No admin override for deletion permissions
   - No admin role check in any endpoint

3. **Frontend Admin Role Awareness**
   - No admin role state in frontend
   - No mechanism to fetch/store admin status
   - Account page doesn't show admin badge

4. **Admin UI Elements**
   - Delete buttons not shown to admin on other users' posts
   - No visual indicators for admin status
   - No admin badge on Account page

5. **Bot Notification System**
   - No notification sent when post is deleted
   - No mechanism to notify post owner about admin actions

6. **Testing**
   - No tests for admin authorization
   - No tests preventing unauthorized deletion

---

## Implementation Plan

### Phase 1: Backend Admin Infrastructure

#### 1.1 Create Admin Authorization Service
**File:** `backend/src/services/admin-auth.ts` (NEW)

```typescript
// Centralized admin validation with security focus
- isAdmin(telegramId: number, env: Env): boolean
- validateAdminAction(sessionUserId: number, env: Env): Promise<boolean>
- getAdminRole(telegramId: number, env: Env): 'admin' | 'user'
```

**Rationale:** Separate file ensures security review focus, centralized logic prevents inconsistencies.

#### 1.2 Update Session Data to Include Role
**File:** `backend/src/types/env.ts`

```typescript
// Add to SessionData interface
isAdmin?: boolean;
role: 'admin' | 'user';
```

#### 1.3 Enhance Session Manager
**File:** `backend/src/services/session-manager.ts`

- Check admin status during session creation
- Store admin role in session data
- Add role to session validation response

#### 1.4 Update Delete Post Endpoint
**File:** `backend/src/api/posts.ts`

- Modify `deletePost` function to check admin role
- Allow deletion if user is owner OR admin
- Track who deleted (owner vs admin) for notifications

#### 1.5 Add Admin Role Endpoint
**File:** `backend/src/api/auth.ts` (NEW endpoint)

```
GET /api/auth/role
Response: { role: 'admin' | 'user', isAdmin: boolean }
```

### Phase 2: Bot Notification System

#### 2.1 Create Notification Service
**File:** `backend/src/services/notification-service.ts` (NEW)

```typescript
- sendPostDeletedNotification(userId: number, postId: number, bot: Bot)
- getBotInstance(env: Env): Bot
```

#### 2.2 Integrate with Delete Endpoint
**File:** `backend/src/api/posts.ts`

- Detect admin deletion (when userId !== session.userId)
- Get post owner's telegram ID from profile
- Send notification via bot

### Phase 3: Frontend Admin UI

#### 3.1 Add Admin State to Auth Hook
**File:** `frontend/src/hooks/use-simple-auth.ts`

- Fetch admin role from backend
- Store in auth context
- Expose `isAdmin` flag

#### 3.2 Update Account Page with Admin Badge
**File:** `frontend/src/pages/Account.tsx`

- Add admin badge near premium indicator
- Style with red marker as specified
- Show only when `isAdmin === true`

#### 3.3 Update PostItem Component
**File:** `frontend/src/components/PostItem.tsx`

- Modify `canEditDelete` logic to include admin check
- Show delete button if: (currentUserId === post.userId) OR isAdmin
- Show edit button only for post owner
- Update button titles to reflect admin action

#### 3.4 Update API Service
**File:** `frontend/src/services/api.ts`

- Add `getUserRole()` method
- Ensure delete request works for admin

### Phase 4: Testing & Security

#### 4.1 Backend Tests
**File:** `backend/src/tests/contract/posts.test.ts` (NEW)

- Test admin can delete any post
- Test non-admin cannot delete others' posts
- Test role validation
- Test notification sending

#### 4.2 Frontend Tests
- Test admin badge rendering
- Test delete button visibility
- Test unauthorized deletion blocked

#### 4.3 Security Audit
- Review admin-auth.ts for vulnerabilities
- Ensure TELEGRAM_ADMIN_ID not exposed to client
- Verify session tampering protection
- Test authorization bypass attempts


---

## File Structure Changes

### New Files (7)
```
backend/src/services/admin-auth.ts
backend/src/services/notification-service.ts
backend/src/tests/contract/admin-posts.test.ts
backend/src/tests/unit/admin-auth.test.ts
frontend/src/tests/admin-ui.test.ts
```

### Modified Files (10)
```
backend/src/types/env.ts
backend/src/services/session-manager.ts
backend/src/api/posts.ts
backend/src/api/auth.ts
backend/src/index.ts (route registration)
frontend/src/hooks/use-simple-auth.ts
frontend/src/pages/Account.tsx
frontend/src/components/PostItem.tsx
frontend/src/services/api.ts
```

---

## Testing Strategy

### Unit Tests
- Admin authorization logic (isolated)
- Role derivation from telegram ID
- Notification message formatting

### Integration Tests
- Admin delete flow (authenticated admin → delete → notification)
- Non-admin delete rejection
- Role endpoint authentication

### Contract Tests
- DELETE /api/posts/:id with admin session
- DELETE /api/posts/:id with non-admin session
- GET /api/auth/role response structure

### Security Tests
- Session tampering attempts
- Direct role manipulation attempts
- Authorization bypass attempts
- TELEGRAM_ADMIN_ID exposure checks

### E2E Tests (Manual)
- Admin logs in, sees badge on Account page
- Admin sees delete button on all posts
- Admin deletes another user's post
- User receives bot notification
- Non-admin cannot delete others' posts

---

## Deployment Strategy

### Prerequisites
- `TELEGRAM_ADMIN_ID` environment variable set in all environments
- Existing sessions may need refresh (users re-login)

### Deployment Steps
1. Deploy backend changes (backward compatible)
2. Deploy frontend changes
3. Monitor error logs for authorization issues
4. Test admin functionality in production
5. Verify bot notifications working

### Rollback Plan
- Backend is backward compatible (admin features additive)
- Frontend rollback if admin UI breaks regular user experience
- No database changes, easy rollback
