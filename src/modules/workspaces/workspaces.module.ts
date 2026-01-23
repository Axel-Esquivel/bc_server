import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AccountingModule } from '../accounting/accounting.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { ModuleLoaderModule } from '../module-loader/module-loader.module';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceAdminGuard } from './guards/workspace-admin.guard';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceModuleSettingsService } from './workspace-module-settings.service';

@Module({
  imports: [UsersModule, WarehousesModule, AccountingModule, ModuleLoaderModule, forwardRef(() => AuthModule)],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspaceMemberGuard, WorkspaceAdminGuard, WorkspaceModuleSettingsService],
  exports: [WorkspacesService, WorkspaceMemberGuard, WorkspaceAdminGuard, WorkspaceModuleSettingsService],
})
export class WorkspacesModule {}
