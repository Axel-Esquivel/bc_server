import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ModuleLoaderModule } from '../module-loader/module-loader.module';
import { CompaniesModule } from '../companies/companies.module';
import { BranchesModule } from '../branches/branches.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationAdminGuard } from './guards/organization-admin.guard';
import { OrganizationMemberGuard } from './guards/organization-member.guard';

@Module({
  imports: [
    UsersModule,
    forwardRef(() => AuthModule),
    forwardRef(() => CompaniesModule),
    forwardRef(() => BranchesModule),
    forwardRef(() => WarehousesModule),
    ModuleLoaderModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationMemberGuard, OrganizationAdminGuard],
  exports: [OrganizationsService, OrganizationMemberGuard, OrganizationAdminGuard],
})
export class OrganizationsModule {}
