import { Module, forwardRef } from '@nestjs/common';
import { SettingsAdminGuard } from '../../core/guards/settings-admin.guard';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';

@Module({
  imports: [forwardRef(() => OrganizationsModule)],
  controllers: [CountriesController],
  providers: [CountriesService, SettingsAdminGuard],
  exports: [CountriesService],
})
export class CountriesModule {}
