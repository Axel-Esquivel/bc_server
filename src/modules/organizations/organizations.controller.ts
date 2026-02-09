import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BootstrapOrganizationDto } from './dto/bootstrap-organization.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { InviteOrganizationMemberDto } from './dto/invite-organization-member.dto';
import { JoinOrganizationDto } from './dto/join-organization.dto';
import { JoinOrganizationRequestDto } from './dto/join-organization-request.dto';
import { JoinOrganizationRequestEmailDto } from './dto/join-organization-request-email.dto';
import { UpdateOrganizationModulesDto } from './dto/update-organization-modules.dto';
import { UpdateOrganizationModuleKeyDto } from './dto/update-organization-module-key.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateCoreCompanyDto } from './dto/create-core-company.dto';
import { CreateCoreCountryDto } from './dto/create-core-country.dto';
import { CreateCoreCurrencyDto } from './dto/create-core-currency.dto';
import { OrganizationCoreSettingsDto } from './dto/organization-core-settings.dto';
import { OrganizationStructureSettingsDto } from './dto/organization-structure-settings.dto';
import { UpdateCoreSettingsDto } from './dto/update-core-settings.dto';
import { OrganizationPermission } from './decorators/organization-permission.decorator';
import { OrganizationAdminGuard } from './guards/organization-admin.guard';
import { OrganizationMemberGuard } from './guards/organization-member.guard';
import { OrganizationsService } from './organizations.service';
import { CompaniesService } from '../companies/companies.service';
import type { OrganizationRoleKey } from './types/organization-role.types';
import type { AuthenticatedRequest } from '../../core/types/authenticated-request.types';
import type { ApiResponse } from '../../core/types/api-response.types';
import type { OrganizationCoreSettings as LegacyOrganizationCoreSettings } from '../../core/types/organization-core-settings.types';
import type { OrganizationStructureSettings } from '../../core/types/organization-structure-settings.types';
import type { CoreCompany, CoreCountry, CoreCurrency, OrganizationCoreSettings } from './types/core-settings.types';
import type { OrganizationOrganizationsnapshot } from './types/organization-snapshot.types';
import type { OrganizationModuleState } from './types/module-state.types';
import type { OrganizationModulesOverviewResponse } from './types/organization-modules-overview.types';
import type { SafeUser } from '../users/entities/user.entity';
import type { CompanyEntity } from '../companies/entities/company.entity';

interface OrganizationDefaultResponse {
  user: SafeUser;
}

interface OrganizationDeleteResponse {
  success: true;
}

class UpdateOrganizationMemberDto {
  @IsString()
  role!: OrganizationRoleKey;
}

class OrganizationRoleDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

class UpdateOrganizationRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly companiesService: CompaniesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrganizationDto) {
    const userId = this.getUserId(req);
    const organization = await this.organizationsService.createOrganization(dto, userId);
    return {
      message: 'Organization created',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('bootstrap')
  async bootstrap(@Req() req: AuthenticatedRequest, @Body() dto: BootstrapOrganizationDto) {
    const userId = this.getUserId(req);
    const result = await this.organizationsService.createOrganizationBootstrap(dto, userId);
    return {
      message: 'Organization bootstrap created',
      result,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    const organizations = await this.organizationsService.listByUser(userId);
    return {
      message: 'Organizations loaded',
      result: organizations,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('memberships')
  async listMemberships(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    const memberships = await this.organizationsService.listMembershipsByUser(userId);
    return {
      message: 'Organization memberships loaded',
      result: memberships,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    const memberships = await this.organizationsService.listMembershipsByUser(userId);
    const hasActive = memberships.some((member) => member.status === 'active');
    const hasPending = memberships.some((member) => member.status === 'pending');
    return {
      message: 'Organization membership status loaded',
      result: {
        memberships,
        hasActive,
        hasPending,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('join')
  async requestJoinBySelector(@Req() req: AuthenticatedRequest, @Body() dto: JoinOrganizationRequestDto) {
    const userId = this.getUserId(req);
    const organization = await this.organizationsService.requestJoinBySelector(dto, userId);
    return {
      message: 'Organization join requested',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('join-request')
  async requestJoinByEmail(@Req() req: AuthenticatedRequest, @Body() dto: JoinOrganizationRequestEmailDto) {
    const userId = this.getUserId(req);
    const organization = await this.organizationsService.requestJoinByEmail(dto, userId);
    return {
      message: 'Organization join requested',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const organization = await this.organizationsService.getOrganization(id);
    return {
      message: 'Organization loaded',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @Get(':id/roles')
  async listRoles(@Param('id') id: string) {
    const roles = await this.organizationsService.listRoles(id);
    return {
      message: 'Organization roles loaded',
      result: roles,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @Get(':id/permissions')
  listPermissions(@Param('id') id: string) {
    const permissions = this.organizationsService.listPermissions();
    return {
      message: 'Organization permissions loaded',
      result: permissions,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('modules.configure')
  @Get(':id/modules')
  async getModules(@Req() req: AuthenticatedRequest, @Param('id') id: string): Promise<ApiResponse<OrganizationModulesOverviewResponse>> {
    this.getUserId(req);
    const result = await this.organizationsService.getModulesOverview(id);
    return {
      message: 'Organization modules loaded',
      result,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('modules.configure')
  @Patch(':id/modules')
  async updateModules(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationModulesDto
  ): Promise<ApiResponse<OrganizationModulesOverviewResponse>> {
    const userId = this.getUserId(req);
    const result = await this.organizationsService.enableModules(id, dto.modules ?? [], userId);
    await this.organizationsService.markSetupCompleted(id);
    return {
      message: 'Organization modules updated',
      result,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('modules.configure')
  @Post(':id/modules/install')
  async installModule(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationModuleKeyDto,
  ): Promise<ApiResponse<OrganizationModulesOverviewResponse>> {
    const userId = this.getUserId(req);
    const result = await this.organizationsService.installModule(id, dto.key, userId);
    return {
      message: 'Organization module installed',
      result,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('modules.configure')
  @Post(':id/modules/disable')
  async disableModule(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationModuleKeyDto,
  ): Promise<ApiResponse<OrganizationModulesOverviewResponse>> {
    const userId = this.getUserId(req);
    const result = await this.organizationsService.disableModule(id, dto.key, userId);
    return {
      message: 'Organization module disabled',
      result,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('modules.configure')
  @Patch(':id/modules/:moduleKey/configured')
  async markModuleConfigured(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('moduleKey') moduleKey: string,
  ): Promise<ApiResponse<OrganizationModuleState>> {
    const userId = this.getUserId(req);
    const result = await this.organizationsService.markModuleConfigured(id, moduleKey, userId);
    return {
      message: 'Organization module configured',
      result,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @Get(':id/core-settings')
  async getCoreSettings(@Param('id') id: string): Promise<ApiResponse<OrganizationCoreSettings>> {
    const settings = await this.organizationsService.getCoreSettings(id);
    return {
      message: 'Organization core settings loaded',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('organizations.write')
  @Patch(':id/core-settings')
  async updateCoreSettings(
    @Param('id') id: string,
    @Body() dto: UpdateCoreSettingsDto,
  ): Promise<ApiResponse<OrganizationCoreSettings>> {
    const settings = await this.organizationsService.updateCoreSettings(id, dto);
    return {
      message: 'Organization core settings updated',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('organizations.write')
  @Post(':id/countries')
  async addCoreCountry(
    @Param('id') id: string,
    @Body() dto: CreateCoreCountryDto,
  ): Promise<ApiResponse<CoreCountry>> {
    const result = await this.organizationsService.addCountry(id, dto);
    return {
      message: 'Organization country added',
      result,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('organizations.write')
  @Post(':id/currencies')
  async addCoreCurrency(
    @Param('id') id: string,
    @Body() dto: CreateCoreCurrencyDto,
  ): Promise<ApiResponse<CoreCurrency>> {
    const result = await this.organizationsService.addCurrency(id, dto);
    return {
      message: 'Organization currency added',
      result,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('organizations.write')
  @Post(':id/companies')
  async addCoreCompany(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CreateCoreCompanyDto,
  ): Promise<ApiResponse<CoreCompany | CompanyEntity>> {
    console.log('CREATE_COMPANY_DTO_V2_ACTIVE', dto);
    const useV2 =
      Array.isArray(dto.operatingCountryIds) ||
      Array.isArray(dto.currencyIds) ||
      Array.isArray(dto.enterprisesByCountry);
    if (useV2) {
      const userId = this.getUserId(req);
      const operatingCountryIds = dto.operatingCountryIds ?? (dto.countryId ? [dto.countryId] : []);
      const company = await this.companiesService.createCompany(id, userId, {
        name: dto.name,
        operatingCountryIds,
        currencyIds: dto.currencyIds,
        defaultCurrencyId: dto.defaultCurrencyId,
        enterprisesByCountry: dto.enterprisesByCountry,
        defaultEnterpriseKey: dto.defaultEnterpriseKey,
        baseCountryId: dto.countryId,
      });
      return {
        message: 'Company created',
        result: company,
      };
    }

    const countryId = dto.countryId?.trim();
    if (!countryId) {
      throw new BadRequestException('Company country is required');
    }
    const result = await this.organizationsService.addCompany(id, { name: dto.name, countryId });
    return {
      message: 'Organization company added',
      result,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @Get(':id/settings/core')
  async getLegacyCoreSettings(
    @Param('id') id: string,
  ): Promise<ApiResponse<LegacyOrganizationCoreSettings>> {
    const settings = await this.organizationsService.getLegacyCoreSettings(id);
    return {
      message: 'Organization core settings loaded',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('organizations.write')
  @Patch(':id/settings/core')
  async updateLegacyCoreSettings(
    @Param('id') id: string,
    @Body() dto: OrganizationCoreSettingsDto,
  ): Promise<ApiResponse<LegacyOrganizationCoreSettings>> {
    const settings = await this.organizationsService.updateLegacyCoreSettings(id, dto);
    return {
      message: 'Organization core settings updated',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @Get(':id/settings/structure')
  async getStructureSettings(
    @Param('id') id: string,
  ): Promise<ApiResponse<OrganizationStructureSettings>> {
    const settings = await this.organizationsService.getStructureSettings(id);
    return {
      message: 'Organization structure settings loaded',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('organizations.write')
  @Patch(':id/settings/structure')
  async updateStructureSettings(
    @Param('id') id: string,
    @Body() dto: OrganizationStructureSettingsDto,
  ): Promise<ApiResponse<OrganizationStructureSettings>> {
    const settings = await this.organizationsService.updateStructureSettings(id, dto);
    return {
      message: 'Organization structure settings updated',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('roles.write')
  @Post(':id/roles')
  async createRole(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: OrganizationRoleDto,
  ) {
    const userId = this.getUserId(req);
    const roles = await this.organizationsService.createRole(id, userId, dto);
    return {
      message: 'Organization role created',
      result: roles,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('roles.write')
  @Patch(':id/roles/:roleKey')
  async updateRole(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('roleKey') roleKey: string,
    @Body() dto: UpdateOrganizationRoleDto,
  ) {
    const userId = this.getUserId(req);
    const roles = await this.organizationsService.updateRole(id, userId, roleKey, dto);
    return {
      message: 'Organization role updated',
      result: roles,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('roles.write')
  @Delete(':id/roles/:roleKey')
  async deleteRole(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('roleKey') roleKey: string,
  ) {
    const userId = this.getUserId(req);
    const roles = await this.organizationsService.deleteRole(id, userId, roleKey);
    return {
      message: 'Organization role removed',
      result: roles,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @Get(':id/Organizations')
  async listOrganizations(@Param('id') id: string): Promise<ApiResponse<OrganizationOrganizationsnapshot[]>> {
    const Organizations = await this.organizationsService.listOrganizations(id);
    return {
      message: 'Organization Organizations loaded',
      result: Organizations,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @Get(':id/overview')
  async getOverview(@Param('id') id: string) {
    const overview = await this.organizationsService.getOverview(id);
    return {
      message: 'Organization overview loaded',
      result: overview,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Post(':id/invite')
  async inviteMember(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: InviteOrganizationMemberDto,
  ) {
    const userId = this.getUserId(req);
    const organization = await this.organizationsService.addMemberByEmail(id, userId, dto.email, dto.roleKey);
    return {
      message: 'Organization member invited',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  async requestJoinById(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: JoinOrganizationDto,
  ) {
    const userId = this.getUserId(req);
    const organization = await this.organizationsService.requestJoin(id, userId, dto.roleKey);
    return {
      message: 'Organization join requested',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Post(':id/members')
  async addMember(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AddOrganizationMemberDto,
  ) {
    const userId = this.getUserId(req);
    const organization = await this.organizationsService.addMemberByEmail(id, userId, dto.email, dto.role);
    return {
      message: 'Organization member added',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Post(':id/members/:userId/accept')
  async acceptMember(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Param('userId') userId: string) {
    const requesterId = this.getUserId(req);
    const organization = await this.organizationsService.acceptMember(id, requesterId, userId);
    return {
      message: 'Organization member accepted',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Patch(':id/members/:userId/accept')
  async acceptMemberPatch(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Param('userId') userId: string) {
    const requesterId = this.getUserId(req);
    const organization = await this.organizationsService.acceptMember(id, requesterId, userId);
    return {
      message: 'Organization member accepted',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Post(':id/members/:userId/reject')
  async rejectMember(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Param('userId') userId: string) {
    const requesterId = this.getUserId(req);
    const organization = await this.organizationsService.rejectMember(id, requesterId, userId);
    return {
      message: 'Organization member rejected',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Patch(':id/members/:userId/reject')
  async rejectMemberPatch(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Param('userId') userId: string) {
    const requesterId = this.getUserId(req);
    const organization = await this.organizationsService.rejectMember(id, requesterId, userId);
    return {
      message: 'Organization member rejected',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Patch(':id/members/:userId')
  async updateMemberRole(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateOrganizationMemberDto,
  ) {
    const requesterId = this.getUserId(req);
    const organization = await this.organizationsService.updateMemberRole(id, requesterId, userId, dto.role);
    return {
      message: 'Organization member updated',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Patch(':id/members/:userId/role')
  async updateMemberRoleCompat(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateOrganizationMemberDto,
  ) {
    const requesterId = this.getUserId(req);
    const organization = await this.organizationsService.updateMemberRole(id, requesterId, userId, dto.role);
    return {
      message: 'Organization member updated',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('organizations.write')
  @Patch(':id')
  async updateOrganization(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    const requesterId = this.getUserId(req);
    const organization = await this.organizationsService.updateOrganization(id, requesterId, dto);
    return {
      message: 'Organization updated',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @Patch(':id/default')
  async setDefaultOrganization(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<ApiResponse<OrganizationDefaultResponse>> {
    const userId = this.getUserId(req);
    const user = await this.organizationsService.setDefaultOrganization(id, userId);
    return {
      message: 'Default organization updated',
      result: { user },
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @Delete(':id/leave')
  async leaveOrganization(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const organization = await this.organizationsService.leaveOrganization(id, userId);
    return {
      message: 'Organization membership removed',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('organizations.write')
  @Delete(':id')
  async deleteOrganization(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<ApiResponse<OrganizationDeleteResponse>> {
    const requesterId = this.getUserId(req);
    await this.organizationsService.deleteOrganization(id, requesterId);
    return {
      message: 'Organization removed',
      result: { success: true },
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Delete(':id/members/:userId')
  async removeMember(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Param('userId') userId: string) {
    const requesterId = this.getUserId(req);
    const organization = await this.organizationsService.removeMember(id, requesterId, userId);
    return {
      message: 'Organization member removed',
      result: organization,
    };
  }

  private getUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.sub ?? req.user?.id ?? req.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return userId;
  }
}
