import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createWorkspace(@Body() dto: CreateWorkspaceDto) {
    const workspace = this.workspacesService.createWorkspace(dto);
    return {
      message: 'Workspace created',
      result: workspace,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    const workspace = this.workspacesService.addMember(id, dto);
    return {
      message: 'Member added to workspace',
      result: workspace,
    };
  }
}
