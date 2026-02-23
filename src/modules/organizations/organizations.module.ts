import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ModuleLoaderModule } from '../module-loader/module-loader.module';
import { CompaniesModule } from '../companies/companies.module';
import { BranchesModule } from '../branches/branches.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { AccountingModule } from '../accounting/accounting.module';
import { UomModule } from '../uom/uom.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationAdminGuard } from './guards/organization-admin.guard';
import { OrganizationMemberGuard } from './guards/organization-member.guard';
import { OrganizationOwnerGuard } from './guards/organization-owner.guard';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { OrgModule, OrgModuleSchema } from './schemas/org-module.schema';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
    forwardRef(() => CompaniesModule),
    forwardRef(() => BranchesModule),
    forwardRef(() => WarehousesModule),
    AccountingModule,
    UomModule,
    ModuleLoaderModule,
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrgModule.name, schema: OrgModuleSchema },
    ]),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationMemberGuard, OrganizationAdminGuard, OrganizationOwnerGuard],
  exports: [OrganizationsService, OrganizationMemberGuard, OrganizationAdminGuard, OrganizationOwnerGuard],
})
export class OrganizationsModule {}
