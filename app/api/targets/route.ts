import { getD1 } from "@/db/d1";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
        `SELECT target_date AS targetDate, focus_label AS focusLabel,
                target_minutes AS targetMinutes,
                created_at AS createdAt, updated_at AS updatedAt
         FROM day_targets
         WHERE target_date BETWEEN ? AND ?
         ORDER BY target_date ASC`
      )
      .bind(start, end)
      .all();
    return Response.json({ targets: result.results });
  } catch (error) {
    console.error("Unable to load targets", error);
    return Response.json({ error: "Could not load daily targets." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const input = (await request.json()) as {
      targetDate?: string;
      focusLabel?: string;
      targetMinutes?: number;
    };
    const targetDate = input.targetDate ?? "";
    const focusLabel = input.focusLabel?.trim() ?? "";
    const targetMinutes = Number(input.targetMinutes);

    if (!DATE_PATTERN.test(targetDate)) {
      return Response.json({ error: "Choose a valid target date." }, { status: 400 });
    }
    if (!Number.isInteger(targetMinutes) || targetMinutes < 60 || targetMinutes > 960) {
      return Response.json({ error: "Daily capacity must be between 1 and 16 hours." }, { status: 400 });
    }

    const target = await getD1()
      .prepare(
        `INSERT INTO day_targets
           (target_date, focus_label, target_minutes, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(target_date) DO UPDATE SET
           focus_label = excluded.focus_label,
           target_minutes = excluded.target_minutes,
           updated_at = CURRENT_TIMESTAMP
         RETURNING target_date AS targetDate, focus_label AS focusLabel,
                   target_minutes AS targetMinutes,
                   created_at AS createdAt, updated_at AS updatedAt`
      )
      .bind(targetDate, focusLabel, targetMinutes)
      .first();

    return Response.json({ target });
  } catch (error) {
    console.error("Unable to save target", error);
    return Response.json({ error: "Could not save the daily target." }, { status: 500 });
  }
}
