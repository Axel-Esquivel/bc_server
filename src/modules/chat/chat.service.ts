import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { RealtimeContext, RealtimeService } from '../../realtime/realtime.service';
import { ModuleStateService } from '../../core/database/module-state.service';

export interface ChatMessage {
  id: string;
  OrganizationId: string;
  channelId?: string;
  toUserId?: string;
  fromUserId?: string;
  content: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

interface ChatState {
  messages: ChatMessage[];
}

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);
  private readonly stateKey = 'module:chat:messages';
  private messages: ChatMessage[] = [];

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly moduleState: ModuleStateService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<ChatState>(this.stateKey, { messages: [] });
    this.messages = state.messages ?? [];
  }

  buildMessage(context: RealtimeContext, payload: { OrganizationId: string; channelId?: string; toUserId?: string; content: string }): ChatMessage {
    if (!context.userId) {
      throw new BadRequestException('User is not authenticated');
    }

    if (context.OrganizationId !== payload.OrganizationId) {
      throw new BadRequestException('Organization mismatch for chat message');
    }

    return {
      id: uuid(),
      OrganizationId: payload.OrganizationId,
      channelId: payload.channelId,
      toUserId: payload.toUserId,
      fromUserId: context.userId,
      content: payload.content,
      createdAt: new Date(),
    };
  }

  async persistMessage(message: ChatMessage) {
    this.messages.push(message);
    try {
      await this.moduleState.saveState<ChatState>(this.stateKey, { messages: this.messages });
    } catch (error) {
      const messageText = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error(`Failed to persist chat message: ${messageText}`);
      throw error;
    }
  }

  getHistory(OrganizationId: string, channelId?: string): ChatMessage[] {
    return this.messages.filter((item) => {
      if (item.OrganizationId !== OrganizationId) return false;
      if (channelId && item.channelId !== channelId) return false;
      return true;
    });
  }

  emitTyping(context: RealtimeContext, payload: { OrganizationId: string; channelId?: string }) {
    const rooms = this.getRoomsForMessage(context, payload.channelId, undefined);
    this.realtimeService.emitEvent('chat:user:typing', { userId: context.userId, channelId: payload.channelId }, rooms, 'chat');
  }

  emitMessage(message: ChatMessage) {
    const rooms = this.getRoomsForMessage(message, message.channelId, message.toUserId);
    this.realtimeService.emitEvent('chat:message:received', message, rooms, 'chat');
    this.realtimeService.logSecurityEvent(
      { userId: message.fromUserId, OrganizationId: message.OrganizationId },
      'chat:message:sent',
      'delivered',
      { channelId: message.channelId },
    );
  }

  private getRoomsForMessage(
    context: { OrganizationId?: string; fromUserId?: string; toUserId?: string },
    channelId?: string,
    toUserId?: string,
  ): string[] {
    const rooms: string[] = [];
    const OrganizationId = context.OrganizationId;
    if (OrganizationId) {
      rooms.push(`Organization:${OrganizationId}`);
    }
    if (channelId && OrganizationId) {
      rooms.push(`Organization:${OrganizationId}:channel:${channelId}`);
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
