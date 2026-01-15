import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceAdminGuard } from './guards/workspace-admin.guard';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [UsersModule, forwardRef(() => AuthModule)],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspaceMemberGuard, WorkspaceAdminGuard],
  exports: [WorkspacesService, WorkspaceMemberGuard, WorkspaceAdminGuard],
})
export class WorkspacesModule {}
