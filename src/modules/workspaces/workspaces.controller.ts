import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { JoinWorkspaceDto } from './dto/join-workspace.dto';
import { UpdateWorkspaceModulesDto } from './dto/update-workspace-modules.dto';
import { CreatePosTerminalDto, UpdatePosTerminalDto } from './dto/pos-terminal.dto';
import { UpdateInventorySettingsDto } from './dto/inventory-settings.dto';
import { UpdateAccountingDefaultsDto } from './dto/accounting-defaults.dto';
import { CreateAccountingTaxDto, UpdateAccountingTaxDto } from './dto/accounting-tax.dto';
import {
  CreateAccountingCategoryMappingDto,
  UpdateAccountingCategoryMappingDto,
} from './dto/accounting-category-mapping.dto';
import { WorkspaceAdminGuard } from './guards/workspace-admin.guard';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { WorkspacesService } from './workspaces.service';
import { UsersService } from '../users/users.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Req() req: any) {
    const workspaces = this.workspacesService.listByUser(req.user.sub);
    const user = this.usersService.findById(req.user.sub);
    return {
      message: 'Workspaces loaded',
      result: {
        workspaces,
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
      result: workspace,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('join')
  join(@Req() req: any, @Body() dto: JoinWorkspaceDto) {
    const workspace = this.workspacesService.joinByCode(req.user.sub, dto.code);
    return {
      message: 'Workspace joined',
      result: workspace,
    };
  }

  @UseGuards(JwtAuthGuard, WorkspaceAdminGuard)
  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    const workspace = this.workspacesService.addMember(id, dto);
    return {
      message: 'Member added to workspace',
      result: workspace,
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
        configured: false,
      }))
    );
    return {
      message: 'Workspace modules updated',
      result: modules,
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
