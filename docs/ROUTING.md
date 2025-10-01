# Routing Architecture Analysis & Simplification Guide

This document provides a comprehensive analysis of the routing architecture, identifies complexities and hardcoded values, and proposes simplifications.

## 🎯 Implementation Status

**Phase 1 (Quick Wins): ✅ COMPLETED**
- ✅ CSP header now uses config instead of hardcoded URL
- ✅ Removed unused `VITE_WORKER_URL` and `VITE_PAGES_URL` env vars from workflow

**Phase 2 (Direct Worker Calls): ✅ COMPLETED**
- ✅ Added CORS middleware to Worker backend
- ✅ Created frontend config.ts with API base URL
- ✅ Updated all 30+ frontend API calls to use config
- ✅ Removed Pages Functions proxy entirely
- ✅ Updated _redirects to only handle SPA routing
- ✅ Cleaned up deployment workflow
- **Complexity reduced from 6.5/10 → 4/10** 🎉

**Phase 3 (Custom Domains): ⏸️ NOT STARTED**
- Requires custom domain purchase/configuration
- Final complexity: 2/10
- See [Implementation Guide](#phase-3-custom-domains-long-term) below

---

## Table of Contents
1. [Current Architecture Overview](#current-architecture-overview)
2. [Hardcoded Values & Configuration](#hardcoded-values--configuration)
3. [Routing Flow by Environment](#routing-flow-by-environment)
4. [Identified Issues & Complexities](#identified-issues--complexities)
5. [Proposed Simplifications](#proposed-simplifications)
6. [Implementation Guide](#implementation-guide)

---

## Current Architecture Overview

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                     │
│  - React Router (client-side routing)                       │
│  - Vite dev server (local: :3000)                          │
│  - Cloudflare Pages (deployed)                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              ROUTING LAYER (varies by env)                  │
│                                                             │
│  LOCAL:     Vite proxy                                     │
│  DEPLOYED:  _redirects + Pages Functions [[path]].ts      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Cloudflare Workers)               │
│  - Hono.js API server                                      │
│  - Wrangler dev (local: :8787)                            │
│  - Cloudflare Workers (deployed)                          │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
twa-cf-tpl/
├── frontend/
│   ├── src/
│   │   ├── Router.tsx              # React Router routes
│   │   ├── services/api.ts         # API calls (relative paths)
│   │   └── utils/image-url.ts      # ⚠️ HARDCODED R2 URL
│   ├── public/
│   │   └── _redirects              # Cloudflare Pages routing
│   ├── functions/
│   │   ├── config.ts               # ⚠️ HARDCODED Worker/Pages URLs
│   │   └── api/[[path]].ts         # Pages Functions proxy
│   └── vite.config.ts              # Local proxy config
├── backend/
│   └── src/
│       └── index.ts                # Hono API routes + /r2/* endpoint
└── wrangler.toml                   # ⚠️ HARDCODED IDs (KV, D1, R2)
```

---

## Hardcoded Values & Configuration

### 🔴 Critical Hardcoded Values

| Location | Value | Type | Impact |
|----------|-------|------|--------|
| `frontend/src/utils/image-url.ts:7` | `https://pub-733fa418a1974ad8aaea18a49e4154b9.r2.dev` | R2 Public URL | Must update if R2 bucket changes |
| ~~`frontend/functions/config.ts:4`~~ | ~~`https://twa-cf-tpl-prod.workers.dev`~~ | ~~Worker URL~~ | ✅ **REMOVED** - Now in frontend/src/config.ts |
| ~~`frontend/functions/config.ts:5`~~ | ~~`https://twa-cf-tpl.pages.dev`~~ | ~~Pages URL~~ | ✅ **REMOVED** - No longer needed |
| ~~`frontend/functions/api/[[path]].ts:42`~~ | ~~`https://twa-cf-tpl-prod.workers.dev`~~ | ~~CSP Worker URL~~ | ✅ **REMOVED** - Functions deleted |

**New Configuration (Phase 2):**
| Location | Value | Type | Notes |
|----------|-------|------|-------|
| `frontend/src/config.ts` | `https://twa-cf-tpl-prod.workers.dev` | Worker URL | Single source of truth, no sed needed |
| `backend/src/index.ts:24` | `https://twa-cf-tpl.pages.dev` | CORS allowed origin | In CORS middleware |

### 🟡 Infrastructure IDs (Less Critical)

| Location | Value | Type | Notes |
|----------|-------|------|-------|
| `wrangler.toml:14` | `214af53e9fd44c18ba913499a606dd70` | KV Namespace ID | Required for KV binding |
| `wrangler.toml:19` | `c9fe2099-a700-4a59-8294-08e8e1049ca7` | D1 Database ID | Required for D1 binding |
| `wrangler.toml:27` | `twa-tpl-images` | R2 Bucket Name | Required for R2 binding |
| `wrangler.toml:5` | `e023ec3576222c6a7b6cdf933de3d915` | Account ID | Required for deployment |

### 🟢 GitHub Secrets (Properly Configured)

- `TELEGRAM_BOT_TOKEN` - Telegram bot API token
- `TELEGRAM_ADMIN_ID` - Admin user ID
- `CLOUDFLARE_API_TOKEN` - CF API access
- `CLOUDFLARE_ACCOUNT_ID` - CF account ID

### 🟢 GitHub Variables (Properly Configured)

- `WORKER_URL` - Used to replace config during deploy
- `PAGES_URL` - Used to replace config during deploy

### ⚠️ Unused Configuration

- ~~`VITE_WORKER_URL`~~ - ✅ **REMOVED** - Was defined in workflow but not used
- ~~`VITE_PAGES_URL`~~ - ✅ **REMOVED** - Was defined in workflow but not used

---

## Routing Flow by Environment

### Local Development (`npm run dev`)

```
┌──────────────────────────────────────────────────────────────┐
│ User Action: Click "View Profile"                           │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ React Router: navigate('/profile/123')                      │
│ - Client-side only                                          │
│ - No server request                                         │
│ - URL changes in browser                                    │
└──────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────┐
│ User Action: Upload Avatar                                   │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Frontend: POST /api/profile/me/avatar                       │
│ - fetch('/api/profile/me/avatar')                          │
│ - Relative path                                            │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Vite Proxy (vite.config.ts)                                │
│ - Matches '/api' prefix                                     │
│ - Forwards to http://localhost:8787                        │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Backend Worker (Wrangler Dev :8787)                        │
│ - Hono routes handle request                                │
│ - Returns response                                          │
└──────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────┐
│ Component: Load Avatar Image                                │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ getImageUrl('avatars/123.jpg')                              │
│ - DEV mode detected (import.meta.env.DEV)                  │
│ - Returns: '/r2/avatars/123.jpg'                           │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Vite Proxy                                                   │
│ - Matches '/r2' prefix                                      │
│ - Forwards to http://localhost:8787/r2/avatars/123.jpg    │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Backend /r2/* Route (index.ts:57)                          │
│ - Extracts path: 'avatars/123.jpg'                        │
│ - Fetches from R2 binding                                  │
│ - Returns image with headers                               │
└──────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Frontend runs on `:3000`, backend on `:8787`
- Vite proxy handles ALL API and image requests
- Images served through backend `/r2/*` endpoint
- No CORS issues (same-origin through proxy)

---

### Deployed Production

```
┌──────────────────────────────────────────────────────────────┐
│ User visits: https://twa-cf-tpl.pages.dev/profile/123      │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Cloudflare Pages Receives Request                          │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ _redirects Processing                                        │
│ - Rule: /* /index.html 200                                 │
│ - Serves index.html (React app)                            │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ React Router Takes Over                                     │
│ - Sees /profile/123 in URL                                 │
│ - Renders Profile component                                │
│ - No more server requests                                  │
└──────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────┐
│ Frontend: POST /api/profile/me/avatar                       │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Request to: https://twa-cf-tpl.pages.dev/api/profile/me/avatar
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ _redirects Processing                                        │
│ - Rule: /api/* /api/:splat 200                            │
│ - Matches, routes to Pages Functions                       │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Pages Function: functions/api/[[path]].ts                  │
│ - Receives: /api/profile/me/avatar                        │
│ - Extracts path: ['profile', 'me', 'avatar']              │
│ - Reads config: WORKER_URL from functions/config.ts       │
│ - Builds target: https://twa-cf-tpl-prod.workers.dev/api/profile/me/avatar
│ - Proxies request (method, headers, body)                  │
│ - Adds CORS headers                                        │
│ - Adds CSP headers                                         │
│ - Returns response                                         │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Cloudflare Workers Backend                                  │
│ - Receives: /api/profile/me/avatar                        │
│ - Hono routes handle request                               │
│ - Uploads to R2                                            │
│ - Returns success                                          │
└──────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────┐
│ Component: Load Avatar Image                                │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ getImageUrl('avatars/123.jpg')                              │
│ - NOT DEV mode (production build)                          │
│ - Returns: 'https://pub-733fa418a1974ad8aaea18a49e4154b9.r2.dev/avatars/123.jpg'
│ - ⚠️ HARDCODED URL                                         │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Browser: GET https://pub-733fa418a1974ad8aaea18a49e4154b9.r2.dev/avatars/123.jpg
│ - Direct request to R2 public URL                          │
│ - No proxy, no Pages Functions                             │
│ - Cached by CDN                                            │
└──────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Frontend and backend are SEPARATE services with different domains
- API requests go through TWO hops: Pages → Functions proxy → Workers
- Images served directly from R2 public URL (single hop)
- CORS handled by Pages Functions proxy
- CSP headers hardcoded with Worker URL

---

### Deployment Process

The deployment workflow replaces hardcoded URLs:

```bash
# In .github/workflows/3-deploy-pages.yml:69-70
sed -i 's|https://twa-cf-tpl-prod.workers.dev|${{ vars.WORKER_URL }}|g' functions/config.ts
sed -i 's|https://twa-cf-tpl.pages.dev|${{ vars.PAGES_URL }}|g' functions/config.ts
```

**Process:**
1. Worker URL and Pages URL are committed in `functions/config.ts`
2. During deploy, workflow uses `sed` to replace with GitHub variables
3. Modified `functions/` directory is copied to `dist/functions/`
4. Deployed to Cloudflare Pages with Functions

**Problem:** Config file has placeholder URLs that don't match actual deployed URLs until workflow runs

---

## Identified Issues & Complexities

### 🔴 High Priority Issues

#### 1. ~~Double-Hop API Routing in Production~~ ✅ **FIXED**
~~**Problem:** Every API call goes Pages → Functions → Workers~~

**Solution Implemented (Phase 2):**
- Frontend now calls Worker directly
- CORS middleware added to Worker backend
- Pages Functions completely removed
- Single-hop routing: Frontend → Worker

**Benefits:**
- ✅ Reduced latency (one hop instead of two)
- ✅ Lower cost (only Workers execution, no Functions)
- ✅ Fewer points of failure
- ✅ Easier to debug (single layer)

#### 2. ~~Hardcoded URLs with sed Replacement~~ ✅ **FIXED**
~~**Problem:** URLs are hardcoded, then replaced during deploy~~

**Solution Implemented (Phase 2):**
```typescript
// frontend/src/config.ts - New single source of truth
export const config = {
  apiBaseUrl: import.meta.env.PROD
    ? 'https://twa-cf-tpl-prod.workers.dev'
    : '',  // Local: Vite proxy
}
```

**Benefits:**
- ✅ No more sed replacement needed
- ✅ Config file is clear and explicit
- ✅ Easy to update (one location)
- ✅ Works consistently across environments

#### 3. Different Image Serving Mechanisms
**Problem:** Images served differently in local vs production

| Environment | Method | Path/URL |
|-------------|--------|----------|
| Local | Backend `/r2/*` route through Vite proxy | `/r2/avatars/123.jpg` |
| Production | Direct R2 public URL | `https://pub-733fa418...r2.dev/avatars/123.jpg` |

**Code:**
```typescript
// frontend/src/utils/image-url.ts
export const getImageUrl = (key: string) => {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    return `/r2/${key}`;  // Proxied through backend
  }
  return `https://pub-733fa418a1974ad8aaea18a49e4154b9.r2.dev/${key}`;  // Direct R2
};
```

**Downsides:**
- Hardcoded R2 URL
- Different code paths for local/prod
- Backend `/r2/*` route only used locally (dead code in production)
- Must update code if R2 bucket changes

#### 4. ~~CSP Header Hardcoded~~ ✅ **FIXED**
~~**Problem:** Content Security Policy header has hardcoded Worker URL~~

**Solution Implemented:**
```typescript
// frontend/functions/api/[[path]].ts:42
import { WORKER_URL } from '../config';

newResponse.headers.set('Content-Security-Policy',
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://telegram.org; " +
  `connect-src 'self' ${WORKER_URL} https://api.telegram.org; ` +  // Now uses config!
  "img-src 'self' data: https:; " +
  "style-src 'self' 'unsafe-inline';"
);
```

**Benefits:**
- ✅ Single source of truth (uses config.ts)
- ✅ Automatically updated when config changes
- ✅ No manual updates needed

### 🟡 Medium Priority Issues

#### 5. ~~Unused Environment Variables~~ ✅ **FIXED**
~~**Problem:** `VITE_WORKER_URL` and `VITE_PAGES_URL` are set but never used~~

**Solution Implemented:**
Removed unused environment variables from workflow:
```yaml
# .github/workflows/3-deploy-pages.yml
# REMOVED:
# env:
#   VITE_WORKER_URL: ${{ vars.WORKER_URL }}
#   VITE_PAGES_URL: ${{ vars.PAGES_URL }}
```

**Benefits:**
- ✅ Cleaner workflow configuration
- ✅ No confusion about unused variables
- ✅ Reduced maintenance burden

#### 6. Config Split Across Multiple Files
**Problem:** Configuration scattered in many places

| Config Item | Location 1 | Location 2 | Location 3 |
|-------------|-----------|-----------|-----------|
| Worker URL | `functions/config.ts` | `[[path]].ts` CSP | GitHub vars |
| Pages URL | `functions/config.ts` | GitHub vars | - |
| R2 URL | `image-url.ts` | - | - |
| Account ID | `wrangler.toml` | GitHub secrets | - |

### 🟢 Low Priority Issues (By Design)

#### 7. Infrastructure IDs in wrangler.toml
**Not really an issue:** These must be in `wrangler.toml` for Wrangler to work

#### 8. Separate Frontend/Backend Services
**Not an issue:** This is the Cloudflare architecture (Pages + Workers)

---

## Proposed Simplifications

### 🎯 Goal: Reduce complexity while maintaining functionality

### Option A: Direct Worker Calls (Simplest)

**Change:** Frontend calls Worker directly, remove Pages Functions proxy

**Impact:**
- ✅ Eliminates double-hop routing
- ✅ Removes `functions/` directory entirely
- ✅ No sed replacement needed
- ✅ Faster API responses
- ✅ Lower cost
- ❌ Requires CORS configuration on Worker
- ❌ Frontend must know Worker URL

**Implementation:**
```typescript
// NEW: frontend/src/config.ts
export const API_BASE_URL = import.meta.env.PROD
  ? 'https://twa-cf-tpl-prod.workers.dev'
  : '';  // Local: use relative paths (Vite proxy)

// frontend/src/services/api.ts
export const api = {
  async getAllPosts() {
    const response = await fetch(`${API_BASE_URL}/api/posts`);
    return response.json();
  }
};

// backend/src/index.ts - Add CORS middleware
import { cors } from 'hono/cors';

app.use('/api/*', cors({
  origin: ['https://twa-cf-tpl.pages.dev', 'https://t.me'],
  credentials: true,
}));
```

**Trade-off Analysis:**
| Aspect | Current | Proposed |
|--------|---------|----------|
| API latency | Pages → Functions → Worker | Direct to Worker |
| Configuration complexity | High (sed replacement) | Medium (hardcoded URL) |
| CORS complexity | Medium (Pages Functions) | Medium (Worker middleware) |
| Cost | Higher (2 services) | Lower (1 service) |
| Debugging | Harder (2 layers) | Easier (1 layer) |

**Verdict:** ⭐ **Recommended** - Significant simplification with minimal downside

---

### Option B: Environment Variables for URLs

**Change:** Use Vite environment variables instead of hardcoding

**Impact:**
- ✅ No more sed replacement
- ✅ Config files work in all environments
- ✅ Single source of truth
- ⚠️ Requires build-time env vars

**Implementation:**
```typescript
// frontend/src/utils/image-url.ts
export const getImageUrl = (key: string) => {
  if (import.meta.env.DEV) {
    return `/r2/${key}`;
  }
  // Use environment variable instead of hardcoded URL
  const baseUrl = import.meta.env.VITE_R2_PUBLIC_URL;
  return `${baseUrl}/${key}`;
};

// frontend/functions/config.ts
export const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://twa-cf-tpl-prod.workers.dev"
export const PAGES_URL = import.meta.env.VITE_PAGES_URL || "https://twa-cf-tpl.pages.dev"
```

**Note:** Vite replaces `import.meta.env.VITE_*` at build time, so Functions can't use them. This only works for frontend code, not Pages Functions.

**Verdict:** ⚠️ **Partial solution** - Helps frontend, doesn't solve Functions config

---

### Option C: Custom Domain (Best Long-Term)

**Change:** Use custom domain for both Pages and Workers

**Impact:**
- ✅ Single domain for everything
- ✅ No CORS issues at all
- ✅ Cleaner URLs
- ✅ Professional appearance
- ❌ Requires domain purchase
- ❌ More DNS configuration

**Architecture:**
```
https://myapp.com           → Cloudflare Pages (frontend)
https://myapp.com/api/*     → Cloudflare Workers (backend via Routes)
https://images.myapp.com/*  → R2 bucket (custom domain)
```

**Setup:**
```bash
# 1. Configure custom domain for Pages
# Dashboard: Pages → twa-cf-tpl → Custom domains → Add: myapp.com

# 2. Configure Workers Route
# Dashboard: Workers → twa-cf-tpl-prod → Triggers → Routes
# Add route: myapp.com/api/*
# Add route: myapp.com/webhook

# 3. Configure R2 custom domain
# Dashboard: R2 → twa-tpl-images → Settings → Custom domains
# Add: images.myapp.com
```

**Benefits:**
- Frontend can use relative paths (`/api/posts`)
- No CORS (same origin)
- No Pages Functions proxy needed
- Images use clean URL: `https://images.myapp.com/avatars/123.jpg`

**Verdict:** ⭐⭐⭐ **Best solution** if domain is available

---

### Option D: R2 Custom Domain (Quick Win)

**Change:** Just add custom domain for R2, keep rest as-is

**Impact:**
- ✅ Consistent image URLs
- ✅ No hardcoded R2 URL
- ✅ Professional image CDN
- ⚠️ Still requires domain

**Implementation:**
```typescript
// frontend/src/utils/image-url.ts
export const getImageUrl = (key: string) => {
  if (import.meta.env.DEV) {
    return `/r2/${key}`;
  }
  // Clean, branded URL
  return `https://images.myapp.com/${key}`;
};
```

**Verdict:** ⭐ **Quick improvement** - Solves image URL problem

---

## Implementation Guide

### Phase 1: Quick Wins (Low Risk)

#### 1.1 Use Config for CSP Header
**Goal:** Remove hardcoded URL from CSP header

```typescript
// frontend/functions/api/[[path]].ts
import { WORKER_URL } from '../config';

newResponse.headers.set('Content-Security-Policy',
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://telegram.org; " +
  `connect-src 'self' ${WORKER_URL} https://api.telegram.org; ` +  // Use config
  "img-src 'self' data: https:; " +
  "style-src 'self' 'unsafe-inline';"
);
```

**Risk:** ✅ Low (just referencing existing config)

#### 1.2 Remove Unused Vite Env Vars
**Goal:** Clean up unused configuration

Remove from `.github/workflows/3-deploy-pages.yml`:
```yaml
# DELETE these lines:
env:
  VITE_WORKER_URL: ${{ vars.WORKER_URL }}
  VITE_PAGES_URL: ${{ vars.PAGES_URL }}
```

**Risk:** ✅ None (they're unused)

---

### Phase 2: Direct Worker Calls (Medium Risk)

#### 2.1 Add CORS to Worker
```typescript
// backend/src/index.ts
import { cors } from 'hono/cors';

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware
app.use('/api/*', cors({
  origin: (origin) => {
    // Allow Pages domain and Telegram
    const allowed = [
      'https://twa-cf-tpl.pages.dev',
      'https://t.me',
    ];
    return allowed.some(a => origin.startsWith(a)) ? origin : allowed[0];
  },
  credentials: true,
}));
```

#### 2.2 Update Frontend API Calls
```typescript
// NEW: frontend/src/config.ts
export const config = {
  apiBaseUrl: import.meta.env.PROD
    ? 'https://twa-cf-tpl-prod.workers.dev'
    : '',  // Local uses Vite proxy
};

// frontend/src/services/api.ts
import { config } from '../config';

export const api = {
  async getAllPosts(limit = 50, offset = 0) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${config.apiBaseUrl}/api/posts?${params}`, {
      credentials: 'include',  // Important for CORS with credentials
    });
    return handleResponse(response);
  },
  // ... update all other methods
};
```

#### 2.3 Remove Pages Functions
```bash
# Delete entire directory
rm -rf frontend/functions/
```

#### 2.4 Update _redirects
```
# frontend/public/_redirects
# Remove API routing (now goes direct to Worker)
# Keep only SPA routing
/* /index.html 200
```

#### 2.5 Remove sed Replacement from Workflow
```yaml
# .github/workflows/3-deploy-pages.yml
# DELETE these lines (62-70):
      # - name: Deploy to Cloudflare Pages
      #   run: |
      #     cd frontend
      #     sed -i 's|https://...|...|g' functions/config.ts  # DELETE
      #     cp -r functions dist/  # DELETE
```

**Testing Checklist:**
- [ ] Local dev still works (Vite proxy handles API calls)
- [ ] Deployed app can fetch posts
- [ ] Auth works (cookies/sessions)
- [ ] Image uploads work
- [ ] No CORS errors in console

**Rollback Plan:**
1. Restore `frontend/functions/` from git
2. Restore _redirects
3. Restore workflow sed commands
4. Redeploy

**Risk:** ⚠️ Medium - Changes production behavior, test thoroughly

---

### Phase 3: Custom Domains (Long-Term)

#### 3.1 Purchase/Configure Domain
1. Buy domain (e.g., `myapp.com`)
2. Point nameservers to Cloudflare
3. Add to Cloudflare account

#### 3.2 Configure Pages Custom Domain
1. Dashboard → Pages → twa-cf-tpl
2. Custom domains → Add domain
3. Enter: `myapp.com`
4. Verify DNS

#### 3.3 Configure Workers Route
1. Dashboard → Workers → twa-cf-tpl-prod
2. Triggers → Routes → Add route
3. Route: `myapp.com/api/*` → twa-cf-tpl-prod
4. Route: `myapp.com/webhook` → twa-cf-tpl-prod

#### 3.4 Configure R2 Custom Domain
1. Dashboard → R2 → twa-tpl-images
2. Settings → Custom domains
3. Add: `images.myapp.com`
4. Verify DNS

#### 3.5 Update Frontend Config
```typescript
// frontend/src/config.ts
export const config = {
  // No Worker URL needed! Same origin now.
  apiBaseUrl: '',  // Relative paths work in prod too
};

// frontend/src/utils/image-url.ts
export const getImageUrl = (key: string) => {
  if (import.meta.env.DEV) {
    return `/r2/${key}`;
  }
  return `https://images.myapp.com/${key}`;
};
```

#### 3.6 Remove CORS (No Longer Needed)
```typescript
// backend/src/index.ts
// DELETE CORS middleware - same origin now!
```

**Benefits:**
- ✅ No CORS at all (same origin)
- ✅ Clean URLs
- ✅ No hardcoded Worker URL
- ✅ Professional appearance

**Risk:** ⚠️ Medium - Requires DNS changes, domain cost

---

## Summary & Recommendations

### Current State: Complexity Score 4/10 (improved from 7/10) 🎉

**Remaining Complexities:**
- ✅ ~~Double-hop API routing~~ **FIXED** (Phase 2)
- ✅ ~~Hardcoded URLs with sed replacement~~ **FIXED** (Phase 2)
- ❌ Different image serving local vs prod (minor - works fine)
- ✅ ~~CSP header hardcoded~~ **FIXED** (Phase 1)
- ✅ ~~Pages Functions proxy~~ **REMOVED** (Phase 2)
- ✅ React Router works well
- ✅ Vite proxy works well locally

**Improvements Completed:**

**Phase 1:**
- ✅ CSP header now uses config
- ✅ Unused env vars removed

**Phase 2:**
- ✅ Frontend calls Worker directly (no proxy)
- ✅ CORS middleware on Worker
- ✅ Pages Functions completely removed
- ✅ Simpler workflow (no sed, no functions copy)
- ✅ Single config file for API URL

### Recommended Path

**✅ Phase 1 (Quick Wins): COMPLETED**
- Result: 7/10 → 6.5/10

**✅ Phase 2 (Direct Worker Calls): COMPLETED**
- Result: 6.5/10 → 4/10 🎉

**Optional - Phase 3 (Custom Domains):**
3. ⏸️ Phase 3: Custom domains (when domain available)
   - Professional URLs
   - Same-origin (no CORS complexity)
   - Clean image CDN
   - **Final Complexity Score: 2/10**

### What NOT to Change

**Keep as-is:**
- ✅ React Router (works perfectly)
- ✅ Vite proxy for local dev (essential)
- ✅ _redirects SPA routing (required)
- ✅ wrangler.toml IDs (required by Cloudflare)
- ✅ Separate Workers/Pages (Cloudflare architecture)

---

## Appendix: Complete Route Reference

### Frontend Routes (React Router)
| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Feed | Homepage feed |
| `/edit-profile` | EditProfile | Edit user profile |
| `/profile/:telegramId` | UnifiedProfile | View user profile |
| `/payments` | Payments | View payments |

### Backend API Routes
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/webhook` | Telegram webhook |
| GET/POST | `/api/auth` | Authentication |
| GET | `/api/posts` | Get all posts |
| GET | `/api/posts/user/:userId` | Get user posts |
| POST | `/api/posts` | Create post |
| PUT | `/api/posts/:postId` | Update post |
| DELETE | `/api/posts/:postId` | Delete post |
| POST | `/api/posts/:postId/images` | Upload images |
| DELETE | `/api/posts/:postId/images/:imageId` | Delete image |
| GET | `/api/profile/me` | Get my profile |
| PUT | `/api/profile/me` | Update my profile |
| POST | `/api/profile/me/avatar` | Upload avatar |
| GET | `/api/profile/:telegramId` | Get user profile |
| POST | `/api/admin/ban/:telegramId` | Ban user |
| POST | `/api/admin/unban/:telegramId` | Unban user |
| POST | `/api/posts/:postId/make-premium` | Make post premium |
| POST | `/api/posts/:postId/clear-pending` | Clear pending payment |
| GET | `/api/payments` | Get all payments |
| GET | `/api/payments/balance` | Get balance |
| POST | `/api/payments/refresh-balance` | Refresh balance |
| POST | `/api/payments/reconcile` | Reconcile payments |
| POST | `/api/payments/:paymentId/refund` | Refund payment |
| GET | `/r2/*` | Serve images (local only) |

### Infrastructure Bindings (wrangler.toml)
| Type | Binding | Resource |
|------|---------|----------|
| KV | `SESSIONS` | Session storage |
| D1 | `DB` | Database |
| R2 | `IMAGES` | Image storage |

---

**Last Updated:** 2025-10-01
**Version:** 3.0 (Phase 2 implemented - Direct Worker calls, Pages Functions removed) 🎉
