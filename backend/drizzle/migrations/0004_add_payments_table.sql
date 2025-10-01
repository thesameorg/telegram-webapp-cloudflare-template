CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_payload` text NOT NULL,
	`telegram_payment_charge_id` text,
	`provider_payment_charge_id` text,
	`user_id` integer NOT NULL,
	`post_id` integer,
	`star_amount` integer NOT NULL,
	`status` text NOT NULL,
	`raw_update` text,
	`meta` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `star_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `payment_id` text REFERENCES payments(id);--> statement-breakpoint
ALTER TABLE `posts` ADD `is_payment_pending` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `payments_invoice_payload_unique` ON `payments` (`invoice_payload`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_telegram_payment_charge_id_unique` ON `payments` (`telegram_payment_charge_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_user_id` ON `payments` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_post_id` ON `payments` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_status` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_payments_created_at` ON `payments` (`created_at`);--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/