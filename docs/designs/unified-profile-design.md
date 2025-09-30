
# Initial task
**unify account and "my posts"**
i want to combine together the "my posts" and "my profile" (/me) pages. they are already similar and have lots of common functions, methods, etc. in view mode /me it already exists as user-profile thing. edit mode is only in "my profile" page. 
- if it is "my" page
    - we should see a collapsed "session-info" part
    - we should see a collapsed "app info" part
    - we should see "telegram info" part
    - we should have "edit" button
    - i should keep possibility to edit & delete my posts
- if it is other user's page - we should see it as we see now the /profile/ page
- in both my and other's page i should see post list
- we remove "post" button and leave it only for "feed" page



# Unified Profile Design: Account + MyPosts Consolidation

**Date**: 2025-09-30
**Status**: Planning
**Related**: temp_docs/10-unify.md

## Executive Summary

This design consolidates the `/account` and `/my-posts` pages into a unified profile experience that serves both "my profile" and "other user profile" views through intelligent context detection.

---

## 1. Feasibility Analysis

### ✅ Highly Feasible

**Existing Infrastructure**:
- `ProfileView` component already handles both own/other profiles (isOwnProfile prop)
- `UserProfile.tsx` demonstrates the pattern for viewing other users with posts
- `StaticPostList` and `PostList` components already support conditional actions
- Profile data fetching exists for both `/me` and `/:telegramId` endpoints

**Code Reusability**:
- ~80% of needed functionality already exists
- `ProfileView` component is shared between Account and UserProfile
- Post management logic is already modular (edit/delete modals)
- Authentication context readily available via `useSimpleAuth` hook

**Technical Risks**: **Low**
- No database schema changes required
- No API changes required
- Routing changes are straightforward
- Component composition is well-structured

---

## 2. Fit-Gap Analysis

### Current State vs Requirements

| Requirement | Account Page | MyPosts Page | UserProfile | Gap |
|------------|--------------|--------------|-------------|-----|
| Profile display | ✅ ProfileView | ❌ None | ✅ ProfileView | None |
| Post list | ❌ None | ✅ PostList | ✅ StaticPostList | MyPosts missing profile |
| Edit profile button | ✅ Present | ❌ None | ❌ Not for own | None (conditional) |
| Edit/delete posts | ❌ None | ✅ Present | ✅ Conditional | None |
| Session info (collapsible) | ✅ Expanded | ❌ None | ❌ None | **Need collapsible** |
| App info (collapsible) | ✅ Expanded | ❌ None | ❌ None | **Need collapsible** |
| Telegram info | ✅ Expanded | ❌ None | ❌ None | None (move to unified) |
| Create post button | ❌ None | ✅ Present | ❌ None | **Remove from unified** |

### Key Gaps Identified

1. **Collapsible Sections**: Session info and App info need to become collapsible/expandable sections
2. **Post Creation**: Should ONLY be available on Feed page (requirement: remove from unified profile)
3. **Own Profile Detection**: UserProfile already has this logic, but needs refinement
4. **Navigation Update**: Bottom navigation needs to point to unified profile instead of separate pages

---

## 3. Proposed Architecture

### 3.1 Route Changes

**Before**:
```
/account       → Account.tsx
/my-posts      → MyPosts.tsx
/profile/:id   → UserProfile.tsx
```

**After**:
```
/profile/:id   → UnifiedProfile.tsx (detects own vs other profile)
```

**Note**: No special `/me` route. UnifiedProfile intelligently detects if viewing own profile by comparing route param with current user ID.

### 3.2 Component Structure

```
UnifiedProfile.tsx
├── ProfileHeader (with Edit button if isOwnProfile)
├── ProfileView (existing component)
├── TelegramInfoSection (from Account)
├── CollapsibleSection: Session Info (if isOwnProfile)
├── CollapsibleSection: App Info (if isOwnProfile)
└── PostsSection
    ├── PostList (if isOwnProfile || isAdmin - with actions)
    └── StaticPostList (if viewing others)
```

