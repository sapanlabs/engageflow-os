export type Member = { id: string; name: string; color: string; role: string; kind: "USER" | "ASSISTANT" };

export type Reaction = { emoji: string; count: number; mine: boolean };

export type ChatMessage = {
  id: string;
  channelId: string;
  parentId: string | null;
  authorId: string | null;
  authorName: string;
  authorKind: "USER" | "ASSISTANT" | "SYSTEM";
  authorColor: string;
  body: string;
  mentions: string[];
  reactions: Reaction[];
  replyCount: number;
  createdAt: string;
  editedAt: string | null;
};

export type ChannelSummary = {
  id: string;
  kind: string;
  name: string;
  topic: string | null;
  isPrivate: boolean;
  clientId: string | null;
  projectId: string | null;
  memberCount: number;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unread: number;
};

export type ChannelDetail = {
  id: string;
  name: string;
  topic: string | null;
  kind: string;
  isPrivate: boolean;
  clientId: string | null;
  projectId: string | null;
  members: Member[];
  heisenbergEnabled: boolean;
};
