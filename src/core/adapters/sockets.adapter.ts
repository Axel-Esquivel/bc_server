import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

export class SocketsAdapter extends IoAdapter {
  constructor(private readonly appContext: INestApplicationContext) {
    super(appContext);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const envOrigins =
      process.env.CORS_ORIGINS?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean) ?? [];
    const isDevelopment = process.env.NODE_ENV === 'development';
    const allowedOrigins = envOrigins.length > 0 ? envOrigins : isDevelopment ? ['http://localhost:4200'] : [];
    const { path, ...restOptions } = options ?? {};
    const mergedOptions: Partial<ServerOptions> = {
      cors: {
        origin: allowedOrigins.length > 0 ? allowedOrigins : false,
        credentials: true,
      },
      path: path ?? '/socket.io',
      ...restOptions,
    };

    return super.createIOServer(port, mergedOptions);
  }
}