### 3.3 New Components Needed

1. **CollapsibleSection.tsx**
   - Reusable accordion component
   - Props: `title`, `children`, `defaultExpanded`
   - State: local expansion toggle
   - **Default**: All sections collapsed (`defaultExpanded={false}`)

2. **TelegramInfoSection.tsx**
   - Extract from Account.tsx lines 107-152
   - Make standalone component
   - Props: `user`, `isAdmin`

### 3.4 Modified Components

1. **BottomNavigation.tsx**
   - Replace `/my-posts` with `/profile/{currentUserId}`
   - Shorten labels: "Feed" → keep, "My Posts" → "Profile", "Account" → remove
   - Remove `/account` tab entirely

2. **UnifiedProfile.tsx** (new, combines Account + MyPosts + UserProfile)
   - Intelligent detection: if `telegramId` matches current user ID
   - Conditional rendering based on `isOwnProfile`
   - Manages modals: EditPost, DeletePostConfirm
   - **Admin rule**: Admins do NOT see session/app info for other users

3. **Feed.tsx**
   - No changes (keeps CreatePostButton)

---

## 4. Implementation Plan

### Phase 1: Create New Components
1. Create `CollapsibleSection.tsx` component
2. Create `TelegramInfoSection.tsx` component
3. Create `UnifiedProfile.tsx` combining logic from Account, MyPosts, UserProfile

### Phase 2: Update Routing
1. Update `/profile/:telegramId` → UnifiedProfile
2. Remove `/account` and `/my-posts` routes entirely (no redirects needed)

### Phase 3: Update Navigation
1. Modify BottomNavigation to point to `/profile/{currentUserId}`
2. Shorten labels appropriately
3. Remove "Account" tab entirely

### Phase 4: Clean Up
1. **Delete** Account.tsx, MyPosts.tsx, UserProfile.tsx
2. Remove any unused imports or references

### Phase 5: Testing & Refinement
1. Test own profile view with all sections
2. Test other user profile view
3. Test edit/delete post actions
4. Test collapsible sections state
5. Verify admin-only features work correctly

---

## 5. Detailed Changes

### 5.1 UnifiedProfile.tsx Logic

```typescript
const { telegramId } = useParams();
const { user } = useSimpleAuth();

// Parse telegram ID from route
const actualUserId = parseInt(telegramId);

const isOwnProfile = user?.id === actualUserId;

// Fetch profile data
const profile = await fetch(`/api/profile/${actualUserId}`);

// Fetch posts
const posts = await fetch(`/api/posts/user/${actualUserId}`);
```

### 5.2 Conditional Rendering

```typescript
{/* Profile Section - Always visible */}
<ProfileView
  profile={profile}
  isOwnProfile={isOwnProfile}
  onEditClick={() => navigate('/edit-profile')}
  postCount={posts.length}
/>

{/* Telegram Info - Always visible */}
<TelegramInfoSection user={user} isAdmin={isAdmin} />

{/* Session Info - Only for own profile, collapsible */}
{isOwnProfile && (
  <CollapsibleSection title="Session Information" defaultExpanded={false}>
    {/* Session ID, expiry, etc */}
  </CollapsibleSection>
)}

{/* App Info - Only for own profile, collapsible */}
{isOwnProfile && webApp && (
  <CollapsibleSection title="App Information" defaultExpanded={false}>
    {/* Platform, version, theme */}
  </CollapsibleSection>
)}

{/* Posts Section - Always visible */}
<PostsSection>
  {isOwnProfile ? (
    <PostList
      userId={actualUserId}
      currentUserId={user.id}
      showActions={true}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  ) : (
    <StaticPostList
      posts={posts}
      showActions={isOwnProfile || isAdmin}
    />
  )}
</PostsSection>
```

### 5.3 Navigation Update (BottomNavigation.tsx)

**Replace**:
```typescript
{
  path: '/my-posts',
  name: 'My Posts',
  icon: <UserIcon />
}
```

