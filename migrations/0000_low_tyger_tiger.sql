CREATE TABLE `bill_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bill_id` text NOT NULL,
	`due_date` text NOT NULL,
	`amount_actual` integer NOT NULL,
	`status` text DEFAULT 'PAID' NOT NULL,
	`paid_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_bill_per_cycle` ON `bill_instances` (`bill_id`,`due_date`);--> statement-breakpoint
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
CREATE TABLE `pay_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`anchor_day` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
