import type { VersionDTO, CommentDTO } from "@/components/review-workspace";

type VersionRow = {
  id: string;
  number: number;
  mediaUrl: string;
  mediaType: string;
  notes: string | null;
  approved: boolean;
  createdAt: Date;
  author: { name: string };
};

type CommentRow = {
  id: string;
  versionId: string | null;
  authorName: string;
  body: string;
  pinX: number | null;
  pinY: number | null;
  resolved: boolean;
  createdAt: Date;
};

export function toVersionDTO(v: VersionRow): VersionDTO {
  return {
    id: v.id,
    number: v.number,
    mediaUrl: v.mediaUrl,
    mediaType: v.mediaType,
    notes: v.notes,
    approved: v.approved,
    authorName: v.author.name,
    createdAt: v.createdAt.toISOString(),
  };
}

export function toCommentDTO(c: CommentRow): CommentDTO {
  return {
    id: c.id,
    versionId: c.versionId,
    authorName: c.authorName,
    body: c.body,
    pinX: c.pinX,
    pinY: c.pinY,
    resolved: c.resolved,
    createdAt: c.createdAt.toISOString(),
  };
}
