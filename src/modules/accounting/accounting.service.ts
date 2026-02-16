import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto, JournalEntryLineDto } from './dto/create-journal-entry.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { ClosePeriodDto } from './dto/close-period.dto';
import { RecordAccountingEventDto } from './dto/record-event.dto';
import { TaxRule } from './entities/tax-rule.entity';
import { Account, AccountDocument } from './schemas/account.schema';
import { JournalEntry, JournalEntryDocument } from './schemas/journal-entry.schema';
import { JournalEntryStatus } from './entities/journal-entry.entity';
import { JournalEntryLine, JournalEntryLineDocument } from './schemas/journal-entry-line.schema';

interface AccountingState {
  taxRules: TaxRule[];
  closedPeriods: string[];
}

@Injectable()
export class AccountingService implements OnModuleInit {
  private readonly logger = new Logger(AccountingService.name);
  private readonly stateKey = 'module:accounting:meta';
  private taxRules: TaxRule[] = [];
  private closedPeriods = new Set<string>();

  constructor(
    private readonly moduleState: ModuleStateService,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(JournalEntry.name)
    private readonly journalEntryModel: Model<JournalEntryDocument>,
    @InjectModel(JournalEntryLine.name)
    private readonly journalEntryLineModel: Model<JournalEntryLineDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<AccountingState>(this.stateKey, {
      taxRules: [],
      closedPeriods: [],
    });
    this.taxRules = state.taxRules ?? [];
    this.closedPeriods = new Set(state.closedPeriods ?? []);
  }

  async createAccount(dto: CreateAccountDto, organizationId?: string): Promise<Account> {
    const resolvedOrgId = organizationId ?? dto.OrganizationId;
    if (!resolvedOrgId) {
      throw new BadRequestException('OrganizationId is required');
    }

    const existing = await this.accountModel
      .findOne({ organizationId: resolvedOrgId, code: dto.code })
      .lean()
      .exec();
    if (existing) {
      throw new BadRequestException('Account code already exists for this organization');
    }

    const created = await this.accountModel.create({
      organizationId: resolvedOrgId,
      code: dto.code,
      name: dto.name,
      type: dto.type as Account['type'],
      parentAccountId: dto.parentAccountId ? new MongooseSchema.Types.ObjectId(dto.parentAccountId) : undefined,
      isActive: dto.active ?? true,
    });
    return created.toObject();
  }

  async listAccounts(organizationId?: string): Promise<Account[]> {
    if (!organizationId) {
      return [];
    }
    return this.accountModel.find({ organizationId }).sort({ code: 1 }).lean().exec();
  }

  createTaxRule(dto: CreateTaxRuleDto): TaxRule {
    const rule: TaxRule = {
      id: uuid(),
      name: dto.name,
      rate: dto.rate,
      regime: dto.regime,
      active: dto.active ?? true,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
    };
    this.taxRules.push(rule);
    this.persistMetaState();
    return rule;
  }

  listTaxRules(OrganizationId?: string, companyId?: string): TaxRule[] {
    return this.taxRules.filter((rule) => {
      if (OrganizationId && rule.OrganizationId !== OrganizationId) return false;
      if (companyId && rule.companyId !== companyId) return false;
      return true;
    });
  }

