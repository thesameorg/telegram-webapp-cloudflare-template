/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string;      // Error type identifier
  message: string;    // Human-readable error description
  details?: Record<string, unknown>;      // Additional error context (optional)
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(
  error: string,
  message: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    error,
    message,
    details,
  };
}

/**
 * Authentication-specific error responses
 */
export const AuthErrors = {
  missingInitData: () => createErrorResponse(
    'MISSING_INIT_DATA',
    'initData is required for authentication'
  ),

  invalidInitData: (reason?: string) => createErrorResponse(
    'INVALID_INIT_DATA',
    'Invalid or malformed initData',
    reason ? { reason } : undefined
  ),

  expiredInitData: () => createErrorResponse(
    'EXPIRED_INIT_DATA',
    'initData has expired (older than 1 hour)'
  ),
};