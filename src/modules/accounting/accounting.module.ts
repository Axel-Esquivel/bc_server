import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from '../organizations/schemas/organization.schema';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AccountingPostingService } from './accounting-posting.service';
import { AccountingPosSaleMapper } from './mappers/accounting-pos-sale.mapper';
import { Account, AccountSchema } from './schemas/account.schema';
import { JournalEntry, JournalEntrySchema } from './schemas/journal-entry.schema';
import { JournalEntryLine, JournalEntryLineSchema } from './schemas/journal-entry-line.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: JournalEntryLine.name, schema: JournalEntryLineSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
  ],
  controllers: [AccountingController],
  providers: [AccountingService, AccountingPostingService, AccountingPosSaleMapper],
  exports: [AccountingService],
})
export class AccountingModule {}
