import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

export class SocketsAdapter extends IoAdapter {
  constructor(private readonly appContext: INestApplicationContext) {
    super(appContext);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()) ?? ['*'];
    const { path, ...restOptions } = options ?? {};
    const mergedOptions: Partial<ServerOptions> = {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
      ...(path ? { path } : {}),
      ...restOptions,
    };

    return super.createIOServer(port, mergedOptions);
  }
}
