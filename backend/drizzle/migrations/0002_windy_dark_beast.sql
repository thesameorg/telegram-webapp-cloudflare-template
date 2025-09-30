CREATE TABLE `user_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`telegram_id` integer NOT NULL,
	`display_name` text,
	`bio` text,
	`phone_number` text,
	`contact_links` text,
	`profile_image_key` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_telegram_id_unique` ON `user_profiles` (`telegram_id`);--> statement-breakpoint
CREATE INDEX `idx_user_profiles_telegram_id` ON `user_profiles` (`telegram_id`);