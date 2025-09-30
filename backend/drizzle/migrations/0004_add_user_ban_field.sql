ALTER TABLE `user_profiles` ADD `is_banned` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_user_profiles_is_banned` ON `user_profiles` (`is_banned`);
