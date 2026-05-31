PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bill_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bill_id` text NOT NULL,
	`due_date` text NOT NULL,
	`amount_actual` integer NOT NULL,
	`paid_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_bill_instances`("id", "user_id", "bill_id", "due_date", "amount_actual", "paid_at", "created_at", "updated_at") SELECT "id", "user_id", "bill_id", "due_date", "amount_actual", "paid_at", "created_at", "updated_at" FROM `bill_instances`;--> statement-breakpoint
DROP TABLE `bill_instances`;--> statement-breakpoint
ALTER TABLE `__new_bill_instances` RENAME TO `bill_instances`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `bill_instances_user_due_date_idx` ON `bill_instances` (`user_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `bill_instances_user_bill_due_date_idx` ON `bill_instances` (`user_id`,`bill_id`,`due_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `bill_instances_bill_id_due_date_unique` ON `bill_instances` (`bill_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `__new_bills` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`pay_schedule_id` text,
	`name` text NOT NULL,
	`amount_expected` integer NOT NULL,
	`due_day_of_month` integer NOT NULL,
	`payment_url` text,
	`is_auto_pay` integer DEFAULT false NOT NULL,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`pay_schedule_id`) REFERENCES `pay_schedules`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_bills`("id", "user_id", "pay_schedule_id", "name", "amount_expected", "due_day_of_month", "payment_url", "is_auto_pay", "notes", "is_active", "created_at", "updated_at") SELECT "id", "user_id", "pay_schedule_id", "name", "amount_expected", "due_day_of_month", "payment_url", "is_auto_pay", "notes", "is_active", "created_at", "updated_at" FROM `bills`;--> statement-breakpoint
DROP TABLE `bills`;--> statement-breakpoint
ALTER TABLE `__new_bills` RENAME TO `bills`;--> statement-breakpoint
CREATE INDEX `bills_user_id_idx` ON `bills` (`user_id`);--> statement-breakpoint
CREATE INDEX `bills_user_active_due_day_idx` ON `bills` (`user_id`,`is_active`,`due_day_of_month`);--> statement-breakpoint
CREATE INDEX `bills_pay_schedule_id_idx` ON `bills` (`pay_schedule_id`);--> statement-breakpoint
ALTER TABLE `pay_schedules` ADD `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `pay_schedules` ADD `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;