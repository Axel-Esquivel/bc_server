import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { RealtimeService } from '../../realtime/realtime.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') ?? true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly chatService: ChatService, private readonly realtimeService: RealtimeService) {}

  afterInit(server: Server) {
    this.logger.log('Chat gateway initialized');
    this.realtimeService.setServer(server, 'chat');
  }

  async handleConnection(client: Socket) {
    try {
      const context = await this.realtimeService.authenticateClient(client);
      this.realtimeService.registerDefaultRooms(client, context);
      this.realtimeService.logConnection(context, 'connected', client);
    } catch (error) {
      this.logger.warn(`Chat socket rejected: ${error.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const context = this.realtimeService.resolveContext(client);
    this.realtimeService.logConnection(context, 'disconnected', client);
  }

  @SubscribeMessage('chat:message:sent')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { OrganizationId: string; channelId?: string; toUserId?: string; content: string },
  ) {
    this.realtimeService.enforceRateLimit(client, 'chat:message:sent', 30, 10_000);
    const context = this.realtimeService.resolveContext(client);
    const message = this.chatService.buildMessage(context, payload);
    await this.chatService.persistMessage(message);
    this.chatService.emitMessage(message);
    return { delivered: true, id: message.id };
  }

  @SubscribeMessage('chat:user:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { OrganizationId: string; channelId?: string },
  ) {
    this.realtimeService.enforceRateLimit(client, 'chat:user:typing', 60, 15_000);
    const context = this.realtimeService.resolveContext(client);
    if (context.OrganizationId !== payload.OrganizationId) {
      return { error: 'Organization mismatch' };
    }
    this.chatService.emitTyping(context, payload);
    return { typing: true };
  }
}
