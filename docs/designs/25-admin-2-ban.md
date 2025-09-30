# Admin Ban Feature - Design Document

## Overview
Enable administrators to ban and unban users from the platform, preventing banned users from posting and viewing content while providing appropriate UI/UX feedback.

---

## 1. Feasibility Check

### ✅ Feasible
All requirements are technically feasible with current stack:
- **Database**: SQLite (D1) supports adding ban fields and indexes
- **Backend**: Hono.js can handle new ban/unban endpoints
- **Frontend**: React can implement ban UI and conditional rendering
- **Admin System**: Existing admin authentication system (`isAdmin`, `getAdminRole`) is fully functional
- **Notification System**: Bot notification infrastructure exists (used in post deletion)

### Technical Constraints
- **Caching**: Feed caching must be updated to exclude banned users' posts
- **Session Data**: Sessions already contain `role` field; may need to add `isBanned` flag for quick checks
- **Database Migrations**: Requires new D1 migration for schema changes

---

## 2. Fit-Gap Analysis

### Current State (What Exists)
✅ **Admin System**
- Admin role detection via `TELEGRAM_ADMIN_ID` env variable
- Session includes `role: 'admin' | 'user'` field
- `isAdmin()`, `getAdminRole()`, `validateAdminAction()` functions in `admin-auth.ts`
- Admin can delete other users' posts (implemented in `posts.ts:189-278`)

✅ **Profile System**
- `user_profiles` table with user data
- Profile viewing via `/api/profile/:telegramId`
- Profile page UI (`UnifiedProfile.tsx`)

✅ **Post System**
- Posts table with `userId` field
- Feed filtering by user via `getUserPostsWithImages()`
- Admin delete with notifications

✅ **Notification System**
- Bot integration for sending messages (`sendPostDeletedNotification`)

### Gaps (What's Missing)

❌ **Database Schema**
- No `isBanned` field in `user_profiles` table
- No `bannedAt` timestamp field
- No `bannedBy` field to track which admin banned the user

❌ **Backend API**
- No `POST /api/admin/ban/:telegramId` endpoint
- No `POST /api/admin/unban/:telegramId` endpoint
- No middleware/check to prevent banned users from creating posts
- Feed endpoint doesn't filter out banned users' posts
- Profile endpoint doesn't indicate ban status

❌ **Frontend UI**
- No "BAN" button on profile page for admins
- No confirmation dialog for ban action
- No "User is banned" placeholder on profile page
- No "You are banned" full-page message for banned users
- No banned status indicator in feed

❌ **Session/Auth**
- Sessions don't include `isBanned` flag for quick checks
- No ban check in post creation flow

---

## 3. Clarification Questions

### 1. **Ban Scope - What can banned users do?**
   - ❓ Can banned users view their own profile and posts?
   - ❓ Can banned users view other profiles?
   - ❓ Can banned users access the feed at all (even if empty)?
   - ❓ Can banned users edit their existing posts?
   - **Proposed**: Banned users see only "You are banned" page on app open, no access to any features

### 2. **Ban Visibility - Who sees what?**
   - ❓ When viewing a banned user's profile, what information is visible to regular users vs admins?
   - ❓ Do we show "User banned by [admin name]" or just "User was banned"?
   - **Proposed**:
     - Regular users: "User was banned" placeholder with no other info
     - Admins: Full profile visible with "BANNED" badge and unban button

### 3. **Post Visibility - What happens to existing posts?**
   - ❓ Should banned users' posts be permanently hidden or just filtered from feed?
   - ❓ If user is unbanned, do posts reappear automatically?
   - ❓ Can admins still see banned users' posts?
   - **Proposed**:
     - Posts remain in database but filtered from feed
     - Posts reappear when user is unbanned
     - Admins can see banned users' posts in profile view

### 4. **Notification Details**
   - ❓ What exact message should banned users receive?
   - ❓ Should notification include reason for ban?
   - ❓ Should admins get notification when they ban someone?
   - **Proposed**:
     - User receives: "You have been banned from the platform. Your posts will not be visible to other users."
     - No reason provided in MVP
     - No admin notification (action is immediate)

### 5. **Multiple Admins**
   - ❓ Currently only one `TELEGRAM_ADMIN_ID` - will there be multiple admins?
   - ❓ Should we track which admin performed the ban?
   - **Proposed**: Track `bannedBy` admin ID for audit trail, prepare for multi-admin future

### 6. **Unban Confirmation**
   - ❓ Should unban also require confirmation like ban?
   - **Proposed**: Yes, same confirmation pattern for consistency

### 7. **Ban Status Persistence**
   - ❓ Should ban checks happen on every request or cache in session?
   - **Proposed**:
     - Add `isBanned` to session data on login
     - Check on post creation/update
     - Invalidate session on ban/unban

