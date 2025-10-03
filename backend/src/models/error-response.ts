export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export const AuthErrors = {
  missingInitData: (): ErrorResponse => ({
    error: "MISSING_INIT_DATA",
    message: "initData is required for authentication",
  }),

  invalidInitData: (reason?: string): ErrorResponse => ({
    error: "INVALID_INIT_DATA",
    message: "Invalid or malformed initData",
    ...(reason && { details: { reason } }),
  }),

  expiredInitData: (): ErrorResponse => ({
    error: "EXPIRED_INIT_DATA",
    message: "initData has expired (older than 1 hour)",
  }),
};
