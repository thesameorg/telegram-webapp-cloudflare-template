# User Profile Implementation Plan

## Current App Analysis

### Existing Structure
- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Cloudflare Workers with Hono.js, D1 database
- **Current Pages**: Feed, My Posts, Account
- **Database Tables**: `posts`, `post_images`
- **Authentication**: Telegram Web App authentication

### Current Features
- ✅ User authentication via Telegram
- ✅ Post creation with image uploads
- ✅ My Posts page showing user's own posts
- ✅ Feed page showing all posts
- ✅ Account page showing Telegram user info
- ✅ Image gallery with thumbnail support

## Requirements Analysis

Based on `temp_docs/10-profile-page.md`:

### 1. Edit Profile Page ("My Profile")
- Editable user profile data:
  - Display name (overrides Telegram first_name)
  - Bio
  - Contact links
  - Phone number
  - Profile picture upload (512px JPEG)
- Must invalidate posts cache when display name changes
- Session-secured by Telegram ID

### 2. Public Profile Page
- Read-only view accessible by clicking username/avatar on posts page
- Shows user info + list of their posts
- Similar to "My Posts" but for viewing other users

## Implementation Plan

### Phase 1: Database Schema Extensions

#### 1.1 User Profiles Table
```sql
CREATE TABLE user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  phone_number TEXT,
  contact_links TEXT, -- JSON string
  profile_image_key TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_telegram_id ON user_profiles(telegram_id);
```

#### 1.2 Update Posts Display Logic
- Modify post queries to join with user_profiles
- Use profile.display_name if available, fallback to Telegram first_name
- Update post cache invalidation when profile changes
- make cache avoid N+1 problem

### Phase 2: Backend API Extensions

#### 2.1 Profile Management Endpoints
```typescript
// GET /api/profile/:telegramId - Get user profile (public)
// GET /api/profile/me - Get current user's profile
// PUT /api/profile/me - Update current user's profile
// POST /api/profile/me/avatar - Upload profile picture
```

#### 2.2 Profile Service
```typescript
class ProfileService {
  async getProfile(telegramId: number): Promise<UserProfile | null>
  async updateProfile(telegramId: number, data: ProfileUpdateData): Promise<UserProfile>
  async uploadAvatar(telegramId: number, image: File): Promise<string>
  async invalidateUserPostsCache(telegramId: number): Promise<void>
}
```

#### 2.3 Enhanced Posts API
- Update posts queries to include profile data
- Add profile info to post responses
- Implement cache invalidation strategy

### Phase 3: Frontend Components

#### 3.1 Profile Components
```
src/components/profile/
├── ProfileEditor.tsx       - Edit profile form
├── ProfileView.tsx         - Read-only profile display
├── ProfileAvatar.tsx       - Avatar with upload
├── ContactLinks.tsx        - Contact links manager
└── ProfileSkeleton.tsx     - Loading state
```

#### 3.2 Updated PostItem Component
- Make username/avatar clickable
- Navigate to user profile page
- Use profile display name instead of Telegram name

#### 3.3 Enhanced Account Page
- Transform current Account page into "My Profile" editor
- Add profile editing capabilities
- Keep session/app info in separate tab or section

### Phase 4: Routing and Navigation

#### 4.1 New Routes
```typescript
// Add to Router.tsx
{
  path: 'profile/:telegramId',
  element: <UserProfile />,
},
{
  path: 'profile/edit',
  element: <EditProfile />,
}
```

#### 4.2 Navigation Updates
- Update PostItem to link usernames to profiles
- Add "Edit Profile" button to current user's profile
- Update BottomNavigation if needed

### Phase 5: Image Handling

#### 5.1 Profile Picture Upload
- Reuse existing ImageUpload component
- Resize to 512px JPEG (similar to post images)
- Store in R2 with profile-specific keys

#### 5.2 Avatar Display
- Default gradient avatar with initials (current)
- Profile picture overlay when available
- Consistent sizing across app

### Phase 6: Caching and Performance

#### 6.1 Posts Cache Invalidation

When profile display_name changes:
- Update all posts by this user
- invalidate posts cache & profile cache

#### 6.2 Profile Caching
- Cache profile data with appropriate TTL


## Technical Implementation Details

### Database Migration Script
```sql
-- Add to backend/src/db/migrations/
-- XXX_add_user_profiles.sql
```

### Contact Links Format
```typescript
interface ContactLinks {
  website?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  telegram?: string;
}
```

### Profile Validation Schema
```typescript
const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  bio: z.string().max(160).optional(),
  phone_number: z.string().max(20).optional(),
  contact_links: z.object({
    website: z.string().url().optional(),
    twitter: z.string().max(50).optional(),
    instagram: z.string().max(50).optional(),
    linkedin: z.string().max(50).optional(),
    telegram: z.string().max(50).optional(),
  }).optional()
});
```

## Migration Strategy

### 1. Backward Compatibility
- not needed, remove & drop everything
- including users, posts, etc.

### 2. Data Migration
- Not nedded, start from scratch

## Security Considerations

### 1. Profile Privacy
- Public profiles show limited information
- Users control what contact info is visible
- Validate all profile inputs

### 3. Session Security
- Verify Telegram ID matches session
- Prevent profile editing by unauthorized users
- Audit profile changes

## Performance Impact

### 1. Database Queries
- Profile JOIN adds minimal overhead
- Indexed by telegram_id for fast lookups
- Consider query optimization

### 2. Cache Strategy
- Profile data cached separately from posts
- Smart invalidation prevents cascade updates

### 3. Bundle Size
- New components add ~10-15KB
- Image handling reuses existing code
- Lazy load profile editor

## Testing Strategy

### 1. Backend Tests
- Profile CRUD operations
- Cache invalidation logic
- Image upload handling

### 2. Frontend Tests
- Profile component rendering
- Navigation between profiles
- Form validation


## Rollout Plan

### Phase 1: Database + Backend API (Week 1)
- Deploy schema changes
- Implement profile endpoints
- Test API functionality

### Phase 2: Profile Viewing (Week 2)
- Add public profile pages
- Update PostItem navigation
- Test profile viewing

### Phase 3: Profile Editing (Week 3)
- Implement profile editor
- Add avatar upload
- Test profile updates

### Phase 4: Cache Invalidation (Week 4)
- Implement post cache updates
- Test display name propagation
- Performance optimization

### Phase 5: Polish & Testing (Week 5)
- UI/UX improvements
- Comprehensive testing