  async recordJournalEntry(dto: CreateJournalEntryDto): Promise<JournalEntry & { lines: JournalEntryLine[] }> {
    const organizationId = dto.OrganizationId?.trim();
    if (!organizationId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const companyId = dto.companyId?.trim();
    const enterpriseId = (dto as { enterpriseId?: string }).enterpriseId?.trim();
    if (!enterpriseId) {
      throw new BadRequestException('enterpriseId is required');
    }
    const date = new Date(dto.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const period = this.getPeriod(date);
    this.ensurePeriodOpen(period);

    const lines = dto.lines.map((line) => this.toJournalLine(line));
    this.ensureBalanced(lines);

    const entry = await this.journalEntryModel.create({
      organizationId,
      date,
      period,
      context: {
        enterpriseId,
        companyId,
      },
      source: {
        type: dto.sourceModule ?? 'manual',
        refId: dto.reference,
      },
      description: dto.reference,
      status: dto.status ?? JournalEntryStatus.POSTED,
    });

    const entryLines = await this.journalEntryLineModel.insertMany(
      lines.map((line) => ({
        journalEntryId: entry._id,
        accountId: new MongooseSchema.Types.ObjectId(line.accountId),
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
        memo: line.description,
      })),
    );

    return { ...(entry.toObject() as JournalEntry), lines: entryLines.map((l) => l.toObject()) };
  }

  async recordEvent(dto: RecordAccountingEventDto): Promise<JournalEntry & { lines: JournalEntryLine[] }> {
    const entryDto: CreateJournalEntryDto & { enterpriseId?: string } = {
      date: dto.date,
      reference: dto.reference,
      sourceModule: dto.eventType,
      sourceId: dto.sourceId,
      status: JournalEntryStatus.POSTED,
      lines: dto.lines,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      enterpriseId: dto.enterpriseId,
    };
    return this.recordJournalEntry(entryDto);
  }

  async listJournalEntries(params: {
    organizationId?: string;
    enterpriseId?: string;
    companyId?: string;
    countryId?: string;
    year?: number;
    month?: number;
  }): Promise<JournalEntry[]> {
    if (!params.organizationId) {
      return [];
    }
    const query: Record<string, unknown> = { organizationId: params.organizationId };
    if (params.enterpriseId) {
      query['context.enterpriseId'] = params.enterpriseId;
    }
    if (params.companyId) {
      query['context.companyId'] = params.companyId;
    }
    if (params.countryId) {
      query['context.countryId'] = params.countryId;
    }
    if (params.year) {
      query['period.year'] = params.year;
    }
    if (params.month) {
      query['period.month'] = params.month;
    }
    return this.journalEntryModel.find(query).sort({ date: -1 }).lean().exec();
  }

  async getJournalEntry(organizationId: string, entryId: string): Promise<JournalEntry & { lines: JournalEntryLine[] }> {
    const entry = await this.journalEntryModel
      .findOne({ organizationId, _id: new MongooseSchema.Types.ObjectId(entryId) })
      .lean()
      .exec();
    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }
    const lines = await this.journalEntryLineModel
      .find({ journalEntryId: new MongooseSchema.Types.ObjectId(entryId) })
      .lean()
      .exec();
    return { ...entry, lines };
  }

  closePeriod(dto: ClosePeriodDto): { closed: string } {
    this.closedPeriods.add(dto.period);
    this.persistMetaState();
    return { closed: dto.period };
  }

  async seedBaseAccountsIfMissing(organizationId: string): Promise<void> {
    if (!organizationId?.trim()) {
      return;
    }
    const existing = await this.accountModel.countDocuments({ organizationId }).exec();
    if (existing > 0) {
      return;
    }

    const baseAccounts: Array<Pick<Account, 'organizationId' | 'code' | 'name' | 'type' | 'isActive'>> = [
      { organizationId, code: '101-CAJA', name: 'Caja', type: 'asset', isActive: true },
      { organizationId, code: '401-VENTAS', name: 'Ventas', type: 'income', isActive: true },
      { organizationId, code: '210-IVA-POR-PAGAR', name: 'IVA por pagar', type: 'liability', isActive: true },
    ];

    await this.accountModel.insertMany(baseAccounts, { ordered: false });
  }

  private ensureBalanced(lines: JournalEntryLineDto[]) {
    const totals = lines.reduce(
      (acc, line) => {
        return { debit: acc.debit + (line.debit ?? 0), credit: acc.credit + (line.credit ?? 0) };
      },
      { debit: 0, credit: 0 },
    );
    if (totals.debit !== totals.credit) {
      throw new BadRequestException('Journal entry is not balanced');
    }
  }

  private ensurePeriodOpen(period: { year: number; month: number }) {
    const key = `${period.year}-${String(period.month).padStart(2, '0')}`;
    if (this.closedPeriods.has(key)) {
      throw new BadRequestException('Accounting period is closed');
    }
  }

  private getPeriod(date: Date): { year: number; month: number } {
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
  }

  private toJournalLine(line: JournalEntryLineDto): JournalEntryLineDto {
    if ((line.debit ?? 0) < 0 || (line.credit ?? 0) < 0) {
      throw new BadRequestException('Debit and credit must be non-negative');
    }
    return line;
  }

  private persistMetaState() {
    void this.moduleState
      .saveState<AccountingState>(this.stateKey, {
        taxRules: this.taxRules,
        closedPeriods: Array.from(this.closedPeriods),
      })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Could not persist accounting state: ${message}`);
      });
  }
}
