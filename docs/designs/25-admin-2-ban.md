# Admin Ban Feature - Design Document

## Overview
**MVP Simplified Approach**: Enable administrators to ban/unban users. Banned users cannot authenticate (auth fails). Banned profiles show "BANNED" badge. Posts are filtered from feed.

---

## 1. Feasibility Check

### ✅ Feasible
All requirements are technically feasible with current stack:
- **Database**: SQLite (D1) supports adding ban field and index
- **Backend**: Hono.js can handle new ban/unban endpoints
- **Frontend**: React can implement ban UI and conditional rendering
- **Admin System**: Existing admin authentication system (`isAdmin`, `getAdminRole`) is fully functional

### Technical Constraints
- **No Caching**: Posts are not cached (confirmed by user)
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

❌ **Backend API**
- No `POST /api/admin/ban/:telegramId` endpoint
- No `POST /api/admin/unban/:telegramId` endpoint
- Feed endpoint doesn't filter out banned users' posts
- Profile endpoint doesn't return ban status
- Auth doesn't check ban status

❌ **Frontend UI**
- No "BAN/UNBAN" button on profile page for admins
- No confirmation dialog for ban/unban actions
- No "BANNED" badge on profile
- Auth error message doesn't mention ban possibility

---

## 3. Design Decisions (MVP Simplified)

### ✅ **Ban = Auth Fails**
- Banned users cannot authenticate at all
- Auth error shows: "Authentication failed or you were banned"
- No special "You are banned" page needed
- Simpler implementation: ban check added to auth flow
- Banned user tries to open app → auth fails → sees Telegram auth error screen

### ✅ **Ban Visibility**
- Everyone sees "BANNED" badge on banned user's profile
- Profile shows minimal placeholder info (just display name like "John Doe")
- Bio, avatar, contact info all hidden
- Admin sees UNBAN button; regular users just see badge

### ✅ **Post Visibility**
- Posts remain in database but filtered from feed (`getAllPosts`)
- Posts reappear automatically when user is unbanned
- Admins can see banned users' posts in their profile view
- Regular users see banned profile with BANNED badge but no posts

### ✅ **No Audit Trail (MVP)**
- Just `isBanned` field (integer 0/1)
- No `bannedAt`, `bannedBy`, or ban reason tracking
- Pure MVP simplicity: just a toggle switch
- Can add audit trail later if needed

### ✅ **Confirmation Pattern**
- Ban action requires confirmation dialog
- Unban action requires confirmation dialog
- Same dialog pattern for consistency

### ✅ **Bot Notifications**
- Send Telegram bot message when user is banned
- User can still use bot (e.g., /start), just can't open web app
- Use existing notification infrastructure (similar to `sendPostDeletedNotification`)
- Message: "You have been banned. You cannot access the web app."

---

## 4. Implementation Plan (MVP Simplified)

### Phase 1: Database Changes
**Files**: `backend/src/db/schema.ts`, `backend/drizzle/migrations/0004_add_user_ban_field.sql`

1. Add field to `user_profiles`:
   - `isBanned: integer (0/1)` - ban status (default 0)

2. Create migration: `0004_add_user_ban_field.sql`

3. Add index on `isBanned` for feed filtering performance

### Phase 2: Backend - Ban Management API
**Files**: `backend/src/api/admin.ts` (new), `backend/src/index.ts`, `backend/src/services/notification-service.ts`

1. Create `admin.ts` with endpoints:
   - `POST /api/admin/ban/:telegramId` - Ban user (admin only)
   - `POST /api/admin/unban/:telegramId` - Unban user (admin only)

2. Admin authorization using existing `isAdmin()` function

3. Add `sendBanNotification()` function to notification service

4. Send bot notification on ban action

### Phase 3: Backend - Ban Enforcement
**Files**: `backend/src/api/auth.ts`, `backend/src/api/posts.ts`, `backend/src/services/post-service.ts`, `backend/src/api/profile.ts`, `backend/src/services/profile-service.ts`

1. Update auth (`/api/auth/telegram`) to check ban status:
   - Query `is_banned` field after telegram validation
   - Return 401 with message "Authentication failed or you were banned" if banned

2. Update `getAllPosts()` to exclude banned users' posts:
   - Add `WHERE user_profiles.is_banned = 0` to query

3. Update `getProfile()` to return minimal info for banned users:
   - Return `is_banned: true` field
   - Only return display_name, hide bio/avatar/contact_links for banned profiles

4. Update `getUserPostsWithImages()` to check ban status:
   - If viewer is not admin and user is banned, return empty array

### Phase 4: Frontend - Admin Ban Controls & Profile Display
**Files**: `frontend/src/pages/UnifiedProfile.tsx`, `frontend/src/components/BanUserConfirm.tsx` (new)

1. Create `BanUserConfirm.tsx` confirmation dialog component

2. Update `UnifiedProfile.tsx`:
   - Add "BAN/UNBAN" button for admins viewing other users
   - Show "BANNED" badge on banned profiles (visible to everyone)
   - Show minimal profile info for banned users (just display name)
   - Hide bio, avatar, contact info for banned profiles
   - Handle ban/unban API calls

