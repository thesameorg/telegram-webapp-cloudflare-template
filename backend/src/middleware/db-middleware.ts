import type { Context } from "hono";
import { createDatabase, type Database } from "../db";
import type { Env } from "../types/env";

// Type extension for context with db
export type DBContext = {
  Bindings: Env;
  Variables: {
    db: Database;
  };
};

/**
 * Middleware that injects database instance into context
 */
export const dbMiddleware = async (
  c: Context<DBContext>,
  next: () => Promise<void>,
) => {
  const db = createDatabase(c.env.DB);
  c.set("db", db);
  await next();
};
