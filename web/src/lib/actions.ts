"use server";

import { revalidatePath } from "next/cache";
import * as svc from "@/lib/services";

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createClientAction(formData: FormData): Promise<ActionResult> {
  try {
    const client = await svc.createClient({
      name: String(formData.get("name") ?? "").trim(),
      industry: str(formData.get("industry")),
      contactName: str(formData.get("contactName")),
      contactEmail: str(formData.get("contactEmail")),
    });
    revalidatePath("/clients");
    return { ok: true, id: client.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function createProjectAction(formData: FormData): Promise<ActionResult> {
  try {
    const project = await svc.createProject({
      clientId: String(formData.get("clientId")),
      name: String(formData.get("name") ?? "").trim(),
      description: str(formData.get("description")),
    });
    revalidatePath(`/clients/${project.clientId}`);
    return { ok: true, id: project.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function createContentAction(formData: FormData) {
  const content = await svc.createContent({
    projectId: String(formData.get("projectId")),
    title: String(formData.get("title") ?? "").trim(),
    caption: str(formData.get("caption")),
    platform: String(formData.get("platform")),
    style: String(formData.get("style")),
    mediaUrl: String(formData.get("mediaUrl") || `https://picsum.photos/seed/${Date.now()}/1200/1200`),
    authorId: String(formData.get("authorId")),
  });
  revalidatePath(`/projects/${content.projectId}`);
  return content.id;
}

export async function addVersionAction(formData: FormData) {
  const contentId = String(formData.get("contentId"));
  await svc.addVersion({
    contentId,
    mediaUrl: String(formData.get("mediaUrl") || `https://picsum.photos/seed/v${Date.now()}/1200/1200`),
    notes: str(formData.get("notes")),
    authorId: String(formData.get("authorId")),
  });
  revalidatePath(`/content/${contentId}`);
}

export async function addCommentAction(formData: FormData) {
  const contentId = String(formData.get("contentId"));
  await svc.addComment({
    contentId,
    versionId: str(formData.get("versionId")),
    authorName: String(formData.get("authorName") || "Team"),
    body: String(formData.get("body") ?? "").trim(),
    pinX: num(formData.get("pinX")),
    pinY: num(formData.get("pinY")),
  });
  revalidatePath(`/content/${contentId}`);
}

export async function setStatusAction(contentId: string, status: string) {
  await svc.setStatus(contentId, status);
  revalidatePath(`/content/${contentId}`);
}

export async function approveAction(contentId: string, byName?: string) {
  await svc.approveContent(contentId, byName);
  revalidatePath(`/content/${contentId}`);
}

export async function requestChangesAction(input: {
  contentId: string;
  body: string;
  byName?: string;
  versionId?: string;
  pinX?: number;
  pinY?: number;
}) {
  await svc.requestChanges(input);
  revalidatePath(`/content/${input.contentId}`);
}

export async function resolveCommentAction(id: string, contentId: string, resolved: boolean) {
  await svc.resolveComment(id, resolved);
  revalidatePath(`/content/${contentId}`);
}

function str(v: FormDataEntryValue | null): string | undefined {
  const s = v ? String(v).trim() : "";
  return s.length ? s : undefined;
}
function num(v: FormDataEntryValue | null): number | undefined {
  if (v == null || String(v) === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
