import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import { cors } from "hono/cors";
import { handleWebhook } from "./webhook";
import { healthHandler } from "./api/health";
import { authHandler } from "./api/auth";
import {
  getAllPosts,
  getPostById,
  getUserPosts,
  createPost,
  updatePost,
  deletePost,
  uploadPostImages,
  deletePostImage,
} from "./api/posts";
import {
  getCommentsByPostId,
  createComment,
  updateComment,
  deleteComment,
  hideComment,
  unhideComment,
} from "./api/comments";
import {
  getProfile,
  getMyProfile,
  updateMyProfile,
  uploadProfileAvatar,
} from "./api/profile";
import { banUser, unbanUser } from "./api/admin";
import {
  makePremium,
  clearPending,
  getAllPayments,
  getBalance,
  refreshBalance,
  refundPayment,
  reconcilePayments,
} from "./api/payments";
import { authMiddleware, adminMiddleware } from "./middleware/auth-middleware";
import type { Env } from "./types/env";

const app = new Hono<{ Bindings: Env }>();

// Simple middleware
app.use("*", prettyJSON());

// CORS middleware for API endpoints
app.use(
  "/api/*",
  cors({
    origin: (origin, c) => {
      // Get Pages URL from environment - used for CORS validation
      // Local: from .env file
      // Production: passed via --var during deployment
      // Tests: undefined, falls back to wildcard
      const pagesUrl = c.env.PAGES_URL;
      if (!pagesUrl) {
        console.warn(
          "PAGES_URL not set - using wildcard CORS (not recommended for production)",
        );
        return origin || "*";
      }

      const allowed = [pagesUrl, "https://t.me"];

      // Check if origin starts with any allowed domain
      if (origin && allowed.some((a) => origin.startsWith(a))) {
        return origin;
      }
      // Default to first allowed origin for preflight requests
      return allowed[0];
    },
    credentials: true,
  }),
);

// Public endpoints (no auth required)
app.get("/api/health", healthHandler);
app.post("/webhook", handleWebhook);
app.get("/api/auth", authHandler);
app.post("/api/auth", authHandler);

// Public read endpoints (no auth required)
app.get("/api/posts", getAllPosts);
app.get("/api/posts/:postId", getPostById);
app.get("/api/posts/user/:userId", getUserPosts);
app.get("/api/posts/:postId/comments", getCommentsByPostId);

// Post endpoints (auth required for write operations)
app.post("/api/posts", authMiddleware, createPost);
app.put("/api/posts/:postId", authMiddleware, updatePost);
app.delete("/api/posts/:postId", authMiddleware, deletePost);

// Image endpoints (auth required)
app.post("/api/posts/:postId/images", authMiddleware, uploadPostImages);
app.delete("/api/posts/:postId/images/:imageId", authMiddleware, deletePostImage);

// Comment endpoints (auth required for write operations)
app.post("/api/posts/:postId/comments", authMiddleware, createComment);
app.put("/api/comments/:commentId", authMiddleware, updateComment);
app.delete("/api/comments/:commentId", authMiddleware, deleteComment);
app.post("/api/comments/:commentId/hide", authMiddleware, adminMiddleware, hideComment);
app.post("/api/comments/:commentId/unhide", authMiddleware, adminMiddleware, unhideComment);

// Profile endpoints (specific routes first, then dynamic routes)
app.get("/api/profile/me", authMiddleware, getMyProfile);
app.put("/api/profile/me", authMiddleware, updateMyProfile);
app.post("/api/profile/me/avatar", authMiddleware, uploadProfileAvatar);
app.get("/api/profile/:telegramId", getProfile);

// Admin endpoints (auth + admin required)
app.post("/api/admin/ban/:telegramId", authMiddleware, adminMiddleware, banUser);
app.post("/api/admin/unban/:telegramId", authMiddleware, adminMiddleware, unbanUser);

// Payment endpoints (auth required, some admin-only)
app.post("/api/posts/:postId/make-premium", authMiddleware, makePremium);
app.post("/api/posts/:postId/clear-pending", authMiddleware, clearPending);
app.get("/api/payments", authMiddleware, adminMiddleware, getAllPayments);
app.get("/api/payments/balance", authMiddleware, adminMiddleware, getBalance);
app.post("/api/payments/refresh-balance", authMiddleware, adminMiddleware, refreshBalance);
app.post("/api/payments/reconcile", authMiddleware, adminMiddleware, reconcilePayments);
app.post("/api/payments/:paymentId/refund", authMiddleware, adminMiddleware, refundPayment);

// R2 image serving for local development
app.get("/r2/*", async (c) => {
  const path = c.req.url.split("/r2/")[1];
  if (!path) {
    return c.json({ error: "Invalid path" }, 400);
  }

  const r2 = c.env.IMAGES;
  if (!r2) {
    return c.json({ error: "R2 bucket not available" }, 500);
  }

  try {
    const object = await r2.get(path);
    if (!object) {
      return c.json({ error: "Image not found" }, 404);
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      object.httpMetadata?.contentType || "application/octet-stream",
    );
    headers.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    return new Response(object.body as unknown as ReadableStream, {
      headers: headers,
    });
  } catch (error) {
    console.error("Error serving R2 image:", error);
    return c.json({ error: "Failed to serve image" }, 500);
  }
});

app.get("/", async (c) => {
  const env = c.env.ENVIRONMENT || "local";

  let kvStatus = "unknown";
  try {
    const kv = c.env.SESSIONS;
    if (kv) {
      await kv.get("ping");
      kvStatus = "healthy";
    } else {
      kvStatus = "unavailable";
    }
  } catch {
    kvStatus = "error";
  }

  return c.json({
    message: "Telegram Web App + Bot Template",
    environment: env,
    timestamp: new Date().toISOString(),
    services: { kv: kvStatus },
    endpoints: {
      health: "/api/health",
      webhook: "/webhook",
      auth: "/api/auth",
      posts: "/api/posts",
      userPosts: "/api/posts/user/:userId",
      updatePost: "/api/posts/:postId",
      deletePost: "/api/posts/:postId",
      uploadImages: "/api/posts/:postId/images",
      deleteImage: "/api/posts/:postId/images/:imageId",
      profile: "/api/profile/:telegramId",
      myProfile: "/api/profile/me",
      updateProfile: "/api/profile/me",
      uploadAvatar: "/api/profile/me/avatar",
      banUser: "/api/admin/ban/:telegramId",
      unbanUser: "/api/admin/unban/:telegramId",
      makePremium: "/api/posts/:postId/make-premium",
      clearPending: "/api/posts/:postId/clear-pending",
      payments: "/api/payments",
      paymentsBalance: "/api/payments/balance",
      refreshBalance: "/api/payments/refresh-balance",
      r2Images: "/r2/{key}",
    },
  });
});

app.notFound((c) => {
  return c.json(
    {
      error: "Not Found",
      message: "The requested endpoint does not exist",
      timestamp: new Date().toISOString(),
    },
    404,
  );
});

app.onError((err, c) => {
  console.error("Error:", err);
  return c.json(
    {
      error: "INTERNAL_ERROR",
      message: "Something went wrong",
    },
    500,
  );
});

export default app;
