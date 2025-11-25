import { Module } from '@nestjs/common';
import { AuthModule } from '../modules/auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [RealtimeModule, AuthModule],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
