import type { Context } from "hono";
import type { Env } from "../types/env";

/**
 * Async handler wrapper that automatically catches errors and returns appropriate responses
 */
export const asyncHandler = <T extends { Bindings: Env }>(
  fn: (c: Context<T>) => Promise<Response>,
) => {
  return async (c: Context<T>) => {
    try {
      return await fn(c);
    } catch (error) {
      console.error(`Error in ${c.req.method} ${c.req.path}:`, error);
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 500);
    }
  };
};
