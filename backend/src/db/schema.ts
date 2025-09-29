import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  username: text('username').notNull(),
  displayName: text('display_name').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  createdAtIdx: index('idx_posts_created_at').on(table.createdAt),
  userIdIdx: index('idx_posts_user_id').on(table.userId),
}));

export const postImages = sqliteTable('post_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  originalName: text('original_name').notNull(),
  imageKey: text('image_key').notNull(),
  thumbnailKey: text('thumbnail_key').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  uploadOrder: integer('upload_order').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  postIdIdx: index('idx_post_images_post_id').on(table.postId),
  uploadOrderIdx: index('idx_post_images_upload_order').on(table.postId, table.uploadOrder),
}));

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostImage = typeof postImages.$inferSelect;
export type NewPostImage = typeof postImages.$inferInsert;