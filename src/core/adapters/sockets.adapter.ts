import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

export class SocketsAdapter extends IoAdapter {
  constructor(private readonly appContext: INestApplicationContext) {
    super(appContext);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()) ?? ['*'];
    const mergedOptions: ServerOptions = {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
      ...options,
    };

    return super.createIOServer(port, mergedOptions);
  }
}