---

## 4. Implementation Plan

### Phase 1: Database Changes
**Files**: `backend/src/db/schema.ts`, new migration

1. Add fields to `user_profiles`:
   - `isBanned: integer (0/1)` - ban status
   - `bannedAt: text` - ISO timestamp of ban
   - `bannedBy: integer` - telegram ID of admin who banned

2. Create migration: `0004_add_user_ban_fields.sql`

3. Add index on `isBanned` for feed filtering

### Phase 2: Backend - Ban Management API
**Files**: `backend/src/api/admin.ts` (new), `backend/src/index.ts`

1. Create `admin.ts` with endpoints:
   - `POST /api/admin/ban/:telegramId` - Ban user (admin only)
   - `POST /api/admin/unban/:telegramId` - Unban user (admin only)

2. Add admin authorization middleware

3. Update `SessionData` type to include `isBanned: boolean`

4. Update `session-manager.ts` to include ban status in sessions

5. Add ban notification function in `notification-service.ts`

### Phase 3: Backend - Ban Enforcement
**Files**: `backend/src/api/posts.ts`, `backend/src/services/post-service.ts`, `backend/src/api/profile.ts`

1. Update `getAllPosts()` to exclude banned users' posts:
   - Add `WHERE user_profiles.isBanned = 0` to query

2. Update `getUserPostsWithImages()` to check ban status

3. Add ban check in `createPost()`:
   - Return 403 if `session.isBanned === true`

4. Update `updatePost()` with same ban check

5. Update `getProfile()` to return ban status:
   - Return minimal profile with `isBanned: true` flag

6. Update profile service to handle banned profiles

### Phase 4: Frontend - Admin Ban Controls
**Files**: `frontend/src/pages/UnifiedProfile.tsx`, `frontend/src/components/BanUserConfirm.tsx` (new)

1. Create `BanUserConfirm.tsx` confirmation dialog component

2. Update `UnifiedProfile.tsx`:
   - Add "BAN" button next to profile actions (visible only to admins viewing others)
   - Add "UNBAN" button for banned users
   - Add handler for ban/unban actions
   - Show ban status badge for admins

3. Create API client functions:
   - `banUser(telegramId: number)`
   - `unbanUser(telegramId: number)`

### Phase 5: Frontend - Banned User Experience
**Files**: `frontend/src/pages/BannedUserPage.tsx` (new), `frontend/src/App.tsx`, `frontend/src/pages/UnifiedProfile.tsx`, `frontend/src/pages/Feed.tsx`

1. Create `BannedUserPage.tsx`:
   - Full-page message: "You are banned"
   - Subtext: "Your account has been banned. You cannot post or view content. Please contact support if you believe this is an error."

2. Update `App.tsx`:
   - Check `user.isBanned` on app load
   - Redirect to `BannedUserPage` if banned

3. Update profile view:
   - Show "User was banned" placeholder for banned users (non-admin viewers)
   - Hide posts section for banned users (non-admin viewers)

4. Update `Feed.tsx`:
   - Banned users shouldn't reach feed, but add check anyway

