CREATE TABLE `bill_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bill_id` text NOT NULL,
	`due_date` text NOT NULL,
	`amount_actual` integer NOT NULL,
	`paid_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bill_instances_user_due_date_idx` ON `bill_instances` (`user_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `bill_instances_user_bill_due_date_idx` ON `bill_instances` (`user_id`,`bill_id`,`due_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `bill_instances_bill_id_due_date_unique` ON `bill_instances` (`bill_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `bills` (
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
	FOREIGN KEY (`pay_schedule_id`) REFERENCES `pay_schedules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bills_user_id_idx` ON `bills` (`user_id`);--> statement-breakpoint
CREATE INDEX `bills_user_active_due_day_idx` ON `bills` (`user_id`,`is_active`,`due_day_of_month`);--> statement-breakpoint
CREATE INDEX `bills_pay_schedule_id_idx` ON `bills` (`pay_schedule_id`);--> statement-breakpoint
CREATE TABLE `pay_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`anchor_day` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pay_schedules_user_id_idx` ON `pay_schedules` (`user_id`);--> statement-breakpoint
CREATE INDEX `pay_schedules_user_active_anchor_idx` ON `pay_schedules` (`user_id`,`is_active`,`anchor_day`);