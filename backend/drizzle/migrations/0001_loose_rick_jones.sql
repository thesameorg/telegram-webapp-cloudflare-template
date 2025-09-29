CREATE TABLE `post_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`original_name` text NOT NULL,
	`image_key` text NOT NULL,
	`thumbnail_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`upload_order` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_post_images_post_id` ON `post_images` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_post_images_upload_order` ON `post_images` (`post_id`,`upload_order`);