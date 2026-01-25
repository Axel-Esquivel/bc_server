import { Module } from '@nestjs/common';
import { SettingsAdminGuard } from '../../core/guards/settings-admin.guard';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [CurrenciesController],
  providers: [CurrenciesService, SettingsAdminGuard],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}
