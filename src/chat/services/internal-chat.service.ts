import { v4 as uuid } from 'uuid';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, scan, shareReplay, switchMap } from 'rxjs/operators';
import { ChatRoom } from '../models/chat-room.model';
import { ChatMessage } from '../models/chat-message.model';
import { SocketService } from './socket.service';

export class InternalChatService {
  private readonly rooms$ = new BehaviorSubject<ChatRoom[]>([]);
  private readonly activeRoomId$ = new BehaviorSubject<string | null>(null);
  private readonly roomStreams = new Map<string, Observable<ChatMessage[]>>();

  readonly availableRooms$ = this.rooms$.asObservable();
  readonly activeRoom$ = this.activeRoomId$.pipe(
    switchMap((roomId) =>
      this.rooms$.pipe(map((rooms) => rooms.find((room) => room.id === roomId) ?? null)),
    ),
  );

  readonly messages$: Observable<ChatMessage[]> = this.activeRoomId$.pipe(
    switchMap((roomId) => {
      if (!roomId) return of([]);
      return this.getOrCreateRoomStream(roomId);
    }),
    shareReplay(1),
  );

  constructor(private readonly socketService: SocketService) {}

  registerRoom(room: ChatRoom) {
    const nextRooms = [...this.rooms$.value.filter((item) => item.id !== room.id), room];
    this.rooms$.next(nextRooms);
    if (!this.activeRoomId$.value) {
      this.activeRoomId$.next(room.id);
    }
    this.getOrCreateRoomStream(room.id);
  }

  setActiveRoom(roomId: string) {
    if (!this.rooms$.value.find((room) => room.id === roomId)) return;
    this.activeRoomId$.next(roomId);
  }

  sendMessage(message: string, roomId?: string, authorId?: string, authorName?: string) {
    const targetRoomId = roomId ?? this.activeRoomId$.value;
    if (!targetRoomId) return;

    const room = this.rooms$.value.find((item) => item.id === targetRoomId);
    if (!room) return;

    const channel = this.buildChannelName(room.workspaceId, targetRoomId);
    const payload: ChatMessage = {
      id: uuid(),
      text: message,
      roomId: targetRoomId,
      workspaceId: room.workspaceId,
      authorId,
      authorName,
      createdAt: new Date(),
      type: 'internal',
    };

    this.socketService.emit(channel, payload);
  }

  private getOrCreateRoomStream(roomId: string): Observable<ChatMessage[]> {
    const cached = this.roomStreams.get(roomId);
    if (cached) return cached;

    const room = this.rooms$.value.find((item) => item.id === roomId);
    const channel = this.buildChannelName(room?.workspaceId, roomId);

    const stream$ = this.socketService.on<ChatMessage>(channel).pipe(
      scan((history, message) => [...history, message], [] as ChatMessage[]),
      shareReplay(1),
    );

    this.roomStreams.set(roomId, stream$);
    return stream$;
  }

  private buildChannelName(workspaceId: string | undefined, roomId: string): string {
    const workspaceSegment = workspaceId ?? 'global';
    return `chat:internal:room:${workspaceSegment}:${roomId}`;
  }
}
