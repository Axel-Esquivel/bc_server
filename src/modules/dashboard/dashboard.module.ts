import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [AuthModule, CompaniesModule, OrganizationsModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
