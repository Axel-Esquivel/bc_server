import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { MODULE_CATALOG } from '../../core/constants/modules.catalog';
import { UsersService } from '../users/users.service';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';

export type WorkspaceRole = 'admin' | 'member';

export interface WorkspaceModuleState {
  key: string;
  enabled: boolean;
  enabledAt?: Date;
  enabledBy?: string;
}

export interface WorkspaceEntity {
  id: string;
  name: string;
  code: string;
  ownerUserId: string;
  members: { userId: string; role: WorkspaceRole }[];
  enabledModules: WorkspaceModuleState[];
  moduleSettings: Record<string, any>;
  setupCompleted: boolean;
  createdAt: Date;
}

interface WorkspacesState {
  workspaces: WorkspaceEntity[];
}

@Injectable()
export class WorkspacesService implements OnModuleInit {
  private readonly logger = new Logger(WorkspacesService.name);
  private readonly stateKey = 'module:workspaces';
  private workspaces: WorkspaceEntity[] = [];

  constructor(
    private readonly usersService: UsersService,
    private readonly moduleState: ModuleStateService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<WorkspacesState>(this.stateKey, { workspaces: [] });
    const normalized: WorkspaceEntity[] = [];
    (state.workspaces ?? []).forEach((workspace) => {
      const normalizedWorkspace = this.normalizeWorkspace(workspace, normalized);
      normalized.push(normalizedWorkspace);
    });
    this.workspaces = normalized;
    this.persistState();
  }

  createWorkspace(dto: CreateWorkspaceDto, ownerUserId: string): WorkspaceEntity {
    const workspace: WorkspaceEntity = {
      id: uuid(),
      name: dto.name,
      code: this.generateUniqueCode(),
      ownerUserId,
      members: [],
      enabledModules: [],
      moduleSettings: {},
      setupCompleted: false,
      createdAt: new Date(),
    };

    workspace.members.push({ userId: ownerUserId, role: 'admin' });
    this.usersService.addWorkspaceMembership(ownerUserId, {
      workspaceId: workspace.id,
      roles: ['admin'],
    });
    const owner = this.usersService.findById(ownerUserId);
    if (!owner.defaultWorkspaceId) {
      this.usersService.setDefaultWorkspace(ownerUserId, workspace.id);
    }

    this.workspaces.push(workspace);
    this.persistState();
    return workspace;
  }

  addMember(workspaceId: string, member: AddMemberDto) {
    const workspace = this.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const existing = workspace.members.find((m) => m.userId === member.userId);
    if (!existing) {
      workspace.members.push({ userId: member.userId, role: member.role });
    }

    this.usersService.addWorkspaceMembership(member.userId, {
      workspaceId: workspace.id,
      roles: [member.role],
    });

    this.persistState();
    return workspace;
  }

  getMemberRole(workspaceId: string, userId?: string): WorkspaceRole | null {
    if (!userId) {
      return null;
    }

    const workspace = this.getWorkspace(workspaceId);
    const member = workspace.members.find((item) => item.userId === userId);
    return member?.role ?? null;
  }

  getModulesOverview(workspaceId: string, userId: string) {
    const workspace = this.getWorkspace(workspaceId);
    const role = this.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new NotFoundException('Workspace membership not found');
    }

