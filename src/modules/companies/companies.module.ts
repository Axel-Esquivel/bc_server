import { Module, forwardRef } from '@nestjs/common';
import { ModuleLoaderModule } from '../module-loader/module-loader.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompanyMemberGuard } from './guards/company-member.guard';
import { CompanyPermissionGuard } from './guards/company-permission.guard';

@Module({
  imports: [UsersModule, forwardRef(() => OrganizationsModule), ModuleLoaderModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompanyMemberGuard, CompanyPermissionGuard],
  exports: [CompaniesService, CompanyMemberGuard, CompanyPermissionGuard],
})
export class CompaniesModule {}
