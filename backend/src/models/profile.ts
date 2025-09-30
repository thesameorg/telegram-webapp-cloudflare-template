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

export const contactLinksSchema = z.object({
  website: z.string().url().optional(),
  twitter: z.string().max(50).optional(),
  instagram: z.string().max(50).optional(),
  linkedin: z.string().max(50).optional(),
  telegram: z.string().max(50).optional(),
});

export const updateProfileSchema = z.object({
  display_name: z.string()
    .min(1, "Display name cannot be empty")
    .max(50, "Display name cannot exceed 50 characters")
    .transform((content) => sanitizeContent(content))
    .optional(),
  bio: z.string()
    .max(160, "Bio cannot exceed 160 characters")
    .transform((content) => sanitizeContent(content))
    .optional(),
  phone_number: z.string()
    .max(20, "Phone number cannot exceed 20 characters")
    .optional(),
  contact_links: contactLinksSchema.optional()
});

export const getProfileSchema = z.object({
  telegramId: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) throw new Error('Invalid telegram ID');
    return num;
  })
});

export type ContactLinks = z.infer<typeof contactLinksSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type GetProfileInput = z.infer<typeof getProfileSchema>;