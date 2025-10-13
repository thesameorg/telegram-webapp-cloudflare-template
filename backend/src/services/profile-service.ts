import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { userProfiles } from "../db/schema";
import type { UserProfile, NewUserProfile } from "../db/schema";
import type { UpdateProfileInput, ContactLinks } from "../models/profile";
import type { D1Database } from "@cloudflare/workers-types";

export class ProfileService {
  private readonly db: ReturnType<typeof drizzle>;

  constructor(database: D1Database) {
    this.db = drizzle(database);
  }

  async getProfile(telegramId: number): Promise<UserProfile | null> {
    const result = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.telegramId, telegramId))
      .limit(1);

    return result[0] || null;
  }

  async createProfile(
    telegramId: number,
    username?: string,
    displayName?: string,
  ): Promise<UserProfile> {
    // Prepare contact links with telegram username if provided
    const contactLinks: { telegram?: string } = {};
    if (username) {
      contactLinks.telegram = username;
    }

    const newProfile: NewUserProfile = {
      telegramId,
      username: username ?? null,
      displayName: displayName ?? null,
      contactLinks:
        Object.keys(contactLinks).length > 0
          ? JSON.stringify(contactLinks)
          : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await this.db
      .insert(userProfiles)
      .values(newProfile)
      .returning();

    return result[0];
  }

  async updateProfile(
    telegramId: number,
    data: UpdateProfileInput,
  ): Promise<UserProfile> {
    // First, ensure profile exists
    const profile = await this.getProfile(telegramId);
    if (!profile) {
      await this.createProfile(telegramId);
    }

    const updateData: Partial<NewUserProfile> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.display_name !== undefined) {
      updateData.displayName = data.display_name;
    }
    if (data.bio !== undefined) {
      updateData.bio = data.bio;
    }
    if (data.phone_number !== undefined) {
      updateData.phoneNumber = data.phone_number;
    }
    if (data.contact_links !== undefined) {
      updateData.contactLinks = JSON.stringify(data.contact_links);
    }

    const result = await this.db
      .update(userProfiles)
      .set(updateData)
      .where(eq(userProfiles.telegramId, telegramId))
      .returning();

    return result[0];
  }

  async uploadAvatar(
    telegramId: number,
    imageKey: string,
  ): Promise<UserProfile> {
    // First, ensure profile exists
    const profile = await this.getProfile(telegramId);
    if (!profile) {
      await this.createProfile(telegramId);
    }

    const result = await this.db
      .update(userProfiles)
      .set({
        profileImageKey: imageKey,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userProfiles.telegramId, telegramId))
      .returning();

    return result[0];
  }

  // Helper method to parse contact links safely
  parseContactLinks(contactLinksJson: string | null): ContactLinks {
    if (!contactLinksJson) return {};

    try {
      return JSON.parse(contactLinksJson);
    } catch {
      return {};
    }
  }

  // Enhanced profile response with parsed contact links
  formatProfile(
    profile: UserProfile,
  ): UserProfile & { parsedContactLinks: ContactLinks } {
    return {
      ...profile,
      parsedContactLinks: this.parseContactLinks(profile.contactLinks),
    };
  }
}
