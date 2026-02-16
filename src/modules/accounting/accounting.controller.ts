import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingPostingService } from './accounting-posting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { ClosePeriodDto } from './dto/close-period.dto';
import { RecordAccountingEventDto } from './dto/record-event.dto';

@Controller('accounting')
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly accountingPostingService: AccountingPostingService,
  ) {}

  @Get(':orgId/accounts')
  async listAccountsByOrg(@Param('orgId') orgId: string) {
    return {
      message: 'Accounts listed',
      result: await this.accountingService.listAccounts(orgId),
    };
  }

  @Post(':orgId/accounts')
  async createAccountByOrg(@Param('orgId') orgId: string, @Body() dto: CreateAccountDto) {
    return {
      message: 'Account created',
      result: await this.accountingService.createAccount(dto, orgId),
    };
  }

  @Get('accounts')
  async listAccounts(@Query('OrganizationId') OrganizationId?: string, @Query('companyId') companyId?: string) {
    return {
      message: 'Accounts listed',
      result: await this.accountingService.listAccounts(OrganizationId),
    };
  }

  @Post('accounts')
  async createAccount(@Body() dto: CreateAccountDto) {
    return {
      message: 'Account created',
      result: await this.accountingService.createAccount(dto),
    };
  }

  @Get('tax-rules')
  listTaxRules(@Query('OrganizationId') OrganizationId?: string, @Query('companyId') companyId?: string) {
    return {
      message: 'Tax rules listed',
      result: this.accountingService.listTaxRules(OrganizationId, companyId),
    };
  }

  @Post('tax-rules')
  createTaxRule(@Body() dto: CreateTaxRuleDto) {
    return {
      message: 'Tax rule created',
      result: this.accountingService.createTaxRule(dto),
    };
  }

  @Get(':orgId/journal-entries')
  async listJournalEntriesByOrg(
    @Param('orgId') orgId: string,
    @Query('enterpriseId') enterpriseId?: string,
    @Query('companyId') companyId?: string,
    @Query('countryId') countryId?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return {
      message: 'Journal entries listed',
      result: await this.accountingService.listJournalEntries({
        organizationId: orgId,
        enterpriseId,
        companyId,
        countryId,
        year: year ? Number(year) : undefined,
        month: month ? Number(month) : undefined,
      }),
    };
  }

  @Get(':orgId/journal-entries/:id')
  async getJournalEntry(@Param('orgId') orgId: string, @Param('id') id: string) {
    return {
      message: 'Journal entry loaded',
      result: await this.accountingService.getJournalEntry(orgId, id),
    };
  }

  @Get('journal-entries')
  async listJournalEntries(@Query('OrganizationId') OrganizationId?: string, @Query('companyId') companyId?: string) {
    return {
      message: 'Journal entries listed',
      result: await this.accountingService.listJournalEntries({
        organizationId: OrganizationId,
        companyId,
      }),
    };
  }

  @Post('journal-entries')
  async createJournalEntry(@Body() dto: CreateJournalEntryDto) {
    return {
      message: 'Journal entry recorded',
      result: await this.accountingService.recordJournalEntry(dto),
    };
  }

  @Post('events')
  async recordEvent(@Body() dto: RecordAccountingEventDto) {
    return {
      message: 'Accounting event recorded',
      result: await this.accountingService.recordEvent(dto),
    };
  }

  @Post('periods/close')
  closePeriod(@Body() dto: ClosePeriodDto) {
    return {
      message: 'Accounting period closed',
      result: this.accountingService.closePeriod(dto),
    };
  }

  @Post(':orgId/process-outbox')
  async processOutbox(@Param('orgId') _orgId: string) {
    await this.accountingPostingService.processPendingOutbox();
    return {
      message: 'Accounting outbox processed',
      result: { ok: true },
    };
  }
}
