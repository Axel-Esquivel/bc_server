import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { InviteOrganizationMemberDto } from './dto/invite-organization-member.dto';
import { JoinOrganizationDto } from './dto/join-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationPermission } from './decorators/organization-permission.decorator';
import { OrganizationAdminGuard } from './guards/organization-admin.guard';
import { OrganizationMemberGuard } from './guards/organization-member.guard';
import { OrganizationsService } from './organizations.service';
import type { OrganizationRole } from './entities/organization.entity';

class UpdateOrganizationMemberDto {
  @IsString()
  role!: OrganizationRole;
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
  constructor(private readonly organizationsService: OrganizationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateOrganizationDto) {
    const userId = req.user?.sub ?? req.user?.id ?? req.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const organization = this.organizationsService.createOrganization(dto, userId);
    return {
      message: 'Organization created',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Req() req: any) {
    const organizations = this.organizationsService.listByUser(req.user.sub);
    return {
      message: 'Organizations loaded',
      result: organizations,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @Get(':id')
  getOne(@Param('id') id: string) {
    const organization = this.organizationsService.getOrganization(id);
    return {
      message: 'Organization loaded',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @Get(':id/roles')
  listRoles(@Param('id') id: string) {
    const roles = this.organizationsService.listRoles(id);
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
  @OrganizationPermission('roles.write')
  @Post(':id/roles')
  createRole(@Req() req: any, @Param('id') id: string, @Body() dto: OrganizationRoleDto) {
    const roles = this.organizationsService.createRole(id, req.user.sub, dto);
    return {
      message: 'Organization role created',
      result: roles,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('roles.write')
  @Patch(':id/roles/:roleKey')
  updateRole(
    @Req() req: any,
    @Param('id') id: string,
    @Param('roleKey') roleKey: string,
    @Body() dto: UpdateOrganizationRoleDto,
  ) {
    const roles = this.organizationsService.updateRole(id, req.user.sub, roleKey, dto);
    return {
      message: 'Organization role updated',
      result: roles,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('roles.write')
  @Delete(':id/roles/:roleKey')
  deleteRole(@Req() req: any, @Param('id') id: string, @Param('roleKey') roleKey: string) {
    const roles = this.organizationsService.deleteRole(id, req.user.sub, roleKey);
    return {
      message: 'Organization role removed',
      result: roles,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @Get(':id/workspaces')
  async listWorkspaces(
    @Param('id') id: string,
  ): Promise<{ message: string; result: Array<Record<string, any>> }> {
    const workspaces = await this.organizationsService.listWorkspaces(id);
    return {
      message: 'Organization workspaces loaded',
      result: workspaces,
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
  inviteMember(@Req() req: any, @Param('id') id: string, @Body() dto: InviteOrganizationMemberDto) {
    const organization = this.organizationsService.addMemberByEmail(id, req.user.sub, dto.email, dto.roleKey);
    return {
      message: 'Organization member invited',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  requestJoin(@Req() req: any, @Param('id') id: string, @Body() dto: JoinOrganizationDto) {
    const organization = this.organizationsService.requestJoin(id, req.user.sub, dto.roleKey);
    return {
      message: 'Organization join requested',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Post(':id/members')
  addMember(@Req() req: any, @Param('id') id: string, @Body() dto: AddOrganizationMemberDto) {
    const organization = this.organizationsService.addMemberByEmail(id, req.user.sub, dto.email, dto.role);
    return {
      message: 'Organization member added',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Post(':id/members/:userId/accept')
  acceptMember(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    const organization = this.organizationsService.acceptMember(id, req.user.sub, userId);
    return {
      message: 'Organization member accepted',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Post(':id/members/:userId/reject')
  rejectMember(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    const organization = this.organizationsService.rejectMember(id, req.user.sub, userId);
    return {
      message: 'Organization member rejected',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Patch(':id/members/:userId')
  updateMemberRole(
    @Req() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateOrganizationMemberDto,
  ) {
    const organization = this.organizationsService.updateMemberRole(id, req.user.sub, userId, dto.role);
    return {
      message: 'Organization member updated',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Patch(':id/members/:userId/role')
  updateMemberRoleCompat(
    @Req() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateOrganizationMemberDto,
  ) {
    const organization = this.organizationsService.updateMemberRole(id, req.user.sub, userId, dto.role);
    return {
      message: 'Organization member updated',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('organizations.write')
  @Patch(':id')
  updateOrganization(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    const organization = this.organizationsService.updateOrganization(id, req.user.sub, dto);
    return {
      message: 'Organization updated',
      result: organization,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizationAdminGuard)
  @OrganizationPermission('users.write')
  @Delete(':id/members/:userId')
  removeMember(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    const organization = this.organizationsService.removeMember(id, req.user.sub, userId);
    return {
      message: 'Organization member removed',
      result: organization,
    };
  }
}
