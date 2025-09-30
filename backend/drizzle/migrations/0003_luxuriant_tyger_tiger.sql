ALTER TABLE `user_profiles` ADD `username` text;--> statement-breakpoint
CREATE INDEX `idx_user_profiles_username` ON `user_profiles` (`username`);