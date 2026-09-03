import { env } from "cloudflare:workers";

export function getD1() {
  if (!env.DB) {
    throw new Error("The planner database is unavailable.");
  }

  return env.DB;
}
