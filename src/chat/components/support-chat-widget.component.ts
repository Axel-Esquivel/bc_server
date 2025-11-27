import { BehaviorSubject } from 'rxjs';
import { SupportChatService } from '../services/support-chat.service';

export class SupportChatWidgetComponent {
  readonly draft$ = new BehaviorSubject<string>('');
  readonly messages$ = this.supportChatService.messages$;

  constructor(private readonly supportChatService: SupportChatService) {}

  send() {
    const text = this.draft$.value.trim();
    if (!text) return;

    this.supportChatService.sendMessage(text);
    this.draft$.next('');
  }

  onMessageInput(value: string) {
    this.draft$.next(value);
  }
}
