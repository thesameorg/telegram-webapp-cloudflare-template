import { z } from "zod";

// Simple content sanitization for Cloudflare Workers
const sanitizeContent = (content: string): string => {
  return content
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
};

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(280, "Comment cannot exceed 280 characters")
    .transform((content) => sanitizeContent(content)),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(280, "Comment cannot exceed 280 characters")
    .transform((content) => sanitizeContent(content)),
});

export const getCommentsSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 50;
      const num = parseInt(val, 10);
      return isNaN(num) ? 50 : Math.min(Math.max(num, 1), 100);
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 0;
      const num = parseInt(val, 10);
      return isNaN(num) ? 0 : Math.max(num, 0);
    }),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type GetCommentsInput = z.infer<typeof getCommentsSchema>;
