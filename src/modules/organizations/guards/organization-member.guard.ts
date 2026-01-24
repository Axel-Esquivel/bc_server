import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { OrganizationsService } from '../organizations.service';

@Injectable()
export class OrganizationMemberGuard implements CanActivate {
  constructor(private readonly organizationsService: OrganizationsService) {}

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

    request.organizationRole = member.roleKey;
    return true;
  }
}
