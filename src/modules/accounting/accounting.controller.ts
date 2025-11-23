import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { ClosePeriodDto } from './dto/close-period.dto';
import { RecordAccountingEventDto } from './dto/record-event.dto';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  listAccounts(@Query('workspaceId') workspaceId?: string, @Query('companyId') companyId?: string) {
    return {
      message: 'Accounts listed',
      result: this.accountingService.listAccounts(workspaceId, companyId),
    };
  }

  @Post('accounts')
  createAccount(@Body() dto: CreateAccountDto) {
    return {
      message: 'Account created',
      result: this.accountingService.createAccount(dto),
    };
  }

  @Get('tax-rules')
  listTaxRules(@Query('workspaceId') workspaceId?: string, @Query('companyId') companyId?: string) {
    return {
      message: 'Tax rules listed',
      result: this.accountingService.listTaxRules(workspaceId, companyId),
    };
  }

  @Post('tax-rules')
  createTaxRule(@Body() dto: CreateTaxRuleDto) {
    return {
      message: 'Tax rule created',
      result: this.accountingService.createTaxRule(dto),
    };
  }

  @Get('journal-entries')
  listJournalEntries(@Query('workspaceId') workspaceId?: string, @Query('companyId') companyId?: string) {
    return {
      message: 'Journal entries listed',
      result: this.accountingService.listJournalEntries(workspaceId, companyId),
    };
  }

  @Post('journal-entries')
  createJournalEntry(@Body() dto: CreateJournalEntryDto) {
    return {
      message: 'Journal entry recorded',
      result: this.accountingService.recordJournalEntry(dto),
    };
  }

  @Post('events')
  recordEvent(@Body() dto: RecordAccountingEventDto) {
    return {
      message: 'Accounting event recorded',
      result: this.accountingService.recordEvent(dto),
    };
  }

  @Post('periods/close')
  closePeriod(@Body() dto: ClosePeriodDto) {
    return {
      message: 'Accounting period closed',
      result: this.accountingService.closePeriod(dto),
    };
  }
}
