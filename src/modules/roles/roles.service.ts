import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateRoleDto } from './dto/create-role.dto';

export interface RoleEntity {
  id: string;
  name: string;
  permissions: string[];
  workspaceId?: string;
}

interface RolesState {
  roles: RoleEntity[];
}

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);
  private readonly stateKey = 'module:roles';
  private roles: RoleEntity[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<RolesState>(this.stateKey, { roles: [] });
    this.roles = state.roles ?? [];
  }

  createRole(dto: CreateRoleDto): RoleEntity {
    const role: RoleEntity = {
      id: uuid(),
      name: dto.name,
      permissions: dto.permissions,
      workspaceId: dto.workspaceId,
    };

    this.roles.push(role);
    this.persistState();
    return role;
  }

  assignPermissions(roleId: string, permissions: string[]): RoleEntity {
    const role = this.roles.find((item) => item.id === roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const merged = new Set([...role.permissions, ...permissions]);
    role.permissions = Array.from(merged);
    this.persistState();
    return role;
  }

  getRoleByName(name: string, workspaceId?: string): RoleEntity | undefined {
    return this.roles.find(
      (role) => role.name === name && (!workspaceId || role.workspaceId === workspaceId),
    );
  }

  getRoleById(roleId: string): RoleEntity {
    const role = this.roles.find((item) => item.id === roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  private persistState() {
    void this.moduleState
      .saveState<RolesState>(this.stateKey, { roles: this.roles })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist roles: ${message}`);
      });
  }
}
