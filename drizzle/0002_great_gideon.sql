ALTER TABLE `pay_schedules` RENAME COLUMN "anchor_day" TO "pay_date";--> statement-breakpoint
DROP INDEX `pay_schedules_user_active_anchor_idx`;--> statement-breakpoint
CREATE INDEX `pay_schedules_user_active_pay_date_idx` ON `pay_schedules` (`user_id`,`is_active`,`pay_date`);