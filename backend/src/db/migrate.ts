import { migrate } from "drizzle-orm/d1/migrator";
import { createDatabase } from "./index";
import type { D1Database } from "@cloudflare/workers-types";

export async function runMigrations(d1: D1Database) {
  const db = createDatabase(d1);
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("Database migrations completed");
}
