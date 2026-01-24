import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AccountingModule } from '../accounting/accounting.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { ModuleLoaderModule } from '../module-loader/module-loader.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CompaniesModule } from '../companies/companies.module';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceAdminGuard } from './guards/workspace-admin.guard';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { WorkspacePermissionGuard } from './guards/workspace-permission.guard';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceModuleSettingsService } from './workspace-module-settings.service';

@Module({
  imports: [
    UsersModule,
    WarehousesModule,
    AccountingModule,
    ModuleLoaderModule,
    OrganizationsModule,
    CompaniesModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    WorkspaceMemberGuard,
    WorkspaceAdminGuard,
    WorkspacePermissionGuard,
    WorkspaceModuleSettingsService,
  ],
  exports: [
    WorkspacesService,
    WorkspaceMemberGuard,
    WorkspaceAdminGuard,
    WorkspacePermissionGuard,
    WorkspaceModuleSettingsService,
  ],
})
export class WorkspacesModule {}
