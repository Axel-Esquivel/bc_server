import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';
import { BusinessEvent } from '../../../core/events/business-event';

interface PosSaleCompletedPayload {
  totals: {
    subtotal: number;
    tax: number;
    discount: number;
    grandTotal: number;
  };
  payment?: {
    method: string;
    amount: number;
  } | null;
  lines: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
}

export interface MappedJournalEntry {
  entry: {
    organizationId: string;
    date: Date;
    period: { year: number; month: number };
    context: {
      enterpriseId: string;
      companyId?: string;
      countryId?: string;
      currencyId?: string;
    };
    source: {
      type: string;
      refId: string;
      eventId?: string;
    };
    description?: string;
    status: 'posted';
  };
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    memo?: string;
  }>;
}

@Injectable()
export class AccountingPosSaleMapper {
  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
  ) {}

  async map(event: BusinessEvent<PosSaleCompletedPayload>): Promise<MappedJournalEntry> {
    const orgId = event.organizationId;
    const cashAccount = await this.getAccountByCode(orgId, '101-CAJA');
    const salesAccount = await this.getAccountByCode(orgId, '401-VENTAS');
    const taxAccount = await this.getAccountByCode(orgId, '210-IVA-POR-PAGAR', true);

    if (!cashAccount) {
      throw new BadRequestException('Accounting: cash account not configured/found');
    }
    if (!salesAccount) {
      throw new BadRequestException('Accounting: sales account not configured/found');
    }

    const totals = event.payload.totals;
    const discount = totals.discount ?? 0;
    const subtotal = totals.subtotal ?? 0;
    const tax = totals.tax ?? 0;
    const grandTotal = totals.grandTotal ?? subtotal - discount + tax;

    const lines: MappedJournalEntry['lines'] = [
      {
        accountId: cashAccount._id.toString(),
        debit: grandTotal,
        credit: 0,
        memo: 'POS sale cash',
      },
    ];

    if (tax > 0) {
      if (!taxAccount) {
        throw new BadRequestException('Accounting: tax account not configured/found');
      }
      lines.push({
        accountId: salesAccount._id.toString(),
        debit: 0,
        credit: subtotal - discount,
        memo: 'POS sale revenue',
      });
      lines.push({
        accountId: taxAccount._id.toString(),
        debit: 0,
        credit: tax,
        memo: 'POS sale tax',
      });
    } else {
      lines.push({
        accountId: salesAccount._id.toString(),
        debit: 0,
        credit: grandTotal,
        memo: 'POS sale revenue',
      });
    }

    const occurredAt = event.occurredAt ?? new Date();
    return {
      entry: {
        organizationId: orgId,
        date: occurredAt,
        period: { year: occurredAt.getUTCFullYear(), month: occurredAt.getUTCMonth() + 1 },
        context: {
          enterpriseId: event.context.enterpriseId,
          companyId: event.context.companyId,
          countryId: event.context.countryId,
          currencyId: event.context.currencyId,
        },
        source: {
          type: event.type,
          refId: event.ref.id,
          eventId: event.id,
        },
        description: `POS sale ${event.ref.id}`,
        status: 'posted',
      },
      lines,
    };
  }

  private async getAccountByCode(
    organizationId: string,
    code: string,
    optional = false,
  ): Promise<AccountDocument | null> {
    const account = await this.accountModel.findOne({ organizationId, code }).exec();
    if (!account && !optional) {
      throw new Error(`Account code ${code} not found for organization ${organizationId}`);
    }
    return account;
  }
}
