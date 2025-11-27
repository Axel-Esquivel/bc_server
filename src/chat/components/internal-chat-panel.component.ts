import { BehaviorSubject } from 'rxjs';
import { ChatRoom } from '../models/chat-room.model';
import { InternalChatService } from '../services/internal-chat.service';

export class InternalChatPanelComponent {
  readonly rooms$ = this.internalChatService.availableRooms$;
  readonly activeRoom$ = this.internalChatService.activeRoom$;
  readonly messages$ = this.internalChatService.messages$;
  readonly draft$ = new BehaviorSubject<string>('');

  constructor(private readonly internalChatService: InternalChatService) {}

  selectRoom(room: ChatRoom) {
    this.internalChatService.setActiveRoom(room.id);
  }

  sendMessage() {
    const text = this.draft$.value.trim();
    if (!text) return;

    this.internalChatService.sendMessage(text);
    this.draft$.next('');
  }

  onMessageInput(value: string) {
    this.draft$.next(value);
  }
}
