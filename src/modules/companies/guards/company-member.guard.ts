import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CompaniesService } from '../companies.service';

@Injectable()
export class CompanyMemberGuard implements CanActivate {
  constructor(private readonly companiesService: CompaniesService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const companyId: string | undefined = request.params?.id;
    if (!companyId) {
      throw new BadRequestException('Company id is required');
    }

    const userId: string | undefined = request.user?.sub;
    const roleKey = this.companiesService.getMemberRole(companyId, userId);
    if (!roleKey) {
      throw new ForbiddenException('User is not a member of company');
    }

    request.companyRole = roleKey;
    return true;
  }
}
