import type { Context } from "hono";
import type { z } from "zod";

/**
 * Validates request body against a Zod schema and returns parsed data or error response
 */
export const validateBody = async <T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
): Promise<{ data: z.infer<T> } | { error: Response }> => {
  const body = await c.req.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      error: c.json(
        { error: "Invalid request data", details: result.error.issues },
        400,
      ),
    };
  }

  return { data: result.data };
};
