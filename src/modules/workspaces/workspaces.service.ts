import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { UsersService } from '../users/users.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';

export interface WorkspaceEntity {
  id: string;
  name: string;
  members: { userId: string; roles: string[] }[];
  createdAt: Date;
}

@Injectable()
export class WorkspacesService {
  private readonly workspaces: WorkspaceEntity[] = [];

  constructor(private readonly usersService: UsersService) {}

  createWorkspace(dto: CreateWorkspaceDto): WorkspaceEntity {
    const workspace: WorkspaceEntity = {
      id: uuid(),
      name: dto.name,
      members: [],
      createdAt: new Date(),
    };

    if (dto.ownerUserId) {
      workspace.members.push({ userId: dto.ownerUserId, roles: ['owner'] });
      this.usersService.addWorkspaceMembership(dto.ownerUserId, {
        workspaceId: workspace.id,
        roles: ['owner'],
      });
    }

    this.workspaces.push(workspace);
    return workspace;
  }

  addMember(workspaceId: string, member: AddMemberDto) {
    const workspace = this.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const existing = workspace.members.find((m) => m.userId === member.userId);
    if (existing) {
      existing.roles = Array.from(new Set([...existing.roles, ...member.roles]));
    } else {
      workspace.members.push({ userId: member.userId, roles: member.roles });
    }

    this.usersService.addWorkspaceMembership(member.userId, {
      workspaceId: workspace.id,
      roles: member.roles,
    });

    return workspace;
  }

  getWorkspace(workspaceId: string): WorkspaceEntity {
    const workspace = this.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }
}
