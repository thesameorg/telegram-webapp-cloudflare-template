# Image Feature Implementation Plan

## Overview

This document outlines the implementation plan for adding image functionality to the Twitter-like application. Users will be able to upload up to 10 images per post, with automatic compression, thumbnail generation, and R2 storage integration.

**Key Requirements:**
- Images compressed to max 1280px, 90% JPEG quality (≤1MB)
- Thumbnails generated at 300px (≤100KB)
- Direct R2 bucket access via S3 API URL
- Convenient add/remove interface in create/edit modes
- Infinite scroll integration for lazy loading
- Simplified testing approach

## Current Architecture Analysis

### Existing Structure
- **Backend**: Cloudflare Workers with Hono.js, D1 database, KV storage for sessions
- **Frontend**: React + TypeScript + Vite, Tailwind CSS
- **Database**: SQLite with Drizzle ORM (`posts` table exists)
- **Storage**: KV namespace for caching (currently caches feed data for 5 minutes)
- **Cache Strategy**: Feed responses cached by `limit:offset` pairs, invalidated on post CRUD

### Current Post Schema
```sql
posts: {
  id: integer (primary key)
  userId: integer
  username: text
  displayName: text
  content: text
  createdAt: text
  updatedAt: text
}
```

## Implementation Plan

### Phase 1: Infrastructure Setup

#### 1.1 Cloudflare R2 Bucket Configuration
- **Setup**: Use existing `twa-tpl-images` bucket
- **Bindings**: Add R2 bucket binding to `wrangler.toml`
- **Environment**: Update `Env` interface in `backend/src/types/env.ts`
- **Local Development**: Uses Wrangler local R2 emulation (via `wrangler dev --local`)
- **S3 API URL**: `https://e023ec3576222c6a7b6cdf933de3d915.r2.cloudflarestorage.com/twa-tpl-images`

```toml
# wrangler.toml - Add this section
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "twa-tpl-images"
```

**Manual Bucket Setup Required:**
- Create `twa-tpl-images` bucket in Cloudflare Dashboard
- Configure CORS for direct frontend access:
  ```json
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
  ```

#### 1.2 Database Schema Updates
- **New Table**: Create `post_images` table to store image metadata
- **Migration**: Add Drizzle migration for new schema

```sql
-- New table structure
post_images: {
  id: integer (primary key)
  postId: integer (foreign key to posts.id)
  originalName: text
  imageKey: text (R2 object key)
  thumbnailKey: text (R2 thumbnail key)
  mimeType: text
  fileSize: integer
  width: integer
  height: integer
  uploadOrder: integer (1-10)
  createdAt: text
}
```

### Phase 2: Backend Implementation

#### 2.1 Image Service Layer
- **Location**: `backend/src/services/image-service.ts`
- **Features**:
  - Upload images to R2
  - Generate unique keys with UUIDs
  - Validate file types (JPEG, PNG, WebP)
  - Size limits: 1MB for full images, 100KB for thumbnails
  - Cleanup orphaned images

#### 2.2 Enhanced Post Service
- **Updates**: Modify `PostService` to handle image associations
- **Methods**:
  - `createPostWithImages()`
  - `updatePostImages()`
  - `deletePostImages()` (cleanup R2 objects)

#### 2.3 API Endpoints
- **New Routes**:
  - `POST /api/posts/:postId/images` - Upload images
  - `DELETE /api/posts/:postId/images/:imageId` - Delete specific image
  - **No image serving endpoint** - Images accessed directly via S3 API URL

#### 2.4 Cache Strategy Updates
- **Text-Only Caching**: Modify feed cache to exclude image data
- **Image URLs**: Include direct R2 S3 API URLs in API responses
- **Direct Access**: Images loaded directly from `https://e023ec3576222c6a7b6cdf933de3d915.r2.cloudflarestorage.com/twa-tpl-images/`

### Phase 3: Frontend Implementation

#### 3.1 Image Processing Library
- **Choice**: `browser-image-compression` (230k+ weekly downloads)
- **Features**:
  - Resize to max 1280px width
  - 90% JPEG quality compression
  - EXIF data removal
  - Thumbnail generation (e.g., 300px max width)

#### 3.2 Upload Component
- **Location**: `frontend/src/components/ImageUpload.tsx`
- **Features**:
  - Drag & drop interface
  - Multi-file selection (max 10)
  - Progress indicators
  - Client-side compression (ensure ≤1MB full, ≤100KB thumb)
  - Preview thumbnails
  - **Convenient add/remove interface**:
    - Individual image removal with X button
    - Replace functionality
    - Visual reorder with drag handles

