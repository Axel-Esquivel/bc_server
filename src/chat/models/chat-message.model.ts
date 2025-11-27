export type ChatMessageType = 'support' | 'internal' | 'system';

export interface ChatMessage {
  id: string;
  roomId?: string;
  workspaceId?: string;
  authorId?: string;
  authorName?: string;
  role?: 'user' | 'support' | 'staff';
  text: string;
  createdAt: Date;
  type: ChatMessageType;
  metadata?: Record<string, any>;
}
