import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompaniesService } from '../companies/companies.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { MODULE_CATALOG } from '../../core/constants/modules.catalog';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly companiesService: CompaniesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('overview')
  getOverview(
    @Req() req: any,
    @Query('orgId') orgId?: string,
    @Query('companyId') companyId?: string,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.userId;

    let organizationId = orgId?.trim();
    if (!organizationId && companyId) {
      const company = this.companiesService.getCompany(companyId);
      organizationId = company.organizationId;
    }

    if (!organizationId) {
      const memberships = this.organizationsService.listMembershipsByUser(userId);
      const active = memberships.find((member) => member.status === 'active');
      organizationId = active?.organizationId;
    }

    if (!organizationId) {
      return {
        message: 'Dashboard overview loaded',
        result: {
          currentOrgId: null,
          currentOrgRoleKey: null,
          permissions: [],
          modulesPendingConfig: [],
        },
      };
    }

    const organization = this.organizationsService.getOrganization(organizationId);
    const member = this.organizationsService.getMember(organizationId, userId);
    if (!member || member.status !== 'active') {
      return {
        message: 'Dashboard overview loaded',
        result: {
          currentOrgId: organizationId,
          currentOrgRoleKey: null,
          permissions: [],
          modulesPendingConfig: [],
        },
      };
    }

    const role = organization.roles.find((item) => item.key === member.roleKey);
    const permissions = role?.permissions ?? [];
    const canConfigureModules = permissions.includes('*') || permissions.includes('modules.configure');

    const modulesPendingConfig: string[] = [];
    if (canConfigureModules) {
      const moduleStates = organization.moduleStates ?? {};
      const moduleSettings = organization.moduleSettings ?? {};
      MODULE_CATALOG.forEach((entry) => {
        const status = moduleStates[entry.key] ?? 'inactive';
        const configuredFlag = moduleSettings[entry.key]?.configured;
        if (status === 'pendingConfig' || configuredFlag === false) {
          modulesPendingConfig.push(entry.key);
        }
      });
    }

    return {
      message: 'Dashboard overview loaded',
      result: {
        currentOrgId: organizationId,
        currentOrgRoleKey: role?.key ?? null,
        permissions,
        modulesPendingConfig,
      },
    };
  }
}
