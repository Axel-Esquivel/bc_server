import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreateRoleDto } from './dto/create-role.dto';

export interface RoleEntity {
  id: string;
  name: string;
  permissions: string[];
  workspaceId?: string;
}

@Injectable()
export class RolesService {
  private readonly roles: RoleEntity[] = [];

  createRole(dto: CreateRoleDto): RoleEntity {
    const role: RoleEntity = {
      id: uuid(),
      name: dto.name,
      permissions: dto.permissions,
      workspaceId: dto.workspaceId,
    };

    this.roles.push(role);
    return role;
  }

  assignPermissions(roleId: string, permissions: string[]): RoleEntity {
    const role = this.roles.find((item) => item.id === roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const merged = new Set([...role.permissions, ...permissions]);
    role.permissions = Array.from(merged);
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
}
