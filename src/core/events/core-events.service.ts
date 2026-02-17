import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountingOutbox, AccountingOutboxDocument } from './accounting-outbox.schema';
import { BusinessEvent, JsonObject } from './business-event';

@Injectable()
export class CoreEventsService {
  private readonly logger = new Logger(CoreEventsService.name);

  constructor(
    @InjectModel(AccountingOutbox.name)
    private readonly outboxModel: Model<AccountingOutboxDocument>,
  ) {}

  async enqueue<TPayload extends JsonObject>(event: BusinessEvent<TPayload>): Promise<void> {
    try {
      await this.outboxModel.create({
        organizationId: event.organizationId,
        eventId: event.id,
        eventType: event.type,
        occurredAt: event.occurredAt,
        context: event.context,
        ref: event.ref,
        payload: event.payload,
        status: 'pending',
        retries: 0,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('duplicate key') || message.includes('E11000')) {
        return;
      }
      this.logger.error(`Failed to enqueue business event ${event.type}: ${message}`);
      throw error;
    }
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.outboxModel.updateOne(
      { eventId },
      { $set: { status: 'processed' }, $unset: { lastError: 1 } },
    ).exec();
  }

  async markFailed(eventId: string, error: Error | string): Promise<void> {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    await this.outboxModel.updateOne(
      { eventId },
      { $set: { status: 'failed', lastError: message }, $inc: { retries: 1 } },
    ).exec();
  }

  async markIgnored(eventId: string, reason?: string): Promise<void> {
    await this.outboxModel.updateOne(
      { eventId },
      { $set: { status: 'ignored', lastError: reason } },
    ).exec();
  }

  async fetchPending(limit = 50): Promise<AccountingOutbox[]> {
    return this.outboxModel
      .find({ status: 'pending' })
      .sort({ occurredAt: 1 })
      .limit(limit)
      .lean()
      .exec();
  }
}
