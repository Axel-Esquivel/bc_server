import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto, JournalEntryLineDto } from './dto/create-journal-entry.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { ClosePeriodDto } from './dto/close-period.dto';
import { RecordAccountingEventDto } from './dto/record-event.dto';
import { Account } from './entities/account.entity';
import { JournalEntry, JournalEntryStatus } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { TaxRule } from './entities/tax-rule.entity';

interface AccountingState {
  accounts: Account[];
  taxRules: TaxRule[];
  journalEntries: JournalEntry[];
  closedPeriods: string[];
}

@Injectable()
export class AccountingService implements OnModuleInit {
  private readonly logger = new Logger(AccountingService.name);
  private readonly stateKey = 'module:accounting';
  private accounts: Account[] = [];
  private taxRules: TaxRule[] = [];
  private journalEntries: JournalEntry[] = [];
  private closedPeriods = new Set<string>();

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<AccountingState>(this.stateKey, {
      accounts: [],
      taxRules: [],
      journalEntries: [],
      closedPeriods: [],
    });
    this.accounts = state.accounts ?? [];
    this.taxRules = state.taxRules ?? [];
    this.journalEntries = state.journalEntries ?? [];
    this.closedPeriods = new Set(state.closedPeriods ?? []);
  }

  createAccount(dto: CreateAccountDto): Account {
    const duplicate = this.accounts.find(
      (acc) => acc.code === dto.code && acc.workspaceId === dto.workspaceId && acc.companyId === dto.companyId,
    );
    if (duplicate) {
      throw new BadRequestException('Account code already exists for this workspace/company');
    }

    const account: Account = {
      id: uuid(),
      code: dto.code,
      name: dto.name,
      type: dto.type,
      description: dto.description,
      active: dto.active ?? true,
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
    };
    this.accounts.push(account);
    this.persistState();
    return account;
  }

  listAccounts(workspaceId?: string, companyId?: string): Account[] {
    return this.accounts.filter((acc) => {
      if (workspaceId && acc.workspaceId !== workspaceId) return false;
      if (companyId && acc.companyId !== companyId) return false;
      return true;
    });
  }

  createTaxRule(dto: CreateTaxRuleDto): TaxRule {
    const rule: TaxRule = {
      id: uuid(),
      name: dto.name,
      rate: dto.rate,
      regime: dto.regime,
      active: dto.active ?? true,
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
    };
    this.taxRules.push(rule);
    this.persistState();
    return rule;
  }

  listTaxRules(workspaceId?: string, companyId?: string): TaxRule[] {
    return this.taxRules.filter((rule) => {
      if (workspaceId && rule.workspaceId !== workspaceId) return false;
      if (companyId && rule.companyId !== companyId) return false;
      return true;
    });
  }

  recordJournalEntry(dto: CreateJournalEntryDto): JournalEntry {
    const period = this.getPeriod(dto.date);
    this.ensurePeriodOpen(period);
    const lines = dto.lines.map((line) => this.toJournalLine(line));

    const totals = lines.reduce(
      (acc, line) => {
        return { debit: acc.debit + (line.debit ?? 0), credit: acc.credit + (line.credit ?? 0) };
      },
      { debit: 0, credit: 0 },
    );

    if (totals.debit !== totals.credit) {
      throw new BadRequestException('Journal entry is not balanced');
    }

    const entry: JournalEntry = {
      id: uuid(),
      date: new Date(dto.date),
      reference: dto.reference,
      sourceModule: dto.sourceModule,
      sourceId: dto.sourceId,
      status: dto.status ?? JournalEntryStatus.POSTED,
      lines,
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
      period,
    };

    this.journalEntries.push(entry);
    this.persistState();
    return entry;
  }

  recordEvent(dto: RecordAccountingEventDto): JournalEntry {
    const entryDto: CreateJournalEntryDto = {
      date: dto.date,
      reference: dto.reference,
      sourceModule: dto.eventType,
      sourceId: dto.sourceId,
      status: JournalEntryStatus.POSTED,
      lines: dto.lines,
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
    };
    return this.recordJournalEntry(entryDto);
  }

  listJournalEntries(workspaceId?: string, companyId?: string): JournalEntry[] {
    return this.journalEntries.filter((entry) => {
      if (workspaceId && entry.workspaceId !== workspaceId) return false;
      if (companyId && entry.companyId !== companyId) return false;
      return true;
    });
  }

  closePeriod(dto: ClosePeriodDto): { closed: string } {
    this.closedPeriods.add(dto.period);
    this.persistState();
    return { closed: dto.period };
  }

  private ensurePeriodOpen(period: string) {
    if (this.closedPeriods.has(period)) {
      throw new BadRequestException('Accounting period is closed');
    }
  }

  private getPeriod(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private toJournalLine(line: JournalEntryLineDto): JournalEntryLine {
    if ((line.debit ?? 0) < 0 || (line.credit ?? 0) < 0) {
      throw new BadRequestException('Debit and credit must be non-negative');
    }
    return {
      id: uuid(),
      accountId: line.accountId,
      debit: line.debit ?? 0,
      credit: line.credit ?? 0,
      description: line.description,
      taxRuleId: line.taxRuleId,
      workspaceId: line.workspaceId,
      companyId: line.companyId,
    };
  }

  private persistState() {
    void this.moduleState
      .saveState<AccountingState>(this.stateKey, {
        accounts: this.accounts,
        taxRules: this.taxRules,
        journalEntries: this.journalEntries,
        closedPeriods: Array.from(this.closedPeriods),
      })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Could not persist accounting state: ${message}`);
      });
  }
}
