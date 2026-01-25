import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { WorkspacesService } from '../workspaces.service';

@Injectable()
export class WorkspaceAdminGuard implements CanActivate {
  constructor(private readonly workspacesService: WorkspacesService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const workspaceId: string | undefined = request.params?.id;
    if (!workspaceId) {
      throw new BadRequestException('Workspace id is required');
    }

    const userId: string | undefined = request.user?.sub;
    const member = this.workspacesService.getMember(workspaceId, userId);
    if (!member) {
      throw new ForbiddenException('User is not a member of workspace');
    }
    if (member.status !== 'active') {
      throw new ForbiddenException('Pending approval');
    }

    const permissions = this.workspacesService.getMemberPermissions(workspaceId, userId);
    const isAdmin = this.workspacesService.hasPermission(permissions, 'workspace.manage');
    if (!isAdmin) {
      throw new ForbiddenException('Missing permission: workspace.manage');
    }

    request.workspaceRoleKey = member.roleKey;
    return true;
  }
}
