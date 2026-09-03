# FocusCal

FocusCal is a one-screen calendar and task-management tool for planning tasks, follow-ups, deadlines, daily targets, and protected time blocks.

## What it includes

- Monthly calendar with click-to-add scheduling
- Tasks and follow-ups with priority, deadline, target, and notes
- Daily focus target and available-hours capacity
- Time-block totals and completion tracking
- Persistent Cloudflare D1 storage
- Responsive desktop and mobile layouts

## Local setup

Requirements: Node.js 22.13 or newer and a Linux environment with `flock`, `curl`, and GNU `timeout`.

```bash
npm run install:ci
npm run db:generate
npm run build
```

The deployment uses the Sites configuration in `.openai/hosting.json`. Database schema changes belong in `db/schema.ts` and must be followed by a new generated Drizzle migration.
