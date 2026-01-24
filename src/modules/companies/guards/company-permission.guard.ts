import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { COMPANY_PERMISSION_KEY } from '../decorators/company-permission.decorator';
import { CompaniesService } from '../companies.service';

@Injectable()
export class CompanyPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly companiesService: CompaniesService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(COMPANY_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const companyId: string | undefined = request.params?.id ?? request.params?.companyId;
    if (!companyId) {
      throw new BadRequestException('Company id is required');
    }

    const userId: string | undefined = request.user?.sub;
    const permissions = this.companiesService.getMemberPermissions(companyId, userId);
    if (!permissions.includes(required)) {
      throw new ForbiddenException('Permission denied');
    }

    return true;
  }
}
