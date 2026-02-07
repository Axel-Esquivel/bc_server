import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyPermission } from './decorators/company-permission.decorator';
import { AddCompanyMemberDto } from './dto/add-company-member.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { ListOrganizationCompaniesDto } from './dto/list-organization-companies.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateCompanyMemberRoleDto } from './dto/update-company-member-role.dto';
import { CompaniesService } from './companies.service';
import { CompanyMemberGuard } from './guards/company-member.guard';
import { CompanyPermissionGuard } from './guards/company-permission.guard';

@Controller()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('organizations/:orgId/companies')
  async create(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateCompanyDto,
  ) {
    const company = await this.companiesService.createCompany(orgId, req.user.sub, dto);
    return {
      message: 'Company created',
      result: company,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('organizations/:orgId/companies')
  async list(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Query() query: ListOrganizationCompaniesDto,
  ) {
    const companies = await this.companiesService.listByOrganization(orgId, req.user.sub, query.countryId);
    return {
      message: 'Companies loaded',
      result: companies,
    };
  }

  @UseGuards(JwtAuthGuard, CompanyMemberGuard)
  @Get('companies/:id')
  getOne(@Param('id') id: string) {
    const company = this.companiesService.getCompany(id);
    return {
      message: 'Company loaded',
      result: company,
    };
  }

  @UseGuards(JwtAuthGuard, CompanyMemberGuard)
  @Get('companies/:id/modules')
  getModules(@Req() req: any, @Param('id') id: string) {
    const overview = this.companiesService.getModulesOverview(id, req.user.sub);
    return {
      message: 'Company modules loaded',
      result: overview,
    };
  }

  @UseGuards(JwtAuthGuard, CompanyPermissionGuard)
  @CompanyPermission('company.manage')
  @Patch('companies/:id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    const company = await this.companiesService.updateCompany(id, req.user.sub, dto);
    return {
      message: 'Company updated',
      result: company,
    };
  }

  @UseGuards(JwtAuthGuard, CompanyPermissionGuard)
  @CompanyPermission('modules.enable')
  @Post('companies/:id/modules/:moduleKey/enable')
  enableModule(
    @Req() req: any,
    @Param('id') id: string,
    @Param('moduleKey') moduleKey: string,
  ) {
    const states = this.companiesService.enableModule(id, moduleKey, req.user.sub);
    return {
      message: 'Company module enabled',
      result: states,
    };
  }

  @UseGuards(JwtAuthGuard, CompanyPermissionGuard)
  @CompanyPermission('modules.configure')
  @Post('companies/:id/modules/:moduleKey/configure')
  configureModule(
    @Req() req: any,
    @Param('id') id: string,
    @Param('moduleKey') moduleKey: string,
    @Body() dto: Record<string, any>,
  ) {
    const settings = this.companiesService.configureModule(id, moduleKey, req.user.sub, dto);
    return {
      message: 'Company module configured',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, CompanyPermissionGuard)
  @CompanyPermission('company.invite')
  @Post('companies/:id/members')
  async addMember(@Req() req: any, @Param('id') id: string, @Body() dto: AddCompanyMemberDto) {
    const company = await this.companiesService.addMember(id, req.user.sub, dto);
    return {
      message: 'Company member added',
      result: company,
    };
  }

  @UseGuards(JwtAuthGuard, CompanyPermissionGuard)
  @CompanyPermission('roles.manage')
  @Patch('companies/:id/members/:userId/role')
  updateMemberRole(
    @Req() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateCompanyMemberRoleDto,
  ) {
    const member = this.companiesService.updateMemberRole(id, req.user.sub, userId, dto.roleKey);
    return {
      message: 'Company member updated',
      result: member,
    };
  }
}
