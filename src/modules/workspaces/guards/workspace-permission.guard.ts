import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WORKSPACE_PERMISSION_KEY } from '../decorators/workspace-permission.decorator';
import { WorkspacesService } from '../workspaces.service';

@Injectable()
export class WorkspacePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspacesService: WorkspacesService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(WORKSPACE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const workspaceId: string | undefined = request.params?.id;
    if (!workspaceId) {
      throw new BadRequestException('Workspace id is required');
    }

    const userId: string | undefined = request.user?.sub;
    const permissions = this.workspacesService.getMemberPermissions(workspaceId, userId);
    if (!permissions.includes(required)) {
      throw new ForbiddenException('Permission denied');
    }

    return true;
  }
}