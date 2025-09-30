# Profile Default Values from Telegram - Implementation Plan

## Current State

**Session Data (stored in KV):**
- `username` - Telegram @username
- `displayName` - Computed from `first_name` + `last_name`
- `profilePictureUrl` - Telegram profile photo URL
- Source: `session-manager.ts:17-41`

**Profile Database (`user_profiles` table):**
- `telegram_id` (unique identifier)
- `display_name` (currently NULL on creation)
- `username` (field doesn't exist yet)
- `bio`
- `phone_number`
- `contact_links`
- `profile_image_key`
- Source: `backend/drizzle/migrations/0002_windy_dark_beast.sql`

**Current Behavior:**
- When profile doesn't exist, `ProfileService.createProfile()` creates it with **only** `telegramId`
- All other fields (display_name, bio, etc.) are NULL
- User sees completely empty profile on first visit
- Source: `profile-service.ts:25-38`

## Problem

Users expect their Telegram username and display name to be pre-populated when they first visit their profile page, but currently they see empty fields.

## Solution

Automatically populate profile with Telegram data when creating profile for first-time users.

## Implementation Steps

### 1. Add `username` Column to Database Schema

**File:** Create new migration in `backend/drizzle/migrations/`

```sql
ALTER TABLE `user_profiles` ADD COLUMN `username` text;
CREATE INDEX `idx_user_profiles_username` ON `user_profiles` (`username`);
```

**File:** Update `backend/src/db/schema.ts` to include `username` field in `userProfiles` table definition

### 2. Modify ProfileService.createProfile()

**File:** `backend/src/services/profile-service.ts:25-38`

**Changes:**
- Add optional parameters: `username?: string`, `displayName?: string`
- Include these values in `newProfile` object when creating profile
- If provided, set `username` and `displayName` fields

### 3. Update getMyProfile() Handler

**File:** `backend/src/api/profile.ts:58-62`

**Changes:**
- When creating profile (if it doesn't exist), pass session data:
  ```typescript
  profile = await profileService.createProfile(
    session.userId,
    session.username,
    session.displayName
  );
  ```

### 4. Update Profile Response Format

**File:** `backend/src/api/profile.ts:68-77`

**Changes:**
- Add `username` field to response object in `getMyProfile()`
- Ensure frontend receives username data

### 5. Update TypeScript Types

**Files to update:**
- `backend/src/db/schema.ts` - Add `username` to UserProfile type
- `backend/src/models/profile.ts` - Update response types if needed

## Files to Modify

1. `backend/drizzle/migrations/` - New migration file
2. `backend/src/db/schema.ts` - Schema definition
3. `backend/src/services/profile-service.ts` - createProfile method
4. `backend/src/api/profile.ts` - getMyProfile handler

## Testing Checklist

- [ ] New user logs in → profile created with username & display_name from Telegram
- [ ] Existing user (no username in DB) → username remains NULL (backward compatible)
- [ ] Profile API returns username field in response
- [ ] Frontend displays pre-populated username and display name

## Notes

- Profile image is intentionally skipped (user will upload their own)
- This is a one-time initialization - users can change these values later
- Backward compatible - existing profiles without username will continue to work