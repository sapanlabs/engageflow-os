// Single source of truth for enum-like values, human labels, and status colors.
// Kept in one place so DB, APIs, and UI never drift.

export const ROLES = {
  ADMIN: "ADMIN",
  CREATIVE_LEAD: "CREATIVE_LEAD",
  SOCIAL_MEDIA_MANAGER: "SOCIAL_MEDIA_MANAGER",
  EDITOR: "EDITOR",
  CLIENT: "CLIENT",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  CREATIVE_LEAD: "Creative Lead",
  SOCIAL_MEDIA_MANAGER: "Social Media Manager",
  EDITOR: "Editor",
  CLIENT: "Client",
};

// --- Content pipeline status ---
export const CONTENT_STATUS = {
  DRAFT: "DRAFT",
  IN_REVIEW: "IN_REVIEW",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  APPROVED: "APPROVED",
  SCHEDULED: "SCHEDULED",
  PUBLISHED: "PUBLISHED",
} as const;
export type ContentStatus = (typeof CONTENT_STATUS)[keyof typeof CONTENT_STATUS];

export const CONTENT_STATUS_ORDER: ContentStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
];

export const CONTENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In Review",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
};

// Functional status color ramp (traffic-light intuition):
// grey=inert, amber=attention, red=action-needed, green=resolved, blue=scheduled.
export const CONTENT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "#9AA0A6",
  IN_REVIEW: "#C9A227",
  CHANGES_REQUESTED: "#C0442E",
  APPROVED: "#2E7D4F",
  SCHEDULED: "#2F6FEB",
  PUBLISHED: "#6B6B6B",
};

// --- Project status ---
export const PROJECT_STATUS = {
  PLANNING: "PLANNING",
  IN_PROGRESS: "IN_PROGRESS",
  REVIEW: "REVIEW",
  APPROVED: "APPROVED",
  COMPLETED: "COMPLETED",
} as const;

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  APPROVED: "Approved",
  COMPLETED: "Completed",
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANNING: "#9AA0A6",
  IN_PROGRESS: "#2F6FEB",
  REVIEW: "#C9A227",
  APPROVED: "#2E7D4F",
  COMPLETED: "#6B6B6B",
};

// --- Platforms (each has a realistic preview chrome) ---
export const PLATFORMS = {
  INSTAGRAM_POST: "INSTAGRAM_POST",
  INSTAGRAM_REEL: "INSTAGRAM_REEL",
  INSTAGRAM_STORY: "INSTAGRAM_STORY",
  LINKEDIN: "LINKEDIN",
  FACEBOOK: "FACEBOOK",
  YOUTUBE: "YOUTUBE",
  YOUTUBE_SHORTS: "YOUTUBE_SHORTS",
  X: "X",
  WEBSITE: "WEBSITE",
} as const;
export type Platform = (typeof PLATFORMS)[keyof typeof PLATFORMS];

export const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM_POST: "Instagram Post",
  INSTAGRAM_REEL: "Instagram Reel",
  INSTAGRAM_STORY: "Instagram Story",
  LINKEDIN: "LinkedIn",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  YOUTUBE_SHORTS: "YouTube Shorts",
  X: "X",
  WEBSITE: "Website",
};

// Aspect ratio (width / height) used by preview frames.
export const PLATFORM_ASPECT: Record<string, number> = {
  INSTAGRAM_POST: 1,
  INSTAGRAM_REEL: 9 / 16,
  INSTAGRAM_STORY: 9 / 16,
  LINKEDIN: 1.2,
  FACEBOOK: 1.91,
  YOUTUBE: 16 / 9,
  YOUTUBE_SHORTS: 9 / 16,
  X: 1.6,
  WEBSITE: 16 / 9,
};

// --- Content styles ---
export const STYLES = [
  "STATIC_POST",
  "CAROUSEL",
  "REEL",
  "STORY",
  "ADVERTISEMENT",
  "ANNOUNCEMENT",
  "EDUCATIONAL",
  "PROMOTIONAL",
  "PRODUCT",
  "MEME",
  "QUOTE",
  "VIDEO",
] as const;

export const STYLE_LABELS: Record<string, string> = {
  STATIC_POST: "Static Post",
  CAROUSEL: "Carousel",
  REEL: "Reel",
  STORY: "Story",
  ADVERTISEMENT: "Advertisement",
  ANNOUNCEMENT: "Announcement",
  EDUCATIONAL: "Educational",
  PROMOTIONAL: "Promotional",
  PRODUCT: "Product",
  MEME: "Meme",
  QUOTE: "Quote",
  VIDEO: "Video",
};

export function labelFor(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

// --- Platform accounts (a client's social/web presences for the vault) ---
export const ACCOUNT_PLATFORMS = [
  "INSTAGRAM",
  "LINKEDIN",
  "FACEBOOK",
  "YOUTUBE",
  "X",
  "TIKTOK",
  "PINTEREST",
  "WEBSITE",
  "OTHER",
] as const;

export const ACCOUNT_PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  X: "X",
  TIKTOK: "TikTok",
  PINTEREST: "Pinterest",
  WEBSITE: "Website",
  OTHER: "Other",
};

// Roles allowed to view/manage stored client credentials.
// Editors and clients never see credentials.
export const CREDENTIAL_ROLES = ["ADMIN", "CREATIVE_LEAD", "SOCIAL_MEDIA_MANAGER"];
export function canManageCredentials(role: string): boolean {
  return CREDENTIAL_ROLES.includes(role);
}

// ============================================================================
// Chat + Meetings + Heisenberg (the AI teammate)
// ============================================================================

// The AI teammate's stable identity. Not a User row — represented on messages
// via authorKind = "ASSISTANT" and shown as a virtual member of every channel.
export const HEISENBERG = {
  id: "heisenberg",
  handle: "heisenberg",
  name: "Heisenberg",
  role: "AI Assistant",
  color: "#2E7D4F",
} as const;

export const MESSAGE_KIND = {
  USER: "USER",
  ASSISTANT: "ASSISTANT",
  SYSTEM: "SYSTEM",
} as const;

export const CHANNEL_KIND = {
  CHANNEL: "CHANNEL",
  DM: "DM",
} as const;

export const MEETING_STATUS = {
  SCHEDULED: "SCHEDULED",
  LIVE: "LIVE",
  ENDED: "ENDED",
} as const;

export const MEETING_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  LIVE: "Live",
  ENDED: "Ended",
};

export const MEETING_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "#9AA0A6",
  LIVE: "#C0442E",
  ENDED: "#6B6B6B",
};

// Quick-reaction palette for messages.
export const REACTION_EMOJI = ["👍", "🎉", "🔥", "👀", "✅", "❤️", "😄", "🙌"];

// Detect a Heisenberg mention in message text: @heisenberg (case-insensitive).
export function mentionsHeisenberg(text: string): boolean {
  return /(^|\s)@heisenberg\b/i.test(text);
}

// ============================================================================
// Calendar — event types across the platform (content, deadlines, tasks, calls)
// ============================================================================

export const CAL_EVENT_TYPES = {
  CONTENT: "CONTENT", // content publishing (colored by content status)
  DEADLINE: "DEADLINE", // project start/end dates
  TASK: "TASK", // task due dates
  MEETING: "MEETING", // scheduled/held calls
} as const;

export type CalEventType = (typeof CAL_EVENT_TYPES)[keyof typeof CAL_EVENT_TYPES];

export const CAL_EVENT_LABELS: Record<string, string> = {
  CONTENT: "Content",
  DEADLINE: "Deadlines",
  TASK: "Tasks",
  MEETING: "Meetings",
};

// Base colors per type. CONTENT events override this with their status color.
export const CAL_EVENT_COLORS: Record<string, string> = {
  CONTENT: "#2F6FEB",
  DEADLINE: "#C0442E",
  TASK: "#C9A227",
  MEETING: "#2E7D4F",
};
