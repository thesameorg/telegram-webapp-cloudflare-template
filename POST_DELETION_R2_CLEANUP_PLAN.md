# Post Deletion R2 Cleanup Plan

## Problem

Currently, when a post is deleted, the associated images and thumbnails are **not** removed from R2 storage, leading to orphaned files.

## Current State

### Database CASCADE Behavior
- `postImages` table has `onDelete: 'cascade'` foreign key constraint (schema.ts:33)
- When a post is deleted, postImages **database records** are automatically removed
- However, the actual R2 files remain in storage

### R2 Storage Cleanup
- ❌ `PostService.deletePost()` does **NOT** delete images from R2 (post-service.ts:108-115)
- ✅ `ImageService.cleanupPostImages()` exists and handles R2 deletion (image-service.ts:186-207)
- The cleanup method properly deletes both full images and thumbnails from R2

## Solution

Update the `deletePost` API endpoint to call `ImageService.cleanupPostImages()` **before** deleting the post.

## Implementation Plan

### Update `backend/src/api/posts.ts` - `deletePost()` function (lines 209-243)

1. Instantiate `ImageService` after creating the database instance
2. Call `imageService.cleanupPostImages(postIdResult.postId)` before `postService.deletePost()`
3. Handle potential R2 deletion errors gracefully (continue with post deletion even if R2 cleanup fails)

### Code Changes

```typescript
export const deletePost = async (c: Context<{ Bindings: Env }>) => {
  try {
    const authResult = await authenticateUser(c);
    if (authResult.error) {
      return c.json({ error: authResult.error.message }, authResult.error.status);
    }

    const postIdResult = parsePostId(c);
    if (postIdResult.error) {
      return c.json({ error: postIdResult.error.message }, postIdResult.error.status);
    }

    const db = createDatabase(c.env.DB);
    const postService = new PostService(db, c.env);
    const imageService = new ImageService(db, c.env.IMAGES, c.env); // ADD THIS

    // Check ownership
    const existingPost = await postService.getPostById(postIdResult.postId);
    if (!existingPost) {
      return c.json({ error: 'Post not found' }, 404);
    }
    if (existingPost.userId !== authResult.session.userId) {
      return c.json({ error: 'Not authorized to delete this post' }, 403);
    }

    // Clean up R2 images before deleting post - ADD THIS
    await imageService.cleanupPostImages(postIdResult.postId);

    const deletedPost = await postService.deletePost(postIdResult.postId, authResult.session.userId);
    if (!deletedPost) {
      return c.json({ error: 'Failed to delete post' }, 500);
    }

    return c.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return c.json({ error: 'Failed to delete post' }, 500);
  }
};
```

## What `ImageService.cleanupPostImages()` Does

Located at `image-service.ts:186-207`, this method:
1. Fetches all image records for the post from the database
2. Iterates through each image and deletes both:
   - Full image from R2 (using `imageKey`)
   - Thumbnail from R2 (using `thumbnailKey`)
3. Logs errors for individual R2 deletions but continues processing
4. Deletes all postImages database records (redundant due to CASCADE, but ensures cleanup)

## Alternative Approach (Not Recommended)

Update `PostService.deletePost()` to accept `ImageService` and handle cleanup internally. This would centralize the logic but:
- Creates tight coupling between services
- Requires changing the service interface
- Less flexible for different deletion scenarios

## Testing Checklist

- [ ] Delete a post with no images (should work as before)
- [ ] Delete a post with 1 image (verify R2 cleanup)
- [ ] Delete a post with multiple images (verify all R2 files removed)
- [ ] Verify database CASCADE still works (postImages records deleted)
- [ ] Test with R2 deletion failures (ensure post still gets deleted)
- [ ] Check error handling and logging