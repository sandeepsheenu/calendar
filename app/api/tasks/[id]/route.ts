import { getD1 } from "@/db/d1";

type UpdateInput = {
  title?: string;
  kind?: "task" | "follow-up";
  taskDate?: string;
  startTime?: string;
  endTime?: string;
  dueDate?: string | null;
  priority?: "low" | "medium" | "high";
  goal?: string;
  notes?: string;
  status?: "open" | "done";
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const input = (await request.json()) as UpdateInput;

    if (input.status && Object.keys(input).length === 1) {
      const task = await getD1()
        .prepare(
          `UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?
           RETURNING id, title, kind, task_date AS taskDate,
                     start_time AS startTime, end_time AS endTime,
                     due_date AS dueDate, priority, goal, notes, status,
                     created_at AS createdAt, updated_at AS updatedAt`
        )
        .bind(input.status, id)
        .first();
      if (!task) return Response.json({ error: "Item not found." }, { status: 404 });
      return Response.json({ task });
    }

    const title = input.title?.trim() ?? "";
    if (
      !title ||
      !input.kind ||
      !input.taskDate ||
      !input.startTime ||
      !input.endTime ||
      !input.priority ||
      input.endTime <= input.startTime
    ) {
      return Response.json({ error: "Complete the required task details." }, { status: 400 });
    }

    const task = await getD1()
      .prepare(
        `UPDATE tasks SET
           title = ?, kind = ?, task_date = ?, start_time = ?, end_time = ?,
           due_date = ?, priority = ?, goal = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
         RETURNING id, title, kind, task_date AS taskDate,
                   start_time AS startTime, end_time AS endTime,
                   due_date AS dueDate, priority, goal, notes, status,
                   created_at AS createdAt, updated_at AS updatedAt`
      )
      .bind(
        title,
        input.kind,
        input.taskDate,
        input.startTime,
        input.endTime,
        input.dueDate || null,
        input.priority,
        input.goal?.trim() ?? "",
        input.notes?.trim() ?? "",
        id
      )
      .first();

    if (!task) return Response.json({ error: "Item not found." }, { status: 404 });
    return Response.json({ task });
  } catch (error) {
    console.error("Unable to update task", error);
    return Response.json({ error: "Could not update this item." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const result = await getD1().prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
    if (!result.meta.changes) {
      return Response.json({ error: "Item not found." }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unable to delete task", error);
    return Response.json({ error: "Could not delete this item." }, { status: 500 });
  }
}
