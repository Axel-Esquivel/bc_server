import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { JoinWorkspaceDto } from './dto/join-workspace.dto';
import { UpdateWorkspaceModulesDto } from './dto/update-workspace-modules.dto';
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

    const modules = this.workspacesService.updateWorkspaceModules(id, req.user.sub, dto.modules ?? []);
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
}
