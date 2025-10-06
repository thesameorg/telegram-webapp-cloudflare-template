CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`content` text NOT NULL,
	`is_hidden` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `comment_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_comments_post_id` ON `comments` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_user_id` ON `comments` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_created_at` ON `comments` (`created_at`);
