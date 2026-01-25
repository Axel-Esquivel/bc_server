import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { OrganizationsService } from '../../modules/organizations/organizations.service';

@Injectable()
export class SettingsAdminGuard implements CanActivate {
  constructor(private readonly organizationsService: OrganizationsService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.sub ?? request.user?.id ?? request.userId;
    if (!userId) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (this.organizationsService.hasPermissionAnyOrganization(userId, 'settings.configure')) {
      return true;
    }

    throw new ForbiddenException('Missing permission: settings.configure');
  }
}
