import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsAdminGuard } from '../../core/guards/settings-admin.guard';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';
import { Currency, CurrencySchema } from './schemas/currency.schema';

@Module({
  imports: [
    forwardRef(() => OrganizationsModule),
    MongooseModule.forFeature([{ name: Currency.name, schema: CurrencySchema }]),
  ],
  controllers: [CurrenciesController],
  providers: [CurrenciesService, SettingsAdminGuard],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}
