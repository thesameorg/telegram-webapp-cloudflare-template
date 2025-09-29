import { z } from 'zod';

// Simple content sanitization for Cloudflare Workers
const sanitizeContent = (content: string): string => {
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

export const createPostSchema = z.object({
  content: z.string()
    .min(1, "Post cannot be empty")
    .max(280, "Post cannot exceed 280 characters")
    .transform((content) => sanitizeContent(content))
});

export const getPostsSchema = z.object({
  limit: z.string().optional().transform((val) => {
    if (!val) return 50;
    const num = parseInt(val, 10);
    return isNaN(num) ? 50 : Math.min(Math.max(num, 1), 100);
  }),
  offset: z.string().optional().transform((val) => {
    if (!val) return 0;
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : Math.max(num, 0);
  })
});

export const getUserPostsSchema = z.object({
  userId: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) throw new Error('Invalid user ID');
    return num;
  }),
  limit: z.string().optional().transform((val) => {
    if (!val) return 50;
    const num = parseInt(val, 10);
    return isNaN(num) ? 50 : Math.min(Math.max(num, 1), 100);
  }),
  offset: z.string().optional().transform((val) => {
    if (!val) return 0;
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : Math.max(num, 0);
  })
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type GetPostsInput = z.infer<typeof getPostsSchema>;
export type GetUserPostsInput = z.infer<typeof getUserPostsSchema>;