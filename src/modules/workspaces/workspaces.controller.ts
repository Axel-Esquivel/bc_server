import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { JoinWorkspaceDto } from './dto/join-workspace.dto';
import { UpdateWorkspaceModulesDto } from './dto/update-workspace-modules.dto';
import { CreatePosTerminalDto, UpdatePosTerminalDto } from './dto/pos-terminal.dto';
import { UpdateInventorySettingsDto } from './dto/inventory-settings.dto';
import { UpdateAccountingDefaultsDto } from './dto/accounting-defaults.dto';
import { CreateAccountingTaxDto, UpdateAccountingTaxDto } from './dto/accounting-tax.dto';
import { WorkspaceCoreSettingsDto } from './dto/workspace-core-settings.dto';
import {
  CreateAccountingCategoryMappingDto,
  UpdateAccountingCategoryMappingDto,
} from './dto/accounting-category-mapping.dto';
import { WorkspaceAdminGuard } from './guards/workspace-admin.guard';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { WorkspacePermissionGuard } from './guards/workspace-permission.guard';
import { WorkspacesService } from './workspaces.service';
import { UsersService } from '../users/users.service';
import { WorkspacePermission } from './decorators/workspace-permission.decorator';

class WorkspaceRoleDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

class UpdateWorkspaceRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

class UpdateMemberRoleDto {
  @IsString()
  roleKey!: string;
}

@Controller('workspaces')
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly usersService: UsersService,
  ) {}

  private decorateCompat(result: { id: string } | Array<{ id: string }>) {
    if (!this.workspacesService.isCompatMode()) {
      return result;
    }

    if (Array.isArray(result)) {
      return result.map((item) => ({
        ...item,
        workspaceId: item.id,
        companyId: item.id,
      }));
    }

    return {
      ...result,
      workspaceId: result.id,
      companyId: result.id,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Req() req: any) {
    const workspaces = this.workspacesService.listByUser(req.user.sub);
    const user = this.usersService.findById(req.user.sub);
    return {
      message: 'Workspaces loaded',
      result: {
        workspaces: this.decorateCompat(workspaces),
        defaultWorkspaceId: user.defaultWorkspaceId,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  createWorkspace(@Req() req: any, @Body() dto: CreateWorkspaceDto) {
    const workspace = this.workspacesService.createWorkspace(dto, req.user.sub);
    return {
      message: 'Workspace created',
      result: this.decorateCompat(workspace),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('join')
  join(@Req() req: any, @Body() dto: JoinWorkspaceDto) {
    const workspace = this.workspacesService.joinByCode(req.user.sub, dto.code);
    return {
      message: 'Workspace joined',
      result: this.decorateCompat(workspace),
    };
  }

  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @WorkspacePermission('workspace.invite')
  @Post(':id/members')
  addMember(@Req() req: any, @Param('id') id: string, @Body() dto: AddMemberDto) {
    const workspace = this.workspacesService.addMember(id, dto, req.user.sub);
    return {
      message: 'Member added to workspace',
      result: workspace,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @WorkspacePermission('roles.manage')
  @Patch(':id/members/:userId/role')
  updateMemberRole(
    @Req() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const member = this.workspacesService.updateMemberRole(id, req.user.sub, userId, dto.roleKey);
    return {
      message: 'Workspace member updated',
      result: member,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @WorkspacePermission('roles.manage')
  @Get(':id/roles')
  listRoles(@Param('id') id: string) {
    const roles = this.workspacesService.listRoles(id);
    return {
      message: 'Workspace roles loaded',
      result: roles,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @WorkspacePermission('roles.manage')
  @Post(':id/roles')
  createRole(@Req() req: any, @Param('id') id: string, @Body() dto: WorkspaceRoleDto) {
    const roles = this.workspacesService.createRole(id, req.user.sub, dto);
    return {
      message: 'Workspace role created',
      result: roles,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @WorkspacePermission('roles.manage')
  @Patch(':id/roles/:roleKey')
  updateRole(
    @Req() req: any,
    @Param('id') id: string,
    @Param('roleKey') roleKey: string,
    @Body() dto: UpdateWorkspaceRoleDto,
  ) {
    const roles = this.workspacesService.updateRole(id, req.user.sub, roleKey, dto);
    return {
      message: 'Workspace role updated',
      result: roles,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @WorkspacePermission('roles.manage')
  @Delete(':id/roles/:roleKey')
  deleteRole(@Req() req: any, @Param('id') id: string, @Param('roleKey') roleKey: string) {
    const roles = this.workspacesService.deleteRole(id, req.user.sub, roleKey);
    return {
      message: 'Workspace role removed',
      result: roles,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
  @Get(':id/modules')
  getModules(@Req() req: any, @Param('id') id: string) {
    const overview = this.workspacesService.getModulesOverview(id, req.user.sub);
    return {
      message: 'Workspace modules loaded',
      result: {
        ...overview,
        enabledModuleKeys: this.workspacesService.getEnabledModuleKeys(id),
      },
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
  @Get(':id/settings/core')
  getCoreSettings(@Param('id') id: string) {
    const settings = this.workspacesService.getCoreSettings(id);
    return {
      message: 'Workspace core settings loaded',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @WorkspacePermission('workspace.manage')
  @Patch(':id/settings/core')
  updateCoreSettings(@Param('id') id: string, @Body() dto: WorkspaceCoreSettingsDto) {
    const settings = this.workspacesService.updateCoreSettings(id, dto);
    return {
      message: 'Workspace core settings updated',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Patch(':id/modules')
  updateModules(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateWorkspaceModulesDto) {
    if (dto.enabledModules !== undefined) {
      const modules = this.workspacesService.setEnabledModules(id, req.user.sub, dto.enabledModules);
      return {
        message: 'Workspace modules updated',
        result: modules,
      };
    }

    const modules = this.workspacesService.updateWorkspaceModules(
      id,
      req.user.sub,
      (dto.modules ?? []).map((module) => ({
        key: module.key,
        enabled: module.enabled,
      }))
    );
    return {
      message: 'Workspace modules updated',
      result: modules,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Post(':id/modules/:moduleKey/enable')
  enableModule(@Req() req: any, @Param('id') id: string, @Param('moduleKey') moduleKey: string) {
    const moduleState = this.workspacesService.enableModule(id, req.user.sub, moduleKey);
    return {
      message: 'Workspace module enabled',
      result: moduleState,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Post(':id/modules/:moduleKey/configure')
  configureModule(@Req() req: any, @Param('id') id: string, @Param('moduleKey') moduleKey: string) {
    const moduleState = this.workspacesService.configureModule(id, req.user.sub, moduleKey);
    return {
      message: 'Workspace module configured',
      result: moduleState,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
  @Get(':id/module-settings/:moduleId')
  getModuleSettings(@Param('id') id: string, @Param('moduleId') moduleId: string) {
    const settings = this.workspacesService.getModuleSettings(id, moduleId);
    return {
      message: 'Module settings loaded',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Patch(':id/module-settings/:moduleId')
  updateModuleSettings(@Param('id') id: string, @Param('moduleId') moduleId: string, @Body() body: Record<string, any>) {
    const settings = this.workspacesService.updateModuleSettings(id, moduleId, body ?? {});
    return {
      message: 'Module settings updated',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Patch(':id/setup-complete')
  markSetupComplete(@Param('id') id: string) {
    const workspace = this.workspacesService.markSetupCompleted(id);
    return {
      message: 'Workspace setup completed',
      result: workspace,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
  @Get(':id/inventory/settings')
  getInventorySettings(@Param('id') id: string) {
    const settings = this.workspacesService.getInventorySettings(id);
    return {
      message: 'Inventory settings loaded',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Patch(':id/inventory/settings')
  updateInventorySettings(@Param('id') id: string, @Body() dto: UpdateInventorySettingsDto) {
    const settings = this.workspacesService.updateInventorySettings(id, dto);
    return {
      message: 'Inventory settings updated',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
  @Get(':id/accounting/defaults')
  getAccountingDefaults(@Param('id') id: string) {
    const defaults = this.workspacesService.getAccountingDefaults(id);
    return {
      message: 'Accounting defaults loaded',
      result: defaults,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Patch(':id/accounting/defaults')
  updateAccountingDefaults(@Param('id') id: string, @Body() dto: UpdateAccountingDefaultsDto) {
    const defaults = this.workspacesService.updateAccountingDefaults(id, dto);
    return {
      message: 'Accounting defaults updated',
      result: defaults,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
  @Get(':id/accounting/taxes')
  listAccountingTaxes(@Param('id') id: string) {
    const taxes = this.workspacesService.listAccountingTaxes(id);
    return {
      message: 'Accounting taxes loaded',
      result: taxes,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Post(':id/accounting/taxes')
  createAccountingTax(@Param('id') id: string, @Body() dto: CreateAccountingTaxDto) {
    const tax = this.workspacesService.createAccountingTax(id, dto);
    return {
      message: 'Accounting tax created',
      result: tax,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Patch(':id/accounting/taxes/:taxId')
  updateAccountingTax(
    @Param('id') id: string,
    @Param('taxId') taxId: string,
    @Body() dto: UpdateAccountingTaxDto
  ) {
    const tax = this.workspacesService.updateAccountingTax(id, taxId, dto);
    return {
      message: 'Accounting tax updated',
      result: tax,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Delete(':id/accounting/taxes/:taxId')
  deleteAccountingTax(@Param('id') id: string, @Param('taxId') taxId: string) {
    const result = this.workspacesService.deleteAccountingTax(id, taxId);
    return {
      message: 'Accounting tax removed',
      result,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
  @Get(':id/accounting/category-mappings')
  listAccountingCategoryMappings(@Param('id') id: string) {
    const mappings = this.workspacesService.listAccountingCategoryMappings(id);
    return {
      message: 'Accounting category mappings loaded',
      result: mappings,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Post(':id/accounting/category-mappings')
  createAccountingCategoryMapping(
    @Param('id') id: string,
    @Body() dto: CreateAccountingCategoryMappingDto
  ) {
    const mapping = this.workspacesService.createAccountingCategoryMapping(id, dto);
    return {
      message: 'Accounting category mapping created',
      result: mapping,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Patch(':id/accounting/category-mappings/:mappingId')
  updateAccountingCategoryMapping(
    @Param('id') id: string,
    @Param('mappingId') mappingId: string,
    @Body() dto: UpdateAccountingCategoryMappingDto
  ) {
    const mapping = this.workspacesService.updateAccountingCategoryMapping(id, mappingId, dto);
    return {
      message: 'Accounting category mapping updated',
      result: mapping,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Delete(':id/accounting/category-mappings/:mappingId')
  deleteAccountingCategoryMapping(
    @Param('id') id: string,
    @Param('mappingId') mappingId: string
  ) {
    const result = this.workspacesService.deleteAccountingCategoryMapping(id, mappingId);
    return {
      message: 'Accounting category mapping removed',
      result,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
  @Get(':id/pos/terminals')
  listPosTerminals(@Param('id') id: string) {
    const settings = this.workspacesService.listPosTerminals(id);
    return {
      message: 'POS terminals loaded',
      result: settings,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Post(':id/pos/terminals')
  createPosTerminal(@Param('id') id: string, @Body() dto: CreatePosTerminalDto) {
    const terminal = this.workspacesService.createPosTerminal(id, dto);
    return {
      message: 'POS terminal created',
      result: terminal,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Patch(':id/pos/terminals/:terminalId')
  updatePosTerminal(
    @Param('id') id: string,
    @Param('terminalId') terminalId: string,
    @Body() dto: UpdatePosTerminalDto
  ) {
    const terminal = this.workspacesService.updatePosTerminal(id, terminalId, dto);
    return {
      message: 'POS terminal updated',
      result: terminal,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Delete(':id/pos/terminals/:terminalId')
  deletePosTerminal(@Param('id') id: string, @Param('terminalId') terminalId: string) {
    const result = this.workspacesService.deletePosTerminal(id, terminalId);
    return {
      message: 'POS terminal removed',
      result,
    };
  }
}