**With**:
```typescript
{
  path: `/profile/${user?.id}`, // Dynamic based on current user
  name: 'Profile',
  icon: <UserIcon />
}
```

**Remove**:
- `/account` tab entirely

### 5.4 Router Changes (Router.tsx)

**Update**:
```typescript
{
  path: 'profile/:telegramId',
  element: <UnifiedProfile />, // Replaces UserProfile
},
```

**Remove**:
```typescript
// Delete these routes
{
  path: 'account',
  element: <Account />,
},
{
  path: 'my-posts',
  element: <MyPosts />,
},
```

---

## 6. User Experience Flow

### Own Profile Flow (`/profile/{currentUserId}`)
1. User clicks "Profile" in bottom nav
2. Sees their ProfileView with Edit button
3. Sees Telegram info section
4. Sees Session info (collapsed by default)
5. Sees App info (collapsed by default)
6. Sees their posts with edit/delete actions
7. **NO** create post button (only on Feed)

### Other User Profile Flow (`/profile/123456`)
1. User clicks on username in post or search
2. Sees user's ProfileView (no edit button)
3. Sees user's posts (admin can delete)
4. **NO** session/app info sections
5. **NO** create post button

---

## 7. Migration Strategy
Hard Cutover

## 8. Testing Checklist

- [ ] Own profile displays correctly
- [ ] Other user profiles display correctly
- [ ] Edit button only shows on own profile
- [ ] Session/App info only shows on own profile
- [ ] Session/App info sections are collapsible
- [ ] Posts display with correct actions (own vs others)
- [ ] Edit post modal works
- [ ] Delete post modal works
- [ ] Admin can delete any post
- [ ] Create post button NOT present on profile pages
- [ ] Navigation points to correct routes
- [ ] Old routes redirect properly
- [ ] Direct URL access works for `/profile/me`
- [ ] Direct URL access works for `/profile/123456`
- [ ] Profile image displays correctly
- [ ] Post count is accurate

---

## 9. Open Questions

1. **Session/App Info for Admin?**
   - ✅ **DECISION**: Admins do NOT see session/app info for other users (personal only)

2. **Default Collapsed State?**
   - ✅ **DECISION**: All collapsible sections collapsed by default

3. **Remove Account Tab?**
   - ✅ **DECISION**: Remove from nav entirely, no redirects

4. **Route for own profile?**
   - ✅ **DECISION**: No `/me` route, use `/profile/{userId}` for all profiles

---

## 10. Success Metrics

- ✅ Reduced page count: 3 pages → 1 page
- ✅ Code reuse: ~80% existing components
- ✅ DRY principle: No duplicated profile/post logic
- ✅ Better UX: Consistent profile experience
- ✅ Maintainability: Single source of truth for profiles

---

## 11. Future Enhancements

1. **Tabs for Own Profile**
   - Tab 1: Posts
   - Tab 2: Settings (Session/App info)

2. **Profile Stats**
   - Total posts, likes (when implemented), join date prominence

3. **Infinite Scroll**
   - Both PostList and StaticPostList could benefit

4. **Share Profile**
   - Copy link to profile button

---

## Appendix: File Inventory

### Files to Create
- `frontend/src/pages/UnifiedProfile.tsx`
- `frontend/src/components/CollapsibleSection.tsx`
- `frontend/src/components/TelegramInfoSection.tsx`

### Files to Modify
- `frontend/src/Router.tsx`
- `frontend/src/components/BottomNavigation.tsx`

### Files to Delete
- `frontend/src/pages/Account.tsx`
- `frontend/src/pages/MyPosts.tsx`
- `frontend/src/pages/UserProfile.tsx`

### Files Unchanged
- `frontend/src/pages/Feed.tsx` (keeps CreatePostButton ✅)
- `frontend/src/components/PostList.tsx`
- `frontend/src/components/StaticPostList.tsx`
- `frontend/src/components/profile/ProfileView.tsx`
- All API routes (no backend changes needed)