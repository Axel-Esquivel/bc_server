export type ChatRoomType = 'support' | 'internal';

export interface ChatRoom {
  id: string;
  name: string;
  type: ChatRoomType;
  workspaceId?: string;
  description?: string;
  unreadCount?: number;
}
