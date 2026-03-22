export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  user?: User;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  topic: string | null;
  position: number;
  createdAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  isPertinent: boolean;
  parentId: string | null;
  createdAt: string;
  author?: User;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export type WsClientMessage =
  | { type: 'send_message'; channelId: string; content: string }
  | { type: 'typing_start'; channelId: string }
  | { type: 'typing_stop'; channelId: string };

export type WsServerMessage =
  | { type: 'message'; message: Message }
  | { type: 'message_edit'; messageId: string; content: string }
  | { type: 'message_delete'; messageId: string }
  | { type: 'user_typing'; channelId: string; userId: string; displayName: string };
