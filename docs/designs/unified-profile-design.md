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
/profile/me    → UnifiedProfile.tsx (own profile)
/profile/:id   → UnifiedProfile.tsx (other user profile)
```

**Alternative** (if /me is preferred):
```
/me            → Redirect to /profile/{current_user_id}
/profile/:id   → UnifiedProfile.tsx
```

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

2. **TelegramInfoSection.tsx**
   - Extract from Account.tsx lines 107-152
   - Make standalone component
   - Props: `user`, `isAdmin`

### 3.4 Modified Components

1. **BottomNavigation.tsx**
   - Replace `/my-posts` with `/profile/me` or `/me`
   - Change icon/label to "Profile" instead of "My Posts"
   - Remove `/account` tab OR keep as legacy redirect

2. **UnifiedProfile.tsx** (new, combines Account + MyPosts + UserProfile)
   - Intelligent detection: if `telegramId === "me"` or matches current user
   - Conditional rendering based on `isOwnProfile`
   - Manages modals: EditPost, DeletePostConfirm

3. **Feed.tsx**
   - No changes (keeps CreatePostButton)

---

## 4. Implementation Plan

### Phase 1: Create New Components
1. Create `CollapsibleSection.tsx` component
2. Create `TelegramInfoSection.tsx` component
3. Create `UnifiedProfile.tsx` combining logic from Account, MyPosts, UserProfile

### Phase 2: Update Routing
1. Add `/profile/me` route → UnifiedProfile with special handling
2. Update `/profile/:telegramId` → UnifiedProfile
3. Add redirects: `/account` → `/profile/me`, `/my-posts` → `/profile/me`

### Phase 3: Update Navigation
1. Modify BottomNavigation to point to `/profile/me`
2. Change label from "My Posts" to "Profile"
3. Remove or redirect "Account" tab

### Phase 4: Clean Up
1. Mark Account.tsx as deprecated (don't delete yet for safety)
2. Mark MyPosts.tsx as deprecated
3. Update any internal links pointing to old routes

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

// Resolve actual user ID
const actualUserId = telegramId === 'me'
  ? user?.id
  : parseInt(telegramId);

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
  path: '/profile/me',
  name: 'Profile',
  icon: <UserIcon />
}
```

**Remove** (optional):
```typescript
{
  path: '/account',
  name: 'Account',
  // ...
}
```

### 5.4 Router Changes (Router.tsx)

**Add**:
```typescript
{
  path: 'profile/me',
  element: <UnifiedProfile />,
},
```

**Update**:
```typescript
{
  path: 'profile/:telegramId',
  element: <UnifiedProfile />, // instead of UserProfile
},
```

**Add Redirects** (optional):
```typescript
{
  path: 'account',
  element: <Navigate to="/profile/me" replace />,
},
{
  path: 'my-posts',
  element: <Navigate to="/profile/me" replace />,
},
```

---

## 6. User Experience Flow

### Own Profile Flow (`/profile/me`)
1. User clicks "Profile" in bottom nav
2. Sees their ProfileView with Edit button
3. Sees Telegram info section (expanded)
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
   - Should admins see this info for other users?
   - **Recommendation**: No, keep it personal only

2. **Default Collapsed State?**
   - Session info: collapsed by default ✅
   - App info: collapsed by default ✅
   - User preference persistence?
   - **Recommendation**: Start with collapsed, no persistence in v1

3. **Remove Account Tab Entirely?**
   - Keep as redirect or remove from nav?
   - **Recommendation**: Remove from nav, add redirect

4. **Post Count Display?**
   - Show on own profile?
   - **Recommendation**: Yes, shows on all profiles (already in UserProfile)

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

### Files to Deprecate (but keep for reference)
- `frontend/src/pages/Account.tsx`
- `frontend/src/pages/MyPosts.tsx`
- `frontend/src/pages/UserProfile.tsx`

### Files Unchanged
- `frontend/src/pages/Feed.tsx` (keeps CreatePostButton ✅)
- `frontend/src/components/PostList.tsx`
- `frontend/src/components/StaticPostList.tsx`
- `frontend/src/components/profile/ProfileView.tsx`
- All API routes (no backend changes needed)