# Routing Architecture

This document explains how URLs and API requests are handled across different environments in this Telegram Web App template.

## Overview

The application uses a **monorepo architecture** with:
- **Frontend**: React SPA with React Router (client-side routing)
- **Backend**: Cloudflare Workers with Hono.js (API server)
- **Deployment**: Cloudflare Pages (frontend) + Cloudflare Workers (backend)

## URL Types

### 1. Frontend Routes (React Router)
These are **client-side routes** handled by React Router in the browser:

- `/` - Feed page
- `/my-posts` - User's posts
- `/account` - Account information page
- `/edit-profile` - Profile editing page
- `/profile/:telegramId` - User profile view

**Defined in**: `frontend/src/Router.tsx`

**Important**: These routes only exist in the browser. If you navigate directly to `/edit-profile` via a full page load, the server must serve `index.html` so React Router can take over.

### 2. Backend API Routes
These are **server-side endpoints** handled by the Cloudflare Worker:

- `GET /api/health` - Health check
- `POST /webhook` - Telegram webhook handler
- `GET /api/auth` - Authentication
- `POST /api/auth` - Authentication
- `GET /api/posts` - Get all posts
- `GET /api/posts/user/:userId` - Get user's posts
- `POST /api/posts` - Create post
- `PUT /api/posts/:postId` - Update post
- `DELETE /api/posts/:postId` - Delete post
- `POST /api/posts/:postId/images` - Upload post images
- `DELETE /api/posts/:postId/images/:imageId` - Delete post image
- `GET /api/profile/me` - Get current user's profile
- `PUT /api/profile/me` - Update current user's profile
- `POST /api/profile/me/avatar` - Upload profile avatar
- `GET /api/profile/:telegramId` - Get user profile
- `GET /r2/*` - Serve R2 images (local dev only)

**Defined in**: `backend/src/index.ts`

## Environment-Specific Routing

### Local Development (`npm run dev`)

**Frontend**: `http://localhost:3000`
**Backend**: `http://localhost:8787`

#### How it works:
1. **Frontend routes** (`/`, `/account`, `/edit-profile`, etc.):
   - Served by Vite dev server at `:3000`
   - React Router handles navigation client-side
   - No server requests for route changes

2. **API routes** (`/api/*`, `/webhook`, `/r2/*`):
   - Vite proxy intercepts these requests
   - Forwards to backend at `localhost:8787`
   - Backend Worker responds

**Configuration**:
```typescript
// frontend/vite.config.ts
server: {
  port: 3000,
  proxy: {
    '/api': 'http://localhost:8787',
    '/health': 'http://localhost:8787',
    '/webhook': 'http://localhost:8787',
    '/r2': 'http://localhost:8787'
  }
}
```

**Example flow**:
```
User clicks "Edit Profile" button
→ navigate('/edit-profile')
→ React Router updates URL in browser
→ EditProfile component renders
→ No server request!

User uploads avatar
→ POST http://localhost:3000/api/profile/me/avatar
→ Vite proxy forwards to http://localhost:8787/api/profile/me/avatar
→ Backend Worker processes upload
→ Returns success
→ React re-fetches profile data
```

### Local Development with Telegram (`npm run tunnel:start`)

Uses **ngrok** or **cloudflared** to create a public HTTPS URL for Telegram webhook testing.

**Setup**:
1. Start dev servers: `npm run dev`
2. Start tunnel: `npm run tunnel:start`
3. Tunnel creates public URL: `https://abc123.ngrok-free.app`
4. Set Telegram webhook to: `https://abc123.ngrok-free.app/webhook`

**How it works**:
- Tunnel forwards `https://abc123.ngrok-free.app` → `http://localhost:8787`
- Telegram sends webhook events to the tunnel URL
- Backend Worker receives and processes webhooks
- Frontend still served from `localhost:3000` (Vite dev server)

**Allowed hosts**:
```typescript
// frontend/vite.config.ts
server: {
  allowedHosts: ['*.ngrok-free.app', '*.trycloudflare.com']
}
```

### Deployed Production

**Frontend**: `https://twa-cf-tpl.pages.dev` (Cloudflare Pages)
**Backend**: `https://twa-cf-tpl-prod.workers.dev` (Cloudflare Workers)

#### Architecture:
```
User Browser
    ↓
Cloudflare Pages (frontend)
    ↓
├─ Static files (HTML, JS, CSS) → Served directly
├─ /api/* requests → Functions [[path]].ts (proxy)
    ↓
    Cloudflare Workers (backend) → Processes API requests
```

#### How it works:

1. **Frontend routes** (`/`, `/account`, `/edit-profile`, etc.):
   - Initial load: Cloudflare Pages serves `index.html`
   - `_redirects` file ensures all non-API routes serve `index.html`
   - React Router takes over after page loads
   - Navigation happens client-side (no server requests)

2. **API routes** (`/api/*`):
   - Request goes to Cloudflare Pages
   - `_redirects` routes to Pages Functions
   - `[[path]].ts` proxy forwards to Workers backend
   - Workers backend processes and responds

**Configuration files**:

**`frontend/public/_redirects`** (Cloudflare Pages redirect rules):
```
# API routes go to Functions
/api/* /api/:splat 200

# Everything else goes to React app (SPA)
/* /index.html 200
```

**`frontend/functions/api/[[path]].ts`** (Pages Functions proxy):
```typescript
// Proxies /api/* requests to Workers backend
const targetUrl = `${WORKER_URL}/api/${params.path.join('/')}${url.search}`;
const response = await fetch(targetUrl, {
  method: request.method,
  headers: request.headers,
  body: request.body,
});
```

