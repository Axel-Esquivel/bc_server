import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { OrganizationsService } from '../../modules/organizations/organizations.service';

@Injectable()
export class SettingsAdminGuard implements CanActivate {
  constructor(private readonly organizationsService: OrganizationsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      method?: string;
      originalUrl?: string;
      url?: string;
      user?: { sub?: string; id?: string };
      userId?: string;
    }>();
    const userId: string | undefined = request.user?.sub ?? request.user?.id ?? request.userId;
    if (!userId) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (await this.organizationsService.hasPermissionAnyOrganization(userId, 'settings.configure')) {
      return true;
    }

    if (
      !(await this.organizationsService.hasActiveMemberships(userId)) &&
      this.isOnboardingSettingsRequest(request)
    ) {
      return true;
    }

    throw new ForbiddenException('Missing permission: settings.configure');
  }

  private isOnboardingSettingsRequest(request: { method?: string; originalUrl?: string; url?: string }): boolean {
    const method = typeof request.method === 'string' ? request.method.toUpperCase() : '';
    if (method !== 'POST') {
      return false;
    }
    const url = (request.originalUrl ?? request.url ?? '').toLowerCase();
    return url.includes('/countries') || url.includes('/currencies');
  }
}
