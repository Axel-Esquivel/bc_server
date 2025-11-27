import { Observable, Subject } from 'rxjs';
import { filter, map, share } from 'rxjs/operators';

export interface SocketEnvelope<T> {
  channel: string;
  payload: T;
}

export interface SocketChannel<T> {
  channel: string;
  messages$: Observable<T>;
  send(event: string, payload: T): void;
}

/**
 * Ligero wrapper de socket para el frontend. En un entorno real se implementaría
 * sobre socket.io-client o WebSocket nativo; aquí se mantiene simple para poder
 * probar la integración de servicios y componentes sin dependencias externas.
 */
export class SocketService {
  private readonly bus$ = new Subject<SocketEnvelope<any>>();

  connect<T>(channel: string): SocketChannel<T> {
    const messages$ = this.bus$.pipe(
      filter((message) => message.channel === channel),
      map((message) => message.payload as T),
      share(),
    );

    return {
      channel,
      messages$,
      send: (_event: string, payload: T) => this.emit(channel, payload),
    };
  }

  emit<T>(channel: string, payload: T) {
    this.bus$.next({ channel, payload });
  }

  on<T>(channel: string): Observable<T> {
    return this.connect<T>(channel).messages$;
  }
}
