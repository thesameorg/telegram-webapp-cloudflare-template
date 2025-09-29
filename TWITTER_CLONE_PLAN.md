# Early Twitter Clone Implementation Plan

## Project Overview
Transform the current Telegram Web App template into an early-Twitter-like application where users can create text posts and view them in a social feed format.

## Current Architecture Analysis
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Hono framework on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Sessions**: Cloudflare KV (existing, keep for sessions)
- **Authentication**: Telegram Web App authentication system
- **Deployment**: Cloudflare Workers with existing CI/CD

## Database Setup (Cloudflare D1 + Drizzle ORM)

### Database Configuration
- **Production**: Database ID already configured in wrangler.toml
- **Local Development**: Use `wrangler d1 execute` for local DB
- **ORM**: Drizzle ORM for type-safe queries and SQL injection protection
- **Migrations**: Drizzle migrations applied during GitHub workflow deployment

### Database Schema (Drizzle)
```typescript
// backend/src/db/schema.ts
import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  username: text('username').notNull(),
  displayName: text('display_name').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  createdAtIdx: index('idx_posts_created_at').on(table.createdAt),
  userIdIdx: index('idx_posts_user_id').on(table.userId),
}));

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

## Backend Implementation

### 1. Drizzle ORM Setup
- **File**: `backend/package.json`
  - Add drizzle-orm and drizzle-kit dependencies
  - Add migration scripts
- **File**: `backend/drizzle.config.ts`
  - Drizzle configuration for local and production
- **File**: `backend/src/db/schema.ts`
  - Database schema with type safety
- **File**: `backend/src/db/index.ts`
  - Database connection and client setup

### 2. Database Migration System
- **File**: `backend/src/db/migrate.ts`
  - Migration runner for GitHub workflow
- **File**: `backend/drizzle/migrations/`
  - Auto-generated migration files
- **GitHub Workflow**: Add migration step before deployment

### 3. Post Models & Types
- **File**: `backend/src/models/post.ts`
  - Post validation schemas using Zod
  - Input sanitization functions
- **File**: `backend/src/types/env.ts`
  - Add D1 database binding to Env interface

### 4. Post API Endpoints
- **File**: `backend/src/api/posts.ts`
  - `GET /api/posts` - Get all posts (newest first)
  - `GET /api/posts/user/:userId` - Get user's posts
  - `POST /api/posts` - Create new post
  - Authentication middleware integration
  - Input validation and sanitization

### 5. Post Service Layer
- **File**: `backend/src/services/post-service.ts`
  - Drizzle ORM database operations (SQL injection safe)
  - Content validation and sanitization
  - Character limit enforcement (280 chars)
  - Type-safe queries with Drizzle

### 6. Backend Route Integration
- **File**: `backend/src/index.ts`
  - Register new post routes
  - Update API documentation endpoint

## Frontend Implementation

### 1. Navigation System
- **File**: `frontend/src/components/BottomNavigation.tsx`
  - Three tabs: Feed, My Posts, Account
  - React Router setup for navigation
  - Icon-based navigation bar

### 2. Main Layout
- **File**: `frontend/src/components/Layout.tsx`
  - Main container with bottom navigation
  - Content area for different views
- **File**: `frontend/src/App.tsx`
  - Router setup with three main routes

### 3. Feed Components
- **File**: `frontend/src/components/PostList.tsx`
  - Scrollable list of posts
  - Infinite scroll or pagination
  - Post item rendering
- **File**: `frontend/src/components/PostItem.tsx`
  - Individual post display
  - User info (name, username)
  - Timestamp formatting
  - Post content

### 4. Post Creation
- **File**: `frontend/src/components/CreatePost.tsx`
  - Modal or dedicated page for post creation
  - Character counter (280 limit)
  - Submit button with loading states
- **File**: `frontend/src/components/CreatePostButton.tsx`
  - Floating action button or header button
  - Opens create post modal/page

### 5. Pages/Views
- **File**: `frontend/src/pages/Feed.tsx`
  - Main feed showing all posts
  - Integration with CreatePostButton
- **File**: `frontend/src/pages/MyPosts.tsx`
  - User's own posts only
  - Same PostList component with filtered data
- **File**: `frontend/src/pages/Account.tsx`
  - User info without debug data

### 6. Data Fetching & State
- **File**: `frontend/src/hooks/use-posts.ts`
  - Custom hook for fetching posts
  - Cache management with react-query or SWR
- **File**: `frontend/src/hooks/use-create-post.ts`
  - Post creation logic
  - Optimistic updates
- **File**: `frontend/src/services/api.ts`
  - API client for post operations
  - Error handling

### 7. Routing Setup
- **File**: `frontend/src/Router.tsx`
  - React Router configuration
  - Route definitions for three main views

## Implementation Priority

### Phase 1: Database & Backend Core
1. Set up D1 database in wrangler.toml
2. Create database migrations
3. Implement Post model and types
4. Create basic post API endpoints
5. Test API endpoints

### Phase 2: Frontend Core Structure
1. Set up React Router
2. Create Layout component with bottom navigation
3. Create basic page components (Feed, MyPosts, Account)
4. Implement navigation between pages

### Phase 3: Post Display
1. Create PostList and PostItem components
2. Implement API hooks for fetching posts
3. Display posts in Feed page
4. Implement MyPosts filtering

### Phase 4: Post Creation
1. Create post creation form/modal
2. Implement character limit and validation
3. Add create post API integration
4. Add optimistic updates

### Phase 5: Polish & UX
1. Add loading states and error handling
2. Implement proper timestamps
3. Add pull-to-refresh functionality
4. Style improvements and responsive design
5. Performance optimizations

## Configuration Changes

### Drizzle Configuration
```typescript
// backend/drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  driver: "d1",
  dbCredentials: {
    wranglerConfigPath: "./wrangler.toml",
    dbName: "twa-tpl-db",
  },
} satisfies Config;
```

### Package.json Scripts (Backend)
```json
{
  "db:generate": "drizzle-kit generate:sqlite",
  "db:migrate": "tsx src/db/migrate.ts",
  "db:migrate:local": "wrangler d1 execute twa-tpl-db --local --file=./drizzle/migrations/latest.sql",
  "db:studio": "drizzle-kit studio",
  "db:push": "drizzle-kit push:sqlite"
}
```

### GitHub Workflow Updates
```yaml
# Add before deployment step:
- name: Run Database Migrations
  run: |
    cd backend
    npm run db:migrate
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## UI/UX Considerations

