import { Context } from "hono";

/**
 * Parse pagination parameters from request query
 */
export function parsePagination(c: Context) {
  const limitParam = c.req.query("limit") ?? "50";
  const offsetParam = c.req.query("offset") ?? "0";
  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(offsetParam, 10) || 0, 0);
  return { limit, offset };
}

/**
 * Parse post ID from request params
 */
export function parsePostId(c: Context) {
  const postId = parseInt(c.req.param("postId"), 10);
  if (isNaN(postId)) {
    return { error: { message: "Invalid post ID", status: 400 as const } };
  }
  return { postId };
}

/**
 * Create paginated response
 */
export function createPaginationResponse<T>(
  items: T[],
  limit: number,
  offset: number,
) {
  return {
    items,
    pagination: {
      limit,
      offset,
      total: items.length,
      hasMore: items.length === limit,
    },
  };
}
