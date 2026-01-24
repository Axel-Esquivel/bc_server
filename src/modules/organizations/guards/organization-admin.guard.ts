import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationsService } from '../organizations.service';
import { ORGANIZATION_PERMISSION_KEY } from '../decorators/organization-permission.decorator';

@Injectable()
export class OrganizationAdminGuard implements CanActivate {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const organizationId: string | undefined = request.params?.id;
    if (!organizationId) {
      throw new BadRequestException('Organization id is required');
    }

    const userId: string | undefined = request.user?.sub ?? request.user?.id ?? request.userId;
    const member = this.organizationsService.getMember(organizationId, userId);
    if (!member) {
      throw new ForbiddenException('User is not a member of organization');
    }
    if (member.status !== 'active') {
      throw new ForbiddenException('Membership is pending approval');
    }

    const permission =
      this.reflector.getAllAndOverride<string>(ORGANIZATION_PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? '*';

    const organization = this.organizationsService.getOrganization(organizationId);
    const roleDefinition = organization.roles.find((role) => role.key === member.roleKey);
    if (!roleDefinition) {
      throw new ForbiddenException('Role not found');
    }
    if (
      !roleDefinition.permissions.includes('*') &&
      !roleDefinition.permissions.includes(permission)
    ) {
      throw new ForbiddenException('Permission denied');
    }

    request.organizationRole = member.roleKey;
    return true;
  }
}
