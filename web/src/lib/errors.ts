// Typed application error carrying an HTTP status + stable code.
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  unauthorized: (m = "Unauthorized") => new AppError(m, 401, "UNAUTHORIZED"),
  forbidden: (m = "Forbidden") => new AppError(m, 403, "FORBIDDEN"),
  notFound: (m = "Not found") => new AppError(m, 404, "NOT_FOUND"),
  tooLarge: (m = "Payload too large") => new AppError(m, 413, "TOO_LARGE"),
  unsupported: (m = "Unsupported media type") => new AppError(m, 415, "UNSUPPORTED"),
  rateLimited: (m = "Too many requests") => new AppError(m, 429, "RATE_LIMITED"),
  badRequest: (m = "Bad request") => new AppError(m, 400, "BAD_REQUEST"),
};
