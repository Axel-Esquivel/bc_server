import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { RealtimeContext, RealtimeService } from '../realtime/realtime.service';

export interface ChatMessage {
  id: string;
  workspaceId: string;
  channelId?: string;
  toUserId?: string;
  fromUserId?: string;
  content: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class ChatService {
  private readonly messages: ChatMessage[] = [];

  constructor(private readonly realtimeService: RealtimeService) {}

  buildMessage(context: RealtimeContext, payload: { workspaceId: string; channelId?: string; toUserId?: string; content: string }): ChatMessage {
    if (!context.userId) {
      throw new BadRequestException('User is not authenticated');
    }

    if (context.workspaceId !== payload.workspaceId) {
      throw new BadRequestException('Workspace mismatch for chat message');
    }

    return {
      id: uuid(),
      workspaceId: payload.workspaceId,
      channelId: payload.channelId,
      toUserId: payload.toUserId,
      fromUserId: context.userId,
      content: payload.content,
      createdAt: new Date(),
    };
  }

  async persistMessage(message: ChatMessage) {
    // Placeholder for MongoDB persistence layer
    this.messages.push(message);
  }

  getHistory(workspaceId: string, channelId?: string): ChatMessage[] {
    return this.messages.filter((item) => {
      if (item.workspaceId !== workspaceId) return false;
      if (channelId && item.channelId !== channelId) return false;
      return true;
    });
  }

  emitTyping(context: RealtimeContext, payload: { workspaceId: string; channelId?: string }) {
    const rooms = this.getRoomsForMessage(context, payload.channelId, undefined);
    this.realtimeService.emitEvent('chat:user:typing', { userId: context.userId, channelId: payload.channelId }, rooms, 'chat');
  }

  emitMessage(message: ChatMessage) {
    const rooms = this.getRoomsForMessage(message, message.channelId, message.toUserId);
    this.realtimeService.emitEvent('chat:message:received', message, rooms, 'chat');
    this.realtimeService.logSecurityEvent(
      { userId: message.fromUserId, workspaceId: message.workspaceId },
      'chat:message:sent',
      'delivered',
      { channelId: message.channelId },
    );
  }

  private getRoomsForMessage(
    context: { workspaceId?: string; fromUserId?: string; toUserId?: string },
    channelId?: string,
    toUserId?: string,
  ): string[] {
    const rooms: string[] = [];
    const workspaceId = context.workspaceId;
    if (workspaceId) {
      rooms.push(`workspace:${workspaceId}`);
    }
    if (channelId && workspaceId) {
      rooms.push(`workspace:${workspaceId}:channel:${channelId}`);
    }
    if (toUserId) {
      rooms.push(`user:${toUserId}`);
    }
    const sender = context.fromUserId ?? (context as any).userId;
    if (sender) {
      rooms.push(`user:${sender}`);
    }
    return rooms;
  }
}