5. Update post creation:
   - Disable post creation if user is banned (shouldn't happen, but defensive)

### Phase 6: Testing & Validation
**Files**: `backend/src/tests/contract/admin-ban.test.ts` (new), `frontend/src/components/__tests__/` (new tests)

1. Backend tests:
   - Admin can ban user
   - Admin can unban user
   - Non-admin cannot ban
   - Banned user cannot create post
   - Feed excludes banned users' posts
   - Profile shows ban status

2. Frontend tests:
   - Ban button visible only to admins
   - Confirmation dialog works
   - Banned user sees banned page
   - Banned profile shows placeholder

3. Integration testing:
   - Full ban workflow
   - Unban and post reappearance
   - Session invalidation

---

## 5. API Specifications

### POST /api/admin/ban/:telegramId
**Auth**: Admin only
**Request**: Empty body or optional `{ reason?: string }`
**Response**:
```json
{
  "success": true,
  "message": "User banned successfully",
  "bannedUserId": 123456789
}
```
**Errors**: 401 (not admin), 404 (user not found), 400 (already banned)

### POST /api/admin/unban/:telegramId
**Auth**: Admin only
**Request**: Empty body
**Response**:
```json
{
  "success": true,
  "message": "User unbanned successfully",
  "unbannedUserId": 123456789
}
```
**Errors**: 401 (not admin), 404 (user not found), 400 (not banned)

### GET /api/profile/:telegramId (Updated)
**Response** (when user is banned):
```json
{
  "profile": {
    "telegram_id": 123456789,
    "display_name": null,
    "bio": null,
    "isBanned": true,
    "bannedAt": "2025-10-01T12:00:00Z"
  }
}
```

---

## 6. Database Schema Changes

### Migration 0004: Add Ban Fields
```sql
-- Add ban-related fields to user_profiles
ALTER TABLE user_profiles ADD COLUMN is_banned INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE user_profiles ADD COLUMN banned_at TEXT;
ALTER TABLE user_profiles ADD COLUMN banned_by INTEGER;

-- Create index for efficient ban filtering in queries
CREATE INDEX idx_user_profiles_is_banned ON user_profiles(is_banned);

-- Create index for banned_by (useful for admin audit queries)
CREATE INDEX idx_user_profiles_banned_by ON user_profiles(banned_by);
```

### Schema Updates (TypeScript)
```typescript
// backend/src/db/schema.ts
export const userProfiles = sqliteTable('user_profiles', {
  // ... existing fields ...
  isBanned: integer('is_banned').default(0).notNull(),
  bannedAt: text('banned_at'),
  bannedBy: integer('banned_by'),
}, (table) => ({
  // ... existing indexes ...
  isBannedIdx: index('idx_user_profiles_is_banned').on(table.isBanned),
  bannedByIdx: index('idx_user_profiles_banned_by').on(table.bannedBy),
}));
```

---

## 7. UI/UX Specifications

### Admin View of User Profile
```
┌─────────────────────────────────────┐
│ Profile                             │
├─────────────────────────────────────┤
│ [Profile Image]                     │
│                                     │
│ John Doe                            │
│ @johndoe                            │
│                                     │
│ Bio text here...                    │
│                                     │
│ [🔴 BANNED] [UNBAN BUTTON]         │  ← Only visible to admins
│                                     │
│ Posts (5)                           │
│ ┌─────────────────────────────┐    │
│ │ Post 1...                   │    │
│ └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Regular User View of Banned Profile
```
┌─────────────────────────────────────┐
│ Profile                             │
├─────────────────────────────────────┤
│                                     │
│   ⛔ User was banned                │
│                                     │
│   This user is no longer active    │
│   on the platform.                 │
│                                     │
└─────────────────────────────────────┘
```

### Banned User View (App Root)
```
┌─────────────────────────────────────┐
│                                     │
│   🚫 You are banned                 │
│                                     │
│   Your account has been banned.    │
│   You cannot post or view content. │
│                                     │
│   If you believe this is an error, │
│   please contact support.          │
│                                     │
└─────────────────────────────────────┘
```

### Ban Confirmation Dialog
```
┌─────────────────────────────────────┐
│ Ban User?                       [X] │
├─────────────────────────────────────┤
│                                     │
│ Are you sure you want to ban        │
│ @johndoe?                           │
│                                     │
│ This will:                          │
│ • Hide all their posts from feed   │
│ • Prevent them from posting        │
│ • Show a banned message            │
│                                     │
│                                     │
│     [Cancel]  [Ban User]            │
│                                     │
└─────────────────────────────────────┘
```

---

## 8. Security Considerations

1. **Admin-Only Access**: All ban/unban endpoints must validate admin role
2. **Session Invalidation**: Ban/unban should invalidate user's active sessions
3. **Audit Trail**: Track who banned whom and when
4. **No Self-Ban**: Admins cannot ban themselves (add validation)
5. **Rate Limiting**: Consider rate limiting ban actions to prevent abuse

---

## 9. Open Questions / Future Enhancements

- [ ] Add ban reason field and display to user
- [ ] Add appeal mechanism
- [ ] Add temporary bans with auto-unban
- [ ] Add ban history log
- [ ] Add bulk ban operations
- [ ] Add ban statistics to admin dashboard
- [ ] Email/external notification for bans (if email system added)
- [ ] Multi-admin system with role-based permissions

---

## 10. Rollout Plan

1. **Deploy database migration** (no downtime)
2. **Deploy backend** with new endpoints
3. **Deploy frontend** with ban UI
4. **Test in preview environment** with test bot
5. **Deploy to production**
6. **Monitor error logs** for first 24 hours

---

## Success Criteria

✅ Admin can ban user from profile page
✅ Admin can unban user from profile page
✅ Both actions require confirmation
✅ Banned user receives notification
✅ Banned user's profile shows "User was banned" to regular users
✅ Banned user's posts are hidden from feed
✅ Banned user sees "You are banned" page on app open
✅ Unbanned user's posts reappear in feed
✅ All tests pass

---

**Document Version**: 1.0
**Created**: 2025-10-01
**Last Updated**: 2025-10-01
**Status**: Draft - Awaiting Clarifications
