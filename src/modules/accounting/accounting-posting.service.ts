import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CoreEventsService } from '../../core/events/core-events.service';
import { BusinessEvent } from '../../core/events/business-event';
import { AccountingOutbox } from '../../core/events/accounting-outbox.schema';
import { AccountingPosSaleMapper } from './mappers/accounting-pos-sale.mapper';
import { JournalEntry, JournalEntryDocument } from './schemas/journal-entry.schema';
import { JournalEntryLine, JournalEntryLineDocument } from './schemas/journal-entry-line.schema';
import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';

@Injectable()
export class AccountingPostingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountingPostingService.name);
  private timer?: NodeJS.Timeout;
  private readonly intervalMs = 15000;

  constructor(
    private readonly coreEventsService: CoreEventsService,
    private readonly posSaleMapper: AccountingPosSaleMapper,
    @InjectModel(JournalEntry.name)
    private readonly journalEntryModel: Model<JournalEntryDocument>,
    @InjectModel(JournalEntryLine.name)
    private readonly journalEntryLineModel: Model<JournalEntryLineDocument>,
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<OrganizationDocument>,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.processPendingOutbox().catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Outbox processing failed: ${message}`);
      });
    }, this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async processPendingOutbox(limit = 50): Promise<void> {
    const pending = await this.coreEventsService.fetchPending(limit);
    for (const item of pending) {
      if (!(await this.isAccountingInstalled(item.organizationId))) {
        continue;
      }
      try {
        const processed = await this.processEvent(item);
        if (processed) {
          await this.coreEventsService.markProcessed(item.eventId);
        }
      } catch (error) {
        await this.coreEventsService.markFailed(item.eventId, error);
      }
    }
  }

  async processEvent(outbox: AccountingOutbox): Promise<boolean> {
    const event = this.toBusinessEvent(outbox);
    switch (event.type) {
      case 'pos.sale.completed':
        await this.handlePosSaleCompleted(event);
        return true;
      default:
        await this.coreEventsService.markIgnored(event.id, `Unhandled event type: ${event.type}`);
        return false;
    }
  }

  private async handlePosSaleCompleted(event: BusinessEvent<any>): Promise<void> {
    const existing = await this.journalEntryModel
      .findOne({
        organizationId: event.organizationId,
        'source.eventId': event.id,
      })
      .lean()
      .exec();
    if (existing) {
      return;
    }

    const mapped = await this.posSaleMapper.map(event);
    this.ensureBalanced(mapped.lines);

    const entry = await this.journalEntryModel.create(mapped.entry);
    await this.journalEntryLineModel.insertMany(
      mapped.lines.map((line) => ({
        journalEntryId: entry._id,
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
      })),
    );
  }

  private ensureBalanced(lines: Array<{ debit: number; credit: number }>): void {
    const totals = lines.reduce(
      (acc, line) => ({ debit: acc.debit + (line.debit ?? 0), credit: acc.credit + (line.credit ?? 0) }),
      { debit: 0, credit: 0 },
    );
    if (totals.debit !== totals.credit) {
      throw new Error('Journal entry is not balanced');
    }
  }

  private toBusinessEvent(outbox: AccountingOutbox): BusinessEvent<any> {
    return {
      id: outbox.eventId,
      type: outbox.eventType,
      occurredAt: outbox.occurredAt,
      organizationId: outbox.organizationId,
      context: outbox.context,
      ref: outbox.ref,
      payload: outbox.payload,
    };
  }

  private async isAccountingInstalled(organizationId: string): Promise<boolean> {
    const org = await this.organizationModel
      .findOne({ id: organizationId }, { installedModules: 1 })
      .lean()
      .exec();
    const installed = Array.isArray(org?.installedModules)
      ? org?.installedModules.some((module) => module.key === 'accounting')
      : false;
    return Boolean(installed);
  }
}
