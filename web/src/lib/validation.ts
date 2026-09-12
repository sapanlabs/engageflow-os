import { z } from "zod";
import { PLATFORMS, STYLES, ACCOUNT_PLATFORMS } from "@/lib/constants";

// Central request schemas. Parsing throws ZodError -> mapped to 422 by the api wrapper.

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export const createClientSchema = z.object({
  name: z.string().min(1).max(120),
  industry: z.string().max(120).optional(),
  contactName: z.string().max(120).optional(),
  contactEmail: z.string().email().max(200).optional().or(z.literal("")),
});

export const createTaskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(300),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  assigneeId: z.string().nullable().optional(),
});

export const updateTaskSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  title: z.string().min(1).max(300).optional(),
  assigneeId: z.string().nullable().optional(),
});

export const commentSchema = z.object({
  versionId: z.string().optional(),
  authorName: z.string().max(120).optional(),
  body: z.string().min(1).max(4000),
  pinX: z.number().min(0).max(1).optional(),
  pinY: z.number().min(0).max(1).optional(),
});

export const requestChangesSchema = z.object({
  body: z.string().min(1).max(4000),
  byName: z.string().max(120).optional(),
  versionId: z.string().optional(),
  pinX: z.number().min(0).max(1).optional(),
  pinY: z.number().min(0).max(1).optional(),
});

export const memberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "CREATIVE_LEAD", "SOCIAL_MEDIA_MANAGER", "EDITOR", "CLIENT"]),
});

export const platformAccountSchema = z.object({
  platform: z.enum(ACCOUNT_PLATFORMS as unknown as [string, ...string[]]),
  label: z.string().max(120).optional().nullable(),
  handle: z.string().max(120).optional().nullable(),
  url: z.string().max(500).optional().nullable(),
  username: z.string().max(200).optional().nullable(),
  secret: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const contentSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(300),
  caption: z.string().max(4000).optional(),
  platform: z.enum(Object.values(PLATFORMS) as unknown as [string, ...string[]]),
  style: z.enum(STYLES as unknown as [string, ...string[]]),
  mediaUrl: z.string().optional(),
  authorId: z.string().min(1),
});

// Parse helper for JSON request bodies.
export async function parseJson<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const body = await req.json().catch(() => ({}));
  return schema.parse(body);
}
