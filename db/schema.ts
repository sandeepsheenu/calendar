import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    kind: text("kind").notNull().default("task"),
    taskDate: text("task_date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    dueDate: text("due_date"),
    priority: text("priority").notNull().default("medium"),
    goal: text("goal").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("open"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_tasks_task_date_start_time").on(table.taskDate, table.startTime),
  ]
);

export const dayTargets = sqliteTable("day_targets", {
  targetDate: text("target_date").primaryKey(),
  focusLabel: text("focus_label").notNull().default(""),
  targetMinutes: integer("target_minutes").notNull().default(480),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
