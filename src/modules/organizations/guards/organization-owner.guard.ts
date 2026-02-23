import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { OrganizationsService } from '../organizations.service';
import { OWNER_ROLE_KEY } from '../types/organization-role.types';
import type { AuthenticatedRequest } from '../../../core/types/authenticated-request.types';

type OrganizationOwnerRequest = AuthenticatedRequest & {
  OrganizationId?: string;
  query?: Record<string, unknown>;
};

@Injectable()
export class OrganizationOwnerGuard implements CanActivate {
  constructor(private readonly organizationsService: OrganizationsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OrganizationOwnerRequest>();
    const orgId =
      (request.query?.organizationId as string | undefined) ??
      request.user?.organizationId ??
      request.OrganizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }

    const userId: string | undefined = request.user?.sub ?? request.user?.id ?? request.userId;
    const role = await this.organizationsService.getMemberRole(orgId, userId);
    if (role !== OWNER_ROLE_KEY) {
      throw new ForbiddenException('Owner role required');
    }

    return true;
  }
}
