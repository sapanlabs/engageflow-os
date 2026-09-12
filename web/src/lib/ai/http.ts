import { toResponse } from "@/lib/api";

// AI routes historically used this helper; delegate to the central mapper so
// AppError (rate limits), AiError, Zod, and unknowns are all handled consistently.
export function aiErrorResponse(e: unknown) {
  return toResponse(e);
}