### Design System
- Use existing Tailwind CSS setup
- Maintain Telegram theme integration (dark/light mode)
- Mobile-first responsive design
- Simple, clean Twitter-like interface

### User Experience
- Fast loading with skeleton states
- Optimistic updates for post creation
- Pull-to-refresh on mobile
- Character counter for posts
- Error handling with user-friendly messages

### Performance
- Implement pagination or infinite scroll
- Cache posts data
- Minimize re-renders
- Optimize bundle size

## Testing Strategy

### Backend Tests
- Unit tests for post service
- Integration tests for API endpoints
- Database migration tests

### Frontend Tests
- Component unit tests
- Hook testing
- E2E tests for core flows
- Accessibility testing

## Security Considerations

### SQL Injection Protection
- **Drizzle ORM**: Provides built-in SQL injection protection through prepared statements
- **Type Safety**: TypeScript types prevent incorrect query construction
- **Parameterized Queries**: All user inputs are automatically parameterized

### Content Security
- **Input Sanitization**: HTML/script tag removal using DOMPurify or similar
- **Content Validation**: Zod schemas for strict input validation
- **XSS Prevention**: Proper escaping of user content in React
- **Character Limits**: Enforce 280 character limit on posts

### API Security
- **Authentication Validation**: Verify Telegram auth on all post operations
- **Rate Limiting**: Implement rate limiting on post creation (e.g., 10 posts per minute)
- **CORS Configuration**: Proper CORS setup for frontend domain
- **Error Handling**: Generic error messages to prevent information leakage

### Example Security Implementation
```typescript
// backend/src/models/post.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

export const createPostSchema = z.object({
  content: z.string()
    .min(1, "Post cannot be empty")
    .max(280, "Post cannot exceed 280 characters")
    .transform((content) => DOMPurify.sanitize(content, { ALLOWED_TAGS: [] }))
});

// backend/src/services/post-service.ts
import { eq, desc } from 'drizzle-orm';

// SQL injection safe - uses prepared statements
export async function getPosts(db: Database, limit: number = 50) {
  return await db.select().from(posts)
    .orderBy(desc(posts.createdAt))
    .limit(limit); // Parameters are safely bound
}
```

### Update claude.md 

accordingly


## Future Enhancements (Out of Scope)
- Image uploads
- Like/reply functionality
- User profiles
- Following/followers
- Real-time updates
- Push notifications
- Post editing/deletion
- Hashtags and mentions