import { z } from "zod";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

export const TelegramUserSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  username: z.string().min(1).optional(),
  language_code: z.string().length(2),
  is_premium: z.boolean().optional(),
  allows_write_to_pm: z.boolean().optional(),
  photo_url: z.string().url().optional(),
});

export function validateTelegramUser(data: unknown): TelegramUser {
  return TelegramUserSchema.parse(data);
}

export function getDisplayName(user: TelegramUser): string {
  return user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.first_name;
}
