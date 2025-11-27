import { v4 as uuid } from 'uuid';
import { scan, shareReplay, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ChatMessage } from '../models/chat-message.model';
import { SocketService } from './socket.service';

export class SupportChatService {
  private readonly channelName = 'chat:support';
  private readonly channel = this.socketService.connect<ChatMessage>(this.channelName);

  readonly messages$: Observable<ChatMessage[]> = this.channel.messages$.pipe(
    startWith<ChatMessage | null>(null),
    scan((history, message) => (message ? [...history, message] : history), [] as ChatMessage[]),
    shareReplay(1),
  );

  constructor(private readonly socketService: SocketService) {}

  sendMessage(message: string, authorId?: string, authorName?: string) {
    const payload: ChatMessage = {
      id: uuid(),
      text: message,
      authorId,
      authorName,
      createdAt: new Date(),
      type: 'support',
    };
    this.channel.send('message', payload);
  }
}
