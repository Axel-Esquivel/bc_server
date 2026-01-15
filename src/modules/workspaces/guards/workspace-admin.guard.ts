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
    const role = this.workspacesService.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new ForbiddenException('User is not a member of workspace');
    }

    if (role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }

    request.workspaceRole = role;
    return true;
  }
}
