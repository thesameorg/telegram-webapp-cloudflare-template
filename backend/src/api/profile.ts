import { Context } from "hono";
import { createDatabase } from "../db";
import { ProfileService } from "../services/profile-service";
import { PostService } from "../services/post-service";
import { updateProfileSchema, getProfileSchema } from "../models/profile";
import { SessionManager } from "../services/session-manager";
import { ImageService } from "../services/image-service";
import type { Env } from "../types/env";

// Get public profile by telegram ID
export const getProfile = async (c: Context<{ Bindings: Env }>) => {
  try {
    const { telegramId } = getProfileSchema.parse({
      telegramId: c.req.param("telegramId"),
    });

    const profileService = new ProfileService(c.env.DB);
    const profile = await profileService.getProfile(telegramId);

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const formattedProfile = profileService.formatProfile(profile);

    // If user is banned, return minimal info
    if (profile.isBanned === 1) {
      return c.json({
        profile: {
          telegram_id: formattedProfile.telegramId,
          display_name: formattedProfile.displayName,
          is_banned: true,
        },
      });
    }

    return c.json({
      profile: {
        telegram_id: formattedProfile.telegramId,
        display_name: formattedProfile.displayName,
        bio: formattedProfile.bio,
        contact_links: formattedProfile.parsedContactLinks,
        profile_image_key: formattedProfile.profileImageKey,
        created_at: formattedProfile.createdAt,
        is_banned: false,
      },
    });
  } catch (error: unknown) {
    console.error("Error getting profile:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Failed to get profile",
      },
      400,
    );
  }
};

// Get current user's profile
export const getMyProfile = async (c: Context<{ Bindings: Env }>) => {
  try {
    const sessionManager = new SessionManager(c.env.SESSIONS);
    const sessionId = c.req.header("x-session-id");

    if (!sessionId) {
      return c.json({ error: "Session ID required" }, 401);
    }

    const session = await sessionManager.validateSession(sessionId);
    if (!session) {
      return c.json({ error: "Invalid session" }, 401);
    }

    const profileService = new ProfileService(c.env.DB);
    let profile = await profileService.getProfile(session.userId);

    // Create profile if it doesn't exist
    if (!profile) {
      profile = await profileService.createProfile(
        session.userId,
        session.username,
        session.displayName,
      );
    }

    const formattedProfile = profileService.formatProfile(profile);

    return c.json({
      profile: {
        telegram_id: formattedProfile.telegramId,
        username: formattedProfile.username,
        display_name: formattedProfile.displayName,
        bio: formattedProfile.bio,
        phone_number: formattedProfile.phoneNumber,
        contact_links: formattedProfile.parsedContactLinks,
        profile_image_key: formattedProfile.profileImageKey,
        created_at: formattedProfile.createdAt,
        updated_at: formattedProfile.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error("Error getting my profile:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Failed to get profile",
      },
      500,
    );
  }
};

// Update current user's profile
export const updateMyProfile = async (c: Context<{ Bindings: Env }>) => {
  try {
    const sessionManager = new SessionManager(c.env.SESSIONS);
    const sessionId = c.req.header("x-session-id");

    if (!sessionId) {
      return c.json({ error: "Session ID required" }, 401);
    }

    const session = await sessionManager.validateSession(sessionId);
    if (!session) {
      return c.json({ error: "Invalid session" }, 401);
    }

    const body = await c.req.json();
    const updateData = updateProfileSchema.parse(body);

    const profileService = new ProfileService(c.env.DB);
    const updatedProfile = await profileService.updateProfile(
      session.userId,
      updateData,
    );

    // Update display name in all posts if changed
    if (updateData.display_name !== undefined) {
      const db = createDatabase(c.env.DB);
      const postService = new PostService(db, c.env);
      await postService.updateUserDisplayNameInPosts(
        session.userId,
        updateData.display_name,
      );
      console.log(
        `Updated display name in all posts for user ${session.userId}`,
      );
    }

    const formattedProfile = profileService.formatProfile(updatedProfile);

    return c.json({
      profile: {
        telegram_id: formattedProfile.telegramId,
        display_name: formattedProfile.displayName,
        bio: formattedProfile.bio,
        phone_number: formattedProfile.phoneNumber,
        contact_links: formattedProfile.parsedContactLinks,
        profile_image_key: formattedProfile.profileImageKey,
        updated_at: formattedProfile.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error("Error updating profile:", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update profile",
      },
      400,
    );
  }
};

// Upload profile avatar
export const uploadProfileAvatar = async (c: Context<{ Bindings: Env }>) => {
  try {
    const sessionManager = new SessionManager(c.env.SESSIONS);
    const sessionId = c.req.header("x-session-id");

    if (!sessionId) {
      return c.json({ error: "Session ID required" }, 401);
    }

    const session = await sessionManager.validateSession(sessionId);
    if (!session) {
      return c.json({ error: "Invalid session" }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return c.json({ error: "Image file is required" }, 400);
    }

    // Validate file type and size
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Only JPEG and PNG images are allowed" }, 400);
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return c.json({ error: "Image must be smaller than 5MB" }, 400);
    }

    const db = createDatabase(c.env.DB);
    const imageService = new ImageService(db, c.env.IMAGES);
    const profileService = new ProfileService(c.env.DB);

    // Get current profile to check for existing avatar
    const currentProfile = await profileService.getProfile(session.userId);
    if (currentProfile?.profileImageKey) {
      // Delete old avatar from R2 before uploading new one
      await imageService.deleteProfileImage(currentProfile.profileImageKey);
    }

    // Upload profile image (resized to 512px)
    const profileImageKey = `profiles/${session.userId}/${Date.now()}-avatar.jpg`;
    await imageService.uploadProfileImage(file, profileImageKey);

    // Update profile with new image key
    const updatedProfile = await profileService.uploadAvatar(
      session.userId,
      profileImageKey,
    );

    return c.json({
      profile_image_key: updatedProfile.profileImageKey,
      message: "Profile avatar updated successfully",
    });
  } catch (error: unknown) {
    console.error("Error uploading profile avatar:", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload avatar",
      },
      500,
    );
  }
};
