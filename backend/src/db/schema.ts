import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(), // UUID
    invoicePayload: text("invoice_payload").notNull().unique(),
    telegramPaymentChargeId: text("telegram_payment_charge_id").unique(), // Idempotency key
    providerPaymentChargeId: text("provider_payment_charge_id"),
    userId: integer("user_id").notNull(), // Telegram ID
    postId: integer("post_id"), // No foreign key yet, will be added after posts table is defined
    starAmount: integer("star_amount").notNull(),
    status: text("status").notNull(), // 'created' | 'pending' | 'succeeded' | 'failed' | 'refunded'
    rawUpdate: text("raw_update"), // JSON string of full webhook payload
    meta: text("meta"), // JSON string for additional data
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_payments_user_id").on(table.userId),
    postIdIdx: index("idx_payments_post_id").on(table.postId),
    statusIdx: index("idx_payments_status").on(table.status),
    createdAtIdx: index("idx_payments_created_at").on(table.createdAt),
  }),
);

export const posts = sqliteTable(
  "posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    content: text("content").notNull(),
    starCount: integer("star_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    paymentId: text("payment_id").references(() => payments.id),
    isPaymentPending: integer("is_payment_pending").default(0).notNull(), // 0 or 1
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    createdAtIdx: index("idx_posts_created_at").on(table.createdAt),
    userIdIdx: index("idx_posts_user_id").on(table.userId),
  }),
);

export const userProfiles = sqliteTable(
  "user_profiles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    telegramId: integer("telegram_id").notNull().unique(),
    username: text("username"),
    displayName: text("display_name"),
    bio: text("bio"),
    phoneNumber: text("phone_number"),
    contactLinks: text("contact_links"), // JSON string
    profileImageKey: text("profile_image_key"),
    isBanned: integer("is_banned").default(0).notNull(),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    telegramIdIdx: index("idx_user_profiles_telegram_id").on(table.telegramId),
    usernameIdx: index("idx_user_profiles_username").on(table.username),
    isBannedIdx: index("idx_user_profiles_is_banned").on(table.isBanned),
  }),
);

export const postImages = sqliteTable(
  "post_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    imageKey: text("image_key").notNull(),
    thumbnailKey: text("thumbnail_key").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    uploadOrder: integer("upload_order").notNull(),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    postIdIdx: index("idx_post_images_post_id").on(table.postId),
    uploadOrderIdx: index("idx_post_images_upload_order").on(
      table.postId,
      table.uploadOrder,
    ),
  }),
);

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull(), // Telegram ID
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    content: text("content").notNull(),
    isHidden: integer("is_hidden").default(0).notNull(), // 0 or 1
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    postIdIdx: index("idx_comments_post_id").on(table.postId),
    userIdIdx: index("idx_comments_user_id").on(table.userId),
    createdAtIdx: index("idx_comments_created_at").on(table.createdAt),
  }),
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostImage = typeof postImages.$inferSelect;
export type NewPostImage = typeof postImages.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