### Phase 5: Frontend - Auth Error Message
**Files**: `frontend/src/pages/Account.tsx` or auth component

1. Update auth error handling to show:
   - "Authentication failed or you were banned"

### Phase 6: Testing
**Files**: Test manually first, then add contract tests

1. Manual testing:
   - Admin can ban user
   - Admin can unban user
   - Non-admin cannot ban
   - Banned user cannot authenticate
   - Feed excludes banned users' posts
   - Profile shows ban badge

---

## 5. API Specifications (MVP)

### POST /api/admin/ban/:telegramId
**Auth**: Admin only
**Request**: Empty body
**Response**:
```json
{
  "success": true,
  "message": "User banned successfully"
}
```
**Errors**: 401 (not admin), 404 (profile not found), 400 (already banned)

### POST /api/admin/unban/:telegramId
**Auth**: Admin only
**Request**: Empty body
**Response**:
```json
{
  "success": true,
  "message": "User unbanned successfully"
}
```
**Errors**: 401 (not admin), 404 (profile not found), 400 (not banned)

### POST /api/auth/telegram (Updated)
**Response** (when user is banned):
```json
{
  "error": "Authentication failed or you were banned"
}
```
**Status**: 401

### GET /api/profile/:telegramId (Updated)
**Response** (when user is banned - minimal info):
```json
{
  "profile": {
    "telegram_id": 123456789,
    "display_name": "John Doe",
    "is_banned": true
  }
}
```
Note: bio, avatar, contact_links hidden for banned users

---

## 6. Database Schema Changes (MVP)

### Migration 0004: Add Ban Field
```sql
-- Add ban field to user_profiles
ALTER TABLE `user_profiles` ADD `is_banned` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_user_profiles_is_banned` ON `user_profiles` (`is_banned`);
```

### Schema Updates (TypeScript)
```typescript
// backend/src/db/schema.ts
export const userProfiles = sqliteTable('user_profiles', {
  // ... existing fields ...
  isBanned: integer('is_banned').default(0).notNull(),
}, (table) => ({
  // ... existing indexes ...
  isBannedIdx: index('idx_user_profiles_is_banned').on(table.isBanned),
}));
```

---

## 7. UI/UX Specifications (MVP)

### Admin View of Banned User Profile
```
┌─────────────────────────────────────┐
│ Profile                             │
├─────────────────────────────────────┤
│                                     │
│ John Doe [🔴 BANNED]               │  ← Badge visible to everyone
│                                     │
│ [UNBAN BUTTON]                     │  ← Only visible to admins
│                                     │
│ Posts (5)                           │  ← Visible to admins only
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
│ John Doe [🔴 BANNED]               │  ← Badge visible to everyone
│                                     │
│ Posts (0)                           │  ← No posts shown
│                                     │
│   No posts yet.                    │
│                                     │
└─────────────────────────────────────┘
```

### Admin View of Non-Banned User Profile
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
│ [BAN BUTTON]                       │  ← Only visible to admins
│                                     │
│ Posts (5)                           │
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
│ • Prevent login/authentication     │
│ • Hide all their posts from feed   │
│                                     │
│                                     │
│     [Cancel]  [Ban User]            │
│                                     │
└─────────────────────────────────────┘
```

### Unban Confirmation Dialog
```
┌─────────────────────────────────────┐
│ Unban User?                     [X] │
├─────────────────────────────────────┤
│                                     │
│ Are you sure you want to unban      │
│ @johndoe?                           │
│                                     │
│ This will:                          │
│ • Allow them to log in again       │
│ • Show their posts in feed         │
│                                     │
│                                     │
│     [Cancel]  [Unban User]          │
│                                     │
└─────────────────────────────────────┘
```

---

## 8. Security Considerations (MVP)

1. **Admin-Only Access**: All ban/unban endpoints validate admin role using `isAdmin()`
2. **No Self-Ban**: Admins cannot ban themselves (add validation)
3. **Auth Layer Ban Check**: Ban check happens at authentication, preventing all access

---

## 9. Future Enhancements (Out of MVP Scope)

- [ ] Add `bannedAt` timestamp
- [ ] Add `bannedBy` field to track which admin
- [ ] Add ban reason field (and show in notification)
- [ ] Add ban history log
- [ ] Add temporary bans with auto-unban
- [ ] Multi-admin system

---

## 10. Success Criteria (MVP)

✅ Admin can ban user from profile page with confirmation
✅ Admin can unban user from profile page with confirmation
✅ Non-admin cannot access ban/unban endpoints
✅ Banned user receives Telegram bot notification
✅ Banned user cannot authenticate (gets error message)
✅ Banned user's profile shows "BANNED" badge with minimal info
✅ Banned user's posts are hidden from feed
✅ Admins can see banned user's posts in profile view
✅ Unbanned user's posts reappear in feed automatically
✅ Unbanned user can authenticate normally

---

**Document Version**: 2.0 (MVP Simplified)
**Created**: 2025-10-01
**Last Updated**: 2025-10-01
**Status**: Approved - Ready for Implementation
