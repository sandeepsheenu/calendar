CREATE INDEX `idx_tasks_task_date_start_time` ON `tasks` (`task_date`,`start_time`);
--> statement-breakpoint
PRAGMA optimize;