#### 3.3 Image Gallery Component
- **Library**: "Yet Another React Lightbox" (most popular 2024 choice)
- **Features**:
  - Lazy loading thumbnails (integrate with infinite scroll)
  - Click to expand lightbox
  - Touch gestures (mobile)
  - Zoom functionality
  - **No keyboard navigation** (simplified)

#### 3.4 Post Components Updates
- **PostItem**: Add image thumbnail grid with lazy loading
- **CreatePost**: Integrate ImageUpload component with convenient add/remove
- **EditPost**: Allow full image management (add, remove, reorder existing images)

#### 3.5 Skeleton Updates
- **PostSkeleton**: Add image placeholder boxes
- **Gallery Skeleton**: Loading states for image grids

### Phase 4: Technical Implementation Details

#### 4.1 Client-Side Image Processing Flow
```javascript
// Compression pipeline with size limits
1. File selection → validation (type, size, count)
2. Image compression (1280px, 90% quality, ensure ≤1MB)
3. Thumbnail generation (300px, ensure ≤100KB)
4. EXIF removal
5. Upload to backend
```

#### 4.2 Storage Structure
```
R2 Bucket Structure:
/images/
  /{post-id}/
    /full/
      /{uuid}.jpg
    /thumbs/
      /{uuid}_thumb.jpg
```

#### 4.3 API Response Format
```json
{
  "post": {
    "id": 1,
    "content": "Post text",
    "images": [
      {
        "id": 1,
        "imageUrl": "https://e023ec3576222c6a7b6cdf933de3d915.r2.cloudflarestorage.com/twa-tpl-images/images/123/full/uuid.jpg",
        "thumbnailUrl": "https://e023ec3576222c6a7b6cdf933de3d915.r2.cloudflarestorage.com/twa-tpl-images/images/123/thumbs/uuid_thumb.jpg",
        "width": 1280,
        "height": 720
      }
    ]
  }
}
```

### Phase 5: Performance Optimizations

#### 5.1 Caching Strategy
- **Feed Cache**: Continue caching text data only
- **Image Cache**: R2 serves with CDN caching headers
- **Thumbnail Priority**: Load thumbnails first, full images on demand

#### 5.2 Loading Strategy
- **Progressive Loading**: Thumbnails → lightbox full images
- **Infinite Scroll Integration**: Images load as posts become visible
- **Intersection Observer**: Track visibility for loading (integrate with existing infinite scroll hook)

#### 5.3 Cleanup Jobs
- **Orphaned Images**: Background job to clean unused images
- **Failed Uploads**: Cleanup partial uploads after timeout

### Phase 6: Implementation Order

1. **Database Migration**: Add `post_images` table
2. **R2 Setup**: Configure bucket and bindings
3. **Backend Services**: Image service and updated post service
4. **API Routes**: Image upload and serving endpoints
5. **Frontend Libraries**: Install compression and lightbox libraries
6. **Upload Component**: Build image upload interface
7. **Gallery Component**: Implement lightbox gallery
8. **Post Integration**: Update post components with images
9. **Skeleton Updates**: Add image loading states
10. **Cache Updates**: Modify feed caching strategy
11. **Cleanup Logic**: Implement image deletion and cleanup

### Phase 7: Testing Strategy (Simplified)

#### 7.1 Unit Tests Only
- **Backend**:
  - Image upload validation
  - File size enforcement (1MB/100KB limits)
  - Post-image association
- **Frontend**:
  - Image compression functionality
  - Upload component behavior
  - Size limit validation

**Note**: No complex integration tests - focus on unit tests for core functionality.

## Technical Considerations

### Pros of This Approach
- **Client-side compression**: Reduces bandwidth and server processing
- **R2 Integration**: Cost-effective, zero egress fees
- **Existing cache**: Maintains text caching while images load separately
- **Progressive enhancement**: App works without images, enhanced with them

### Potential Challenges
- **Browser compatibility**: Ensure compression works across browsers
- **Large uploads**: Handle multiple large images gracefully
- **Mobile performance**: Optimize for mobile devices
- **Storage costs**: Monitor R2 usage and implement cleanup

### Security Considerations
- **File validation**: Server-side validation of uploaded files
- **Size limits**: Enforce 1MB/100KB limits to prevent abuse
- **Rate limiting**: Prevent spam uploads
- **CORS**: Configure R2 bucket CORS for direct frontend access

## Estimated Implementation Time
- **Phase 1-2 (Backend)**: 2-3 days
- **Phase 3-4 (Frontend)**: 3-4 days
- **Phase 5-6 (Integration)**: 2 days
- **Phase 7 (Testing)**: 1 day

**Total**: ~8-10 days (reduced due to simplified approach)

## Alternative Considerations

### Library Alternatives
- **Compression**: `compressorjs` for simpler API
- **Lightbox**: `react-image-lightbox` for minimal footprint