**`frontend/functions/config.ts`** (Environment URLs):
```typescript
export const WORKER_URL = "https://twa-cf-tpl-prod.workers.dev"
export const PAGES_URL = "https://twa-cf-tpl.pages.dev"
```

**Example flow**:
```
User visits https://twa-cf-tpl.pages.dev/edit-profile
→ Cloudflare Pages receives request
→ _redirects: /* → /index.html (200)
→ Serves index.html with React app
→ React Router sees /edit-profile path
→ Renders EditProfile component

User uploads avatar
→ POST https://twa-cf-tpl.pages.dev/api/profile/me/avatar
→ _redirects: /api/* → /api/:splat (200)
→ Pages Function [[path]].ts receives request
→ Proxies to https://twa-cf-tpl-prod.workers.dev/api/profile/me/avatar
→ Workers backend processes upload
→ Response flows back through proxy
→ React updates UI
```

## Common Routing Issues & Solutions

### Issue 1: 404 on Frontend Routes After Page Reload

**Problem**: Visiting `/edit-profile` directly (or refreshing the page) returns 404.

**Cause**: Server doesn't know about React Router routes.

**Solution**: Ensure `_redirects` file routes all non-API requests to `index.html`:
```
/* /index.html 200
```

**Local fix**: Vite dev server handles this automatically.
**Deployed fix**: Verify `frontend/public/_redirects` is copied to `frontend/dist/_redirects` during build.

### Issue 2: `window.location.reload()` Causes 404

**Problem**: Full page reload after uploading avatar caused GET request to `/edit-profile` → 404 in production.

**Cause**: Page reload bypasses React Router and makes server request. If `_redirects` isn't working, you get 404.

**Solution**: Avoid full page reloads in SPAs. Use React state updates instead:
```typescript
// ❌ Bad: Full page reload
window.location.reload();

// ✅ Good: Refresh data via React state
await fetchProfile(); // Re-fetch and update state
```

**Fixed in**: `frontend/src/components/profile/ProfileEditor.tsx` (replaced `window.location.reload()` with callback)

### Issue 3: API Calls Fail with CORS Errors

**Problem**: API requests from frontend fail with CORS errors.

**Cause**: Cross-origin requests between Pages (frontend) and Workers (backend).

**Solution**: Pages Functions proxy sets CORS headers:
```typescript
// frontend/functions/api/[[path]].ts
response.headers.set('Access-Control-Allow-Origin', origin)
response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
response.headers.set('Access-Control-Allow-Credentials', 'true')
```

### Issue 4: Different Behavior Local vs Deployed

**Problem**: Feature works locally but fails in production.

**Cause**: Different routing mechanisms:
- Local: Vite dev server + proxy
- Deployed: Cloudflare Pages + Functions + Workers

**Debug steps**:
1. Check if `_redirects` file exists in `frontend/dist/` after build
2. Verify `frontend/functions/config.ts` has correct URLs
3. Check Cloudflare Pages deployment logs
4. Test API calls directly to Workers backend URL
5. Ensure no `window.location` methods bypass React Router

## Best Practices

### 1. Always Use React Router for Navigation
```typescript
// ✅ Good: Client-side navigation
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/edit-profile');

// ❌ Bad: Server request
window.location.href = '/edit-profile';
```

### 2. Avoid Full Page Reloads
```typescript
// ✅ Good: Update state
await fetchData();
setData(newData);

// ❌ Bad: Reload page
window.location.reload();
```

### 3. Use Relative API Paths
```typescript
// ✅ Good: Works in all environments
fetch('/api/profile/me')

// ❌ Bad: Hardcoded URLs break
fetch('http://localhost:8787/api/profile/me')
```

### 4. Keep _redirects Simple
```
# API routes to Functions
/api/* /api/:splat 200

# Everything else to SPA
/* /index.html 200
```

### 5. Test in All Environments
- Local dev server
- Local with ngrok/tunnel
- Deployed preview
- Deployed production

## Debugging Tips

### Check What's Being Requested
```typescript
// Add to frontend code
console.log('Fetching:', url, method);

// Add to backend code (backend/src/index.ts)
app.use('*', async (c, next) => {
  console.log(`${c.req.method} ${c.req.url}`);
  await next();
});

// Add to Pages Functions (frontend/functions/api/[[path]].ts)
console.log('Proxy request:', request.method, request.url, 'Path:', params.path);
```

### Verify _redirects Deployment
1. Build frontend: `cd frontend && npm run build`
2. Check file exists: `ls frontend/dist/_redirects`
3. Check Cloudflare Pages deployment includes `_redirects`

### Test Workers Backend Directly
```bash
# Health check
curl https://twa-cf-tpl-prod.workers.dev/api/health

# Get profile (needs auth)
curl https://twa-cf-tpl-prod.workers.dev/api/profile/me \
  -H "x-session-id: YOUR_SESSION_ID"
```

### Check Cloudflare Logs
```bash
# Tail Workers logs
npx wrangler tail

# Check Pages Functions logs
# Visit: https://dash.cloudflare.com → Pages → twa-cf-tpl → Functions
```

## Summary

| Environment | Frontend Routing | API Routing | Notes |
|-------------|------------------|-------------|-------|
| **Local** | React Router (`:3000`) | Vite proxy → `:8787` | Separate ports, proxy handles API |
| **Local + Tunnel** | React Router (`:3000`) | Tunnel → `:8787` | Public HTTPS for webhooks |
| **Deployed** | React Router (Pages) | Pages Functions → Workers | `_redirects` + `[[path]].ts` proxy |

**Key principle**: Frontend routes are client-side only. API routes are server-side only. Never mix them.