CREATE TABLE `day_targets` (
	`target_date` text PRIMARY KEY NOT NULL,
	`focus_label` text DEFAULT '' NOT NULL,
	`target_minutes` integer DEFAULT 480 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'task' NOT NULL,
	`task_date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`due_date` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`goal` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
