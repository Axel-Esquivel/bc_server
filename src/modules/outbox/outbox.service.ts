import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import type { JsonObject } from '../../core/events/business-event';
import { RealtimeService } from '../../realtime/realtime.service';
import { OutboxEvent, OutboxEventDocument } from './outbox-event.schema';

export interface OutboxEventInput {
  organizationId: string;
  enterpriseId: string;
  moduleKey: string;
  eventType: string;
  payload: JsonObject;
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly outboxModel: Model<OutboxEventDocument>,
    private readonly realtimeService: RealtimeService,
  ) {}

  async add(event: OutboxEventInput): Promise<OutboxEvent> {
    const created = await this.outboxModel.create({
      id: uuid(),
      organizationId: event.organizationId,
      enterpriseId: event.enterpriseId,
      moduleKey: event.moduleKey,
      eventType: event.eventType,
      payload: event.payload,
      status: 'pending',
    });

    this.realtimeService.emitToEnterprise(
      event.organizationId,
      event.enterpriseId,
      event.eventType,
      event.payload,
    );

    return created.toObject();
  }

  async markProcessed(id: string): Promise<void> {
    await this.outboxModel.updateOne(
      { id },
      { $set: { status: 'processed', processedAt: new Date() } },
    ).exec();
  }

  async markFailed(id: string): Promise<void> {
    await this.outboxModel.updateOne(
      { id },
      { $set: { status: 'failed', processedAt: new Date() } },
    ).exec();
  }
}
