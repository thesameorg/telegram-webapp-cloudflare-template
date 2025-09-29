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

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;