import { getD1 } from "@/db/d1";

type TaskInput = {
  id?: string;
  title?: string;
  kind?: string;
  taskDate?: string;
  startTime?: string;
  endTime?: string;
  dueDate?: string | null;
  priority?: string;
  goal?: string;
  notes?: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const KINDS = new Set(["task", "follow-up"]);
const PRIORITIES = new Set(["low", "medium", "high"]);

function validate(input: TaskInput) {
  const title = input.title?.trim() ?? "";
  const kind = input.kind ?? "task";
  const taskDate = input.taskDate ?? "";
  const startTime = input.startTime ?? "";
  const endTime = input.endTime ?? "";
  const priority = input.priority ?? "medium";

  if (!title) return "Give this item a title.";
  if (title.length > 160) return "Keep the title under 160 characters.";
  if (!KINDS.has(kind)) return "Choose task or follow-up.";
  if (!DATE_PATTERN.test(taskDate)) return "Choose a valid date.";
  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
    return "Choose valid start and end times.";
  }
  if (endTime <= startTime) return "End time must be after start time.";
  if (input.dueDate && !DATE_PATTERN.test(input.dueDate)) {
    return "Choose a valid deadline.";
  }
  if (!PRIORITIES.has(priority)) return "Choose a valid priority.";
  return null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const start = url.searchParams.get("start") ?? "";
    const end = url.searchParams.get("end") ?? "";
    if (!DATE_PATTERN.test(start) || !DATE_PATTERN.test(end) || start > end) {
      return Response.json({ error: "A valid month range is required." }, { status: 400 });
    }

    const result = await getD1()
      .prepare(
        `SELECT id, title, kind, task_date AS taskDate,
                start_time AS startTime, end_time AS endTime,
                due_date AS dueDate, priority, goal, notes, status,
                created_at AS createdAt, updated_at AS updatedAt
         FROM tasks
         WHERE task_date BETWEEN ? AND ?
         ORDER BY task_date ASC, start_time ASC, created_at ASC`
      )
      .bind(start, end)
      .all();

    return Response.json({ tasks: result.results });
  } catch (error) {
    console.error("Unable to load tasks", error);
    return Response.json({ error: "Could not load your calendar." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as TaskInput;
    const error = validate(input);
    if (error) return Response.json({ error }, { status: 400 });

    const id = input.id ?? crypto.randomUUID();
    const row = await getD1()
      .prepare(
        `INSERT INTO tasks
           (id, title, kind, task_date, start_time, end_time, due_date,
            priority, goal, notes, status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP)
         RETURNING id, title, kind, task_date AS taskDate,
                   start_time AS startTime, end_time AS endTime,
                   due_date AS dueDate, priority, goal, notes, status,
                   created_at AS createdAt, updated_at AS updatedAt`
      )
      .bind(
        id,
        input.title!.trim(),
        input.kind ?? "task",
        input.taskDate,
        input.startTime,
        input.endTime,
        input.dueDate || null,
        input.priority ?? "medium",
        input.goal?.trim() ?? "",
        input.notes?.trim() ?? ""
      )
      .first();

    return Response.json({ task: row }, { status: 201 });
  } catch (error) {
    console.error("Unable to create task", error);
    return Response.json({ error: "Could not save this item." }, { status: 500 });
  }
}