    return {
      availableModules: MODULE_CATALOG,
      enabledModules: workspace.enabledModules ?? [],
      userRole: role,
    };
  }

  updateWorkspaceModules(workspaceId: string, userId: string, updates: WorkspaceModuleState[]) {
    const workspace = this.getWorkspace(workspaceId);
    const now = new Date();
    const catalogKeys = new Set(MODULE_CATALOG.map((entry) => entry.key));
    const invalidKeys = updates
      .map((update) => update.key)
      .filter((key) => !catalogKeys.has(key));

    if (invalidKeys.length > 0) {
      throw new BadRequestException(`Invalid module keys: ${invalidKeys.join(', ')}`);
    }

    updates.forEach((update) => {
      const existing = workspace.enabledModules.find((module) => module.key === update.key);
      if (existing) {
        existing.enabled = update.enabled;
        if (update.enabled) {
          existing.enabledAt = now;
          existing.enabledBy = userId;
        } else {
          existing.enabledAt = undefined;
          existing.enabledBy = undefined;
        }
      } else {
        workspace.enabledModules.push({
          key: update.key,
          enabled: update.enabled,
          enabledAt: update.enabled ? now : undefined,
          enabledBy: update.enabled ? userId : undefined,
        });
      }
    });

    this.persistState();
    return workspace.enabledModules;
  }

  setEnabledModules(workspaceId: string, userId: string, enabledModules: string[]) {
    const workspace = this.getWorkspace(workspaceId);
    const now = new Date();
    const catalogKeys = new Set(MODULE_CATALOG.map((entry) => entry.key));
    const invalidKeys = enabledModules.filter((key) => !catalogKeys.has(key));

    if (invalidKeys.length > 0) {
      throw new BadRequestException(`Invalid module keys: ${invalidKeys.join(', ')}`);
    }

    const existing = new Map(workspace.enabledModules.map((module) => [module.key, module]));
    const next: WorkspaceModuleState[] = [];

    catalogKeys.forEach((key) => {
      const enabled = enabledModules.includes(key);
      const current = existing.get(key);
      if (current) {
        current.enabled = enabled;
        if (enabled) {
          current.enabledAt = current.enabledAt ?? now;
          current.enabledBy = userId;
        } else {
          current.enabledAt = undefined;
          current.enabledBy = undefined;
        }
        next.push(current);
        return;
      }

      next.push({
        key,
        enabled,
        enabledAt: enabled ? now : undefined,
        enabledBy: enabled ? userId : undefined,
      });
    });

    workspace.enabledModules = next;
    this.persistState();
    return workspace.enabledModules;
  }

  getEnabledModuleKeys(workspaceId: string): string[] {
    const workspace = this.getWorkspace(workspaceId);
    return workspace.enabledModules.filter((module) => module.enabled).map((module) => module.key);
  }

  getModuleSettings(workspaceId: string, moduleId: string): Record<string, any> {
    const workspace = this.getWorkspace(workspaceId);
    const enabled = workspace.enabledModules.some((module) => module.key === moduleId && module.enabled);
    if (!enabled) {
      throw new BadRequestException('Module not enabled');
    }

    return workspace.moduleSettings?.[moduleId] ?? {};
  }

  updateModuleSettings(workspaceId: string, moduleId: string, updates: Record<string, any>) {
    const workspace = this.getWorkspace(workspaceId);
    const enabled = workspace.enabledModules.some((module) => module.key === moduleId && module.enabled);
    if (!enabled) {
      throw new BadRequestException('Module not enabled');
    }

    workspace.moduleSettings = {
      ...(workspace.moduleSettings ?? {}),
      [moduleId]: {
        ...(workspace.moduleSettings?.[moduleId] ?? {}),
        ...(updates ?? {}),
      },
    };
    this.persistState();
    return workspace.moduleSettings[moduleId];
  }

  markSetupCompleted(workspaceId: string): WorkspaceEntity {
    const workspace = this.getWorkspace(workspaceId);
    workspace.setupCompleted = true;
    this.persistState();
    return workspace;
  }

  joinByCode(userId: string, code: string): WorkspaceEntity {
    const normalizedCode = code.trim().toUpperCase();
    const workspace = this.workspaces.find((item) => item.code === normalizedCode);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const existing = workspace.members.find((member) => member.userId === userId);
    if (!existing) {
      workspace.members.push({ userId, role: 'member' });
      this.usersService.addWorkspaceMembership(userId, {
        workspaceId: workspace.id,
        roles: ['member'],
      });
      const user = this.usersService.findById(userId);
      if (!user.defaultWorkspaceId) {
        this.usersService.setDefaultWorkspace(userId, workspace.id);
      }
      this.persistState();
    }

    return workspace;
  }

  listByUser(userId: string): WorkspaceEntity[] {
    return this.workspaces.filter((workspace) =>
      workspace.members.some((member) => member.userId === userId),
    );
  }

  getWorkspace(workspaceId: string): WorkspaceEntity {
    const workspace = this.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  private generateUniqueCode(existing: WorkspaceEntity[] = this.workspaces): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code =
        Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join(
          '',
        ) +
        '-' +
        Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');

      if (!existing.some((workspace) => workspace.code === code)) {
        return code;
      }
    }

    return `${uuid().slice(0, 4).toUpperCase()}-${uuid()
      .slice(9, 13)
      .toUpperCase()}`;
  }

  private normalizeWorkspace(raw: any, existing: WorkspaceEntity[]): WorkspaceEntity {
    const members = Array.isArray(raw.members)
      ? raw.members.map((member: any) => {
          if (member?.role === 'admin' || member?.role === 'member') {
            return { userId: member.userId, role: member.role as WorkspaceRole };
          }
          if (Array.isArray(member?.roles)) {
            const role = member.roles.includes('admin') || member.roles.includes('owner') ? 'admin' : 'member';
            return { userId: member.userId, role };
          }
          return { userId: member.userId, role: 'member' as WorkspaceRole };
        })
      : [];

    const rawModules = Array.isArray(raw.enabledModules)
      ? raw.enabledModules
      : Array.isArray(raw.modules)
        ? raw.modules
        : [];

    const enabledModules =
      typeof rawModules[0] === 'string'
        ? rawModules.map((key: string) => ({
            key,
            enabled: true,
            enabledAt: undefined,
            enabledBy: undefined,
          }))
        : rawModules
            .filter((module: any) => typeof module?.key === 'string')
            .map((module: any) => ({
              key: module.key,
              enabled: Boolean(module.enabled),
              enabledAt: module.enabledAt ? new Date(module.enabledAt) : undefined,
              enabledBy: module.enabledBy,
            }));
    const ownerUserId =
      raw.ownerUserId || members.find((member) => member.role === 'admin')?.userId || members[0]?.userId || 'unknown';

    return {
      id: raw.id || uuid(),
      name: raw.name || 'Workspace',
      code: raw.code || this.generateUniqueCode(existing),
      ownerUserId,
      members,
      enabledModules,
      moduleSettings: raw.moduleSettings ?? {},
      setupCompleted: raw.setupCompleted ?? raw.isInitialized ?? false,
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    };
  }

  private persistState() {
    void this.moduleState
      .saveState<WorkspacesState>(this.stateKey, { workspaces: this.workspaces })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist workspaces: ${message}`);
      });
  }
}
