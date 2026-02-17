import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RealtimeModule } from '../../realtime/realtime.module';
import { OutboxEvent, OutboxEventSchema } from './outbox-event.schema';
import { OutboxService } from './outbox.service';

@Module({
  imports: [
    RealtimeModule,
    MongooseModule.forFeature([{ name: OutboxEvent.name, schema: OutboxEventSchema }]),
  ],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
