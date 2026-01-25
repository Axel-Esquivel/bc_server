import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { MODULE_CATALOG, ModuleCatalogEntry } from '../../core/constants/modules.catalog';
import { UsersService } from '../users/users.service';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { WorkspaceModuleSettingsService } from './workspace-module-settings.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import {
  WorkspaceBranchDto,
  WorkspaceCompanyDto,
  WorkspaceCoreSettingsDto,
  WorkspaceCurrencyDto,
  WorkspaceWarehouseDto,
} from './dto/workspace-core-settings.dto';
import {
  CreatePosTerminalDto,
  PosTerminal,
  PosTerminalSettings,
  UpdatePosTerminalDto,
} from './dto/pos-terminal.dto';
import { InventorySettings, UpdateInventorySettingsDto } from './dto/inventory-settings.dto';
import { AccountingDefaults, UpdateAccountingDefaultsDto } from './dto/accounting-defaults.dto';
import { AccountingService } from '../accounting/accounting.service';
import { ModuleLoaderService } from '../module-loader/module-loader.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CompaniesService } from '../companies/companies.service';
import {
  AccountingTax,
  CreateAccountingTaxDto,
  UpdateAccountingTaxDto,
} from './dto/accounting-tax.dto';
import {
  AccountingCategoryMapping,
  CreateAccountingCategoryMappingDto,
  UpdateAccountingCategoryMappingDto,
} from './dto/accounting-category-mapping.dto';

export type WorkspaceRoleKey = string;
export type WorkspaceMemberStatus = 'active' | 'invited' | 'disabled';
export type WorkspaceModuleStatus =
  | 'inactive'
  | 'enabled'
  | 'pendingConfig'
  | 'configured'
  | 'ready'
  | 'error';

export interface WorkspaceModuleState {
  key: string;
  enabled: boolean;
  configured: boolean;
  status: WorkspaceModuleStatus;
  enabledAt?: Date;
  enabledBy?: string;
}

export interface WorkspaceRoleDefinition {
  key: WorkspaceRoleKey;
  name: string;
  permissions: string[];
}

export interface WorkspaceMember {
  userId: string;
  roleKey: WorkspaceRoleKey;
  status: WorkspaceMemberStatus;
}

export interface WorkspaceEntity {
  id: string;
  name: string;
  code: string;
  organizationId: string;
  countryId: string;
  baseCurrencyId?: string;
  ownerUserId: string;
  roles: WorkspaceRoleDefinition[];
  members: WorkspaceMember[];
  enabledModules: WorkspaceModuleState[];
  moduleSettings: Record<string, any>;
  setupCompleted: boolean;
  createdAt: Date;
}

export interface WorkspaceCoreSettings {
  countryId?: string;
  baseCurrencyId?: string;
  currencyIds: string[];
  companies: WorkspaceCompanyDto[];
  branches: WorkspaceBranchDto[];
  warehouses: WorkspaceWarehouseDto[];
}

interface WorkspacesState {
  workspaces: WorkspaceEntity[];
}

@Injectable()
export class WorkspacesService implements OnModuleInit {
  private readonly logger = new Logger(WorkspacesService.name);
  private readonly stateKey = 'module:workspaces';
  private workspaces: WorkspaceEntity[] = [];
  private readonly compatMode = process.env.WORKSPACES_COMPANY_COMPAT !== 'false';
  private readonly compatWarnings = new Set<string>();
  private readonly basePermissions = [
    'workspace.manage',
    'workspace.invite',
    'roles.manage',
    'modules.enable',
    'modules.configure',
    'workspaces.configure',
  ];

  constructor(
    private readonly usersService: UsersService,
    private readonly moduleState: ModuleStateService,
    private readonly moduleSettings: WorkspaceModuleSettingsService,
    private readonly warehousesService: WarehousesService,
    private readonly accountingService: AccountingService,
    private readonly moduleLoader: ModuleLoaderService,
    private readonly organizationsService: OrganizationsService,
    private readonly companiesService: CompaniesService,
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
    if (this.compatMode) {
      this.warnCompat('createWorkspace');
      const company = this.companiesService.createCompany(dto.organizationId, ownerUserId, {
        name: dto.name,
        baseCountryId: dto.countryId,
        baseCurrencyId: dto.baseCurrencyId ?? 'unknown',
        currencies: dto.baseCurrencyId ? [dto.baseCurrencyId] : undefined,
      });
      this.usersService.addWorkspaceMembership(ownerUserId, {
        workspaceId: company.id,
        roles: ['admin'],
      });
      const owner = this.usersService.findById(ownerUserId);
      if (!owner.defaultWorkspaceId) {
        this.usersService.setDefaultWorkspace(ownerUserId, company.id);
      }
      return this.mapCompanyToWorkspace(company);
    }

    const role = this.organizationsService.getMemberRole(dto.organizationId, ownerUserId);
    if (!role) {
      throw new BadRequestException('Organization membership not found');
    }

    const workspace: WorkspaceEntity = {
      id: uuid(),
      name: dto.name,
      code: this.generateUniqueCode(),
      organizationId: dto.organizationId,
      countryId: dto.countryId,
      baseCurrencyId: dto.baseCurrencyId,
      ownerUserId,
      roles: this.buildDefaultRoles(),
      members: [],
      enabledModules: [],
      moduleSettings: {},
      setupCompleted: false,
      createdAt: new Date(),
    };

    workspace.members.push({ userId: ownerUserId, roleKey: 'admin', status: 'active' });
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

  addMember(workspaceId: string, member: AddMemberDto, requesterId?: string) {
    if (this.compatMode) {
      this.warnCompat('addMember');
      const company = this.companiesService.addMember(workspaceId, requesterId ?? 'unknown', {
        userId: member.userId,
        roleKey: member.roleKey ?? member.role ?? 'member',
      });
      this.usersService.addWorkspaceMembership(member.userId, {
        workspaceId,
        roles: [member.roleKey ?? member.role ?? 'member'],
      });
      return company;
    }

    const workspace = this.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const roleKey = member.roleKey ?? member.role;
    if (!roleKey) {
      throw new BadRequestException('Role key is required');
    }
    this.ensureRoleExists(workspace, roleKey);

    const existing = workspace.members.find((m) => m.userId === member.userId);
    if (!existing) {
      workspace.members.push({ userId: member.userId, roleKey, status: 'active' });
    }

    this.usersService.addWorkspaceMembership(member.userId, {
      workspaceId: workspace.id,
      roles: [roleKey],
    });

    this.persistState();
    return workspace;
  }

  getMemberRole(workspaceId: string, userId?: string): WorkspaceRoleKey | null {
    const member = this.getMember(workspaceId, userId);
    if (!member || member.status !== 'active') {
      return null;
    }
    return member.roleKey ?? null;
  }

  listRoles(workspaceId: string): WorkspaceRoleDefinition[] {
    if (this.compatMode) {
      this.warnCompat('listRoles');
      return this.companiesService.listRoles(workspaceId) as WorkspaceRoleDefinition[];
    }

    const workspace = this.getWorkspace(workspaceId);
    return workspace.roles.map((role) => ({ ...role, permissions: [...role.permissions] }));
  }

  createRole(
    workspaceId: string,
    userId: string,
    payload: { key: string; name: string; permissions: string[] },
  ): WorkspaceRoleDefinition[] {
    if (this.compatMode) {
      this.warnCompat('createRole');
      return this.companiesService.createRole(workspaceId, userId, payload) as WorkspaceRoleDefinition[];
    }

    const workspace = this.getWorkspace(workspaceId);
    this.assertPermission(workspaceId, userId, 'roles.manage');

    const key = payload.key.trim();
    if (!key) {
      throw new BadRequestException('Role key is required');
    }
    if (workspace.roles.some((role) => role.key === key)) {
      throw new BadRequestException('Role key already exists');
    }

    workspace.roles.push({
      key,
      name: payload.name.trim(),
      permissions: this.normalizePermissions(payload.permissions),
    });
    this.persistState();
    return this.listRoles(workspaceId);
  }

  updateRole(
    workspaceId: string,
    userId: string,
    roleKey: string,
    payload: { name?: string; permissions?: string[] },
  ): WorkspaceRoleDefinition[] {
    if (this.compatMode) {
      this.warnCompat('updateRole');
      return this.companiesService.updateRole(workspaceId, userId, roleKey, payload) as WorkspaceRoleDefinition[];
    }

    const workspace = this.getWorkspace(workspaceId);
    this.assertPermission(workspaceId, userId, 'roles.manage');

    const role = workspace.roles.find((item) => item.key === roleKey);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (payload.name !== undefined) {
      role.name = payload.name.trim();
    }
    if (payload.permissions !== undefined) {
      role.permissions =
        role.key === 'admin'
          ? this.basePermissions.slice()
          : this.normalizePermissions(payload.permissions);
    }

    this.persistState();
    return this.listRoles(workspaceId);
  }

  deleteRole(workspaceId: string, userId: string, roleKey: string): WorkspaceRoleDefinition[] {
    if (this.compatMode) {
      this.warnCompat('deleteRole');
      return this.companiesService.deleteRole(workspaceId, userId, roleKey) as WorkspaceRoleDefinition[];
    }

    const workspace = this.getWorkspace(workspaceId);
    this.assertPermission(workspaceId, userId, 'roles.manage');

    if (roleKey === 'admin' || roleKey === 'member') {
      throw new BadRequestException('Default roles cannot be removed');
    }

    const assigned = workspace.members.some((member) => member.roleKey === roleKey);
    if (assigned) {
      throw new BadRequestException('Role is assigned to members');
    }

    const index = workspace.roles.findIndex((role) => role.key === roleKey);
    if (index === -1) {
      throw new NotFoundException('Role not found');
    }

    workspace.roles.splice(index, 1);
    this.persistState();
    return this.listRoles(workspaceId);
  }

  updateMemberRole(
    workspaceId: string,
    userId: string,
    targetUserId: string,
    roleKey: string,
  ): WorkspaceMember {
    if (this.compatMode) {
      this.warnCompat('updateMemberRole');
      return this.companiesService.updateMemberRole(workspaceId, userId, targetUserId, roleKey) as any;
    }

    const workspace = this.getWorkspace(workspaceId);
    this.assertPermission(workspaceId, userId, 'roles.manage');
    this.ensureRoleExists(workspace, roleKey);

    const member = workspace.members.find((item) => item.userId === targetUserId);
    if (!member) {
      throw new NotFoundException('Workspace member not found');
    }

    member.roleKey = roleKey;
    member.status = member.status ?? 'active';
    this.persistState();
    return { ...member };
  }

  getMemberPermissions(workspaceId: string, userId?: string): string[] {
    const member = this.getMember(workspaceId, userId);
    if (!member || member.status !== 'active') {
      return [];
    }
    if (this.compatMode) {
      this.warnCompat('getMemberPermissions');
      return this.companiesService.getMemberPermissions(workspaceId, member.userId);
    }

    const workspace = this.getWorkspace(workspaceId);
    const role = workspace.roles.find((item) => item.key === member.roleKey);
    return role ? [...role.permissions] : [];
  }

  getModulesOverview(workspaceId: string, userId: string) {
    if (this.compatMode) {
      this.warnCompat('getModulesOverview');
      const overview = this.companiesService.getModulesOverview(workspaceId, userId);
      const company = this.companiesService.getCompany(workspaceId);
      const moduleStates = company.moduleStates ?? {};
      const enabledModules = Object.keys(moduleStates).map((key) => {
        const status = moduleStates[key] ?? 'inactive';
        const enabled = status !== 'inactive';
        const configured = status === 'ready';
        return {
          key,
          enabled,
          configured,
          status,
        };
      });

      return {
        availableModules: overview.availableModules,
        enabledModules,
        userRole: overview.userRole,
      };
    }

    const workspace = this.getWorkspace(workspaceId);
    const roleKey = this.getMemberRole(workspaceId, userId);
    if (!roleKey) {
      throw new NotFoundException('Workspace membership not found');
    }

    return {
      availableModules: this.getAvailableModulesCatalog(),
      enabledModules: workspace.enabledModules ?? [],
      userRole: roleKey,
      userPermissions: this.getMemberPermissions(workspaceId, userId),
    };
  }

  updateWorkspaceModules(
    workspaceId: string,
    userId: string,
    updates: Array<{ key: string; enabled: boolean }>,
  ) {
    if (this.compatMode) {
      this.warnCompat('updateWorkspaceModules');
      const company = this.companiesService.getCompany(workspaceId);
      const catalogKeys = new Set(MODULE_CATALOG.map((entry) => entry.key));
      const invalidKeys = updates.map((update) => update.key).filter((key) => !catalogKeys.has(key));
      if (invalidKeys.length > 0) {
        throw new BadRequestException(`Invalid module keys: ${invalidKeys.join(', ')}`);
      }

      const dependencyMap = this.getDependencyMap(catalogKeys);
      const originalEnabled = new Set(
        Object.keys(company.moduleStates ?? {}).filter((key) => company.moduleStates[key] !== 'inactive'),
      );
      const desiredEnabled = new Set(originalEnabled);
      updates.forEach((update) => {
        if (update.enabled) {
          desiredEnabled.add(update.key);
        } else {
          desiredEnabled.delete(update.key);
        }
      });

      const expandedEnabled = this.expandEnabledSet(desiredEnabled, dependencyMap);
      const newlyEnabled = Array.from(expandedEnabled).filter((key) => !originalEnabled.has(key));
      this.assertGlobalModulesEnabled(newlyEnabled);

      const blocked = updates
        .filter((update) => !update.enabled)
        .map((update) => {
          const dependents = this.getDependents(update.key, expandedEnabled, dependencyMap);
          return { key: update.key, dependents };
        })
        .filter((entry) => entry.dependents.length > 0);

      if (blocked.length > 0) {
        const first = blocked[0];
        throw new BadRequestException(
          `Cannot disable ${first.key} because ${first.dependents.join(', ')} depends on it.`,
        );
      }

      const nextStates: Record<string, WorkspaceModuleStatus> = {};
      catalogKeys.forEach((key) => {
        const enabled = expandedEnabled.has(key);
        if (!enabled) {
          nextStates[key] = 'inactive';
          return;
        }
        const requiresConfig = this.requiresConfig(key);
        const current = company.moduleStates?.[key];
        if (current === 'ready') {
          nextStates[key] = 'ready';
        } else {
          nextStates[key] = requiresConfig ? 'pendingConfig' : 'ready';
        }
      });

      const states = this.companiesService.setModuleStates(workspaceId, nextStates as any);
      return Object.keys(states).map((key) => ({
        key,
        enabled: states[key] !== 'inactive',
        configured: states[key] === 'ready',
        status: states[key] as WorkspaceModuleStatus,
      }));
    }

    const workspace = this.getWorkspace(workspaceId);
    const now = new Date();
    const catalogKeys = new Set(MODULE_CATALOG.map((entry) => entry.key));
    const invalidKeys = updates
      .map((update) => update.key)
      .filter((key) => !catalogKeys.has(key));

    if (invalidKeys.length > 0) {
      throw new BadRequestException(`Invalid module keys: ${invalidKeys.join(', ')}`);
    }

    const dependencyMap = this.getDependencyMap(catalogKeys);
    const originalEnabled = new Set(
      workspace.enabledModules.filter((module) => module.enabled).map((module) => module.key)
    );
    const desiredEnabled = new Set(originalEnabled);
    updates.forEach((update) => {
      if (update.enabled) {
        desiredEnabled.add(update.key);
      } else {
        desiredEnabled.delete(update.key);
      }
    });

    const expandedEnabled = this.expandEnabledSet(desiredEnabled, dependencyMap);
    const newlyEnabled = Array.from(expandedEnabled).filter((key) => !originalEnabled.has(key));
    this.assertGlobalModulesEnabled(newlyEnabled);
    const blocked = updates
      .filter((update) => !update.enabled)
      .map((update) => {
        const dependents = this.getDependents(update.key, expandedEnabled, dependencyMap);
        return { key: update.key, dependents };
      })
      .filter((entry) => entry.dependents.length > 0);

    if (blocked.length > 0) {
      const first = blocked[0];
      throw new BadRequestException(
        `Cannot disable ${first.key} because ${first.dependents.join(', ')} depends on it.`
      );
    }

    const expandedUpdates = new Map<string, boolean>();
    updates.forEach((update) => {
      expandedUpdates.set(update.key, update.enabled);
    });
    expandedEnabled.forEach((key) => {
      if (!originalEnabled.has(key) && !expandedUpdates.has(key)) {
        expandedUpdates.set(key, true);
      }
    });

    if (expandedUpdates.size > updates.length) {
      this.logger.debug('[workspaces] auto-enabled dependencies', {
        workspaceId,
        requested: updates.map((update) => update.key),
        expanded: Array.from(expandedUpdates.entries())
          .filter(([, enabled]) => enabled)
          .map(([key]) => key),
      });
    }

    Array.from(expandedUpdates.entries()).forEach(([key, enabled]) => {
      const existing = workspace.enabledModules.find((module) => module.key === key);
      const requiresConfig = this.requiresConfig(key);
      if (existing) {
        const wasEnabled = existing.enabled;
        existing.enabled = enabled;
        if (enabled) {
          existing.enabledAt = now;
          existing.enabledBy = userId;
          if (!wasEnabled) {
            existing.configured = requiresConfig ? false : true;
          }
        } else {
          existing.enabledAt = undefined;
          existing.enabledBy = undefined;
          existing.configured = false;
        }
        existing.status = this.deriveModuleStatus(key, existing.enabled, existing.configured);
      } else {
        const configured = enabled ? (requiresConfig ? false : true) : false;
        workspace.enabledModules.push({
          key,
          enabled,
          configured,
          status: this.deriveModuleStatus(key, enabled, configured),
          enabledAt: enabled ? now : undefined,
          enabledBy: enabled ? userId : undefined,
        });
      }
    });

    this.persistState();
    return workspace.enabledModules;
  }

  setEnabledModules(workspaceId: string, userId: string, enabledModules: string[]) {
    if (this.compatMode) {
      this.warnCompat('setEnabledModules');
      const company = this.companiesService.getCompany(workspaceId);
      const catalogKeys = new Set(MODULE_CATALOG.map((entry) => entry.key));
      const invalidKeys = enabledModules.filter((key) => !catalogKeys.has(key));
      if (invalidKeys.length > 0) {
        throw new BadRequestException(`Invalid module keys: ${invalidKeys.join(', ')}`);
      }

      const dependencyMap = this.getDependencyMap(catalogKeys);
      const requestedEnabled = new Set(enabledModules);
      const expandedEnabled = this.expandEnabledSet(requestedEnabled, dependencyMap);
      const originalEnabled = new Set(
        Object.keys(company.moduleStates ?? {}).filter((key) => company.moduleStates[key] !== 'inactive'),
      );
      const newlyEnabled = Array.from(expandedEnabled).filter((key) => !originalEnabled.has(key));
      this.assertGlobalModulesEnabled(newlyEnabled);

      const nextStates: Record<string, WorkspaceModuleStatus> = {};
      catalogKeys.forEach((key) => {
        const enabled = expandedEnabled.has(key);
        if (!enabled) {
          nextStates[key] = 'inactive';
          return;
        }
        const requiresConfig = this.requiresConfig(key);
        const current = company.moduleStates?.[key];
        if (current === 'ready') {
          nextStates[key] = 'ready';
        } else {
          nextStates[key] = requiresConfig ? 'pendingConfig' : 'ready';
        }
      });

      const states = this.companiesService.setModuleStates(workspaceId, nextStates as any);
      return Object.keys(states).map((key) => ({
        key,
        enabled: states[key] !== 'inactive',
        configured: states[key] === 'ready',
        status: states[key] as WorkspaceModuleStatus,
      }));
    }

    const workspace = this.getWorkspace(workspaceId);
    const now = new Date();
    const catalogKeys = new Set(MODULE_CATALOG.map((entry) => entry.key));
    const invalidKeys = enabledModules.filter((key) => !catalogKeys.has(key));

    if (invalidKeys.length > 0) {
      throw new BadRequestException(`Invalid module keys: ${invalidKeys.join(', ')}`);
    }

    if (invalidKeys.length > 0) {
      throw new BadRequestException(`Invalid module keys: ${invalidKeys.join(', ')}`);
    }

    const dependencyMap = this.getDependencyMap(catalogKeys);
    const requestedEnabled = new Set(enabledModules);
    const expandedEnabled = this.expandEnabledSet(requestedEnabled, dependencyMap);
    const originalEnabled = new Set(
      workspace.enabledModules.filter((module) => module.enabled).map((module) => module.key)
    );
    const newlyEnabled = Array.from(expandedEnabled).filter((key) => !originalEnabled.has(key));
    this.assertGlobalModulesEnabled(newlyEnabled);
    if (expandedEnabled.size > requestedEnabled.size) {
      this.logger.debug('[workspaces] auto-enabled dependencies', {
        workspaceId,
        requested: enabledModules,
        expanded: Array.from(expandedEnabled),
      });
    }

    const existing = new Map(workspace.enabledModules.map((module) => [module.key, module]));
    const next: WorkspaceModuleState[] = [];

    catalogKeys.forEach((key) => {
      const enabled = expandedEnabled.has(key);
      const requiresConfig = this.requiresConfig(key);
      const current = existing.get(key);
      if (current) {
        const wasEnabled = current.enabled;
        current.enabled = enabled;
        if (enabled) {
          current.enabledAt = current.enabledAt ?? now;
          current.enabledBy = userId;
          if (!wasEnabled) {
            current.configured = requiresConfig ? false : true;
          }
        } else {
          current.enabledAt = undefined;
          current.enabledBy = undefined;
          current.configured = false;
        }
        current.status = this.deriveModuleStatus(key, current.enabled, current.configured);
        next.push(current);
        return;
      }

      const configured = enabled ? (requiresConfig ? false : true) : false;
      next.push({
        key,
        enabled,
        configured,
        status: this.deriveModuleStatus(key, enabled, configured),
        enabledAt: enabled ? now : undefined,
        enabledBy: enabled ? userId : undefined,
      });
    });

    workspace.enabledModules = next;
    this.persistState();
    return workspace.enabledModules;
  }

  getEnabledModuleKeys(workspaceId: string): string[] {
    if (this.compatMode) {
      this.warnCompat('getEnabledModuleKeys');
      const moduleStates = this.companiesService.getCompany(workspaceId).moduleStates ?? {};
      return Object.keys(moduleStates).filter((key) => moduleStates[key] !== 'inactive');
    }

    const workspace = this.getWorkspace(workspaceId);
    return workspace.enabledModules.filter((module) => module.enabled).map((module) => module.key);
  }

  getModuleSettings(workspaceId: string, moduleId: string): Record<string, any> {
    if (this.compatMode) {
      this.warnCompat('getModuleSettings');
      return this.companiesService.getModuleSettings(workspaceId, moduleId);
    }

    const workspace = this.getWorkspace(workspaceId);
    return this.moduleSettings.getSettings(workspace, moduleId);
  }

  getCoreSettings(workspaceId: string): WorkspaceCoreSettings {
    if (this.compatMode) {
      this.warnCompat('getCoreSettings');
      return this.companiesService.getCoreSettings(workspaceId) as WorkspaceCoreSettings;
    }

    const workspace = this.getWorkspace(workspaceId);
    const stored = (workspace.moduleSettings?.core ?? {}) as Partial<WorkspaceCoreSettings>;
    const storedCurrencies = (stored as any).currencies as WorkspaceCurrencyDto[] | undefined;
    const currencyIds =
      stored.currencyIds ??
      (Array.isArray(storedCurrencies)
        ? storedCurrencies.map((currency) => currency.id).filter(Boolean) as string[]
        : []);
    const baseCurrencyId = stored.baseCurrencyId ?? workspace.baseCurrencyId;
    return {
      countryId: stored.countryId ?? workspace.countryId,
      baseCurrencyId,
      currencyIds: this.normalizeCurrencyIds(currencyIds, baseCurrencyId),
      companies: Array.isArray(stored.companies) ? stored.companies : [],
      branches: Array.isArray(stored.branches) ? stored.branches : [],
      warehouses: Array.isArray(stored.warehouses) ? stored.warehouses : [],
    };
  }

  updateCoreSettings(workspaceId: string, dto: WorkspaceCoreSettingsDto): WorkspaceCoreSettings {
    if (this.compatMode) {
      this.warnCompat('updateCoreSettings');
      const baseCurrencyId = dto.baseCurrencyId;
      const normalizedCompanies = (dto.companies ?? [])
        .filter((company) => Boolean(company.name))
        .map((company) => ({
          id: company.id ?? uuid(),
          name: company.name!,
        }));
      const normalizedBranches = (dto.branches ?? [])
        .filter((branch) => Boolean(branch.companyId))
        .map((branch) => ({
          id: branch.id ?? uuid(),
          companyId: branch.companyId,
          name: branch.name!,
        }));
      const normalizedWarehouses = (dto.warehouses ?? [])
        .filter((warehouse) => Boolean(warehouse.branchId))
        .map((warehouse) => ({
          id: warehouse.id ?? uuid(),
          branchId: warehouse.branchId,
          name: warehouse.name!,
        }));
      const currencyIds =
        dto.currencyIds ??
        (dto.currencies ?? []).map((currency) => currency.id).filter(Boolean);
      const compatPayload = {
        countryId: dto.countryId,
        baseCurrencyId,
        currencyIds: this.normalizeCurrencyIds(currencyIds, baseCurrencyId),
        companies: normalizedCompanies,
        branches: normalizedBranches,
        warehouses: normalizedWarehouses,
      };
      return this.companiesService.updateCoreSettings(workspaceId, compatPayload) as WorkspaceCoreSettings;
    }

    const workspace = this.getWorkspace(workspaceId);
    const current = this.getCoreSettings(workspaceId);
    const baseCurrencyId = dto.baseCurrencyId ?? current.baseCurrencyId;
    const rawCurrencyIds =
      dto.currencyIds ??
      (dto.currencies ?? []).map((currency) => currency.id).filter(Boolean) ??
      current.currencyIds;
    const currencyIds = this.normalizeCurrencyIds(rawCurrencyIds, baseCurrencyId);
    const companies = (dto.companies ?? current.companies)
      .filter((company) => Boolean(company.name))
      .map((company) => ({
        id: company.id ?? uuid(),
        name: company.name!,
      }));
    const branches = (dto.branches ?? current.branches)
      .filter((branch) => Boolean(branch.companyId))
      .map((branch) => ({
        id: branch.id ?? uuid(),
        companyId: branch.companyId,
        name: branch.name!,
      }));
    const warehouses = (dto.warehouses ?? current.warehouses)
      .filter((warehouse) => Boolean(warehouse.branchId))
      .map((warehouse) => ({
        id: warehouse.id ?? uuid(),
        branchId: warehouse.branchId,
        name: warehouse.name!,
      }));
    const next: WorkspaceCoreSettings = {
      countryId: dto.countryId ?? current.countryId,
      baseCurrencyId,
      currencyIds,
      companies,
      branches,
      warehouses,
    };

    this.validateCoreSettings(next);
    workspace.countryId = next.countryId ?? workspace.countryId;
    workspace.baseCurrencyId = next.baseCurrencyId ?? workspace.baseCurrencyId;
    workspace.moduleSettings = {
      ...(workspace.moduleSettings ?? {}),
      core: next,
    };
    this.persistState();
    return next;
  }

  updateModuleSettings(workspaceId: string, moduleId: string, updates: Record<string, any>) {
    if (this.compatMode) {
      this.warnCompat('updateModuleSettings');
      return this.companiesService.updateModuleSettings(workspaceId, moduleId, updates ?? {});
    }

    const workspace = this.getWorkspace(workspaceId);
    const result = this.moduleSettings.patchSettings(workspace, moduleId, updates);
    const moduleState = workspace.enabledModules.find((module) => module.key === moduleId);
    if (moduleState && moduleState.enabled) {
      moduleState.configured = true;
      moduleState.status = this.deriveModuleStatus(moduleId, true, true);
    }
    this.persistState();
    return result;
  }

  enableModule(workspaceId: string, userId: string, moduleKey: string): WorkspaceModuleState {
    if (this.compatMode) {
      this.warnCompat('enableModule');
      const states = this.companiesService.enableModule(workspaceId, moduleKey, userId);
      const status = states[moduleKey] ?? 'inactive';
      return {
        key: moduleKey,
        enabled: status !== 'inactive',
        configured: status === 'ready',
        status,
      };
    }

    const catalogKeys = new Set(MODULE_CATALOG.map((entry) => entry.key));
    if (!catalogKeys.has(moduleKey)) {
      throw new BadRequestException(`Invalid module key: ${moduleKey}`);
    }

    this.assertGlobalModulesEnabled([moduleKey]);
    const dependencyMap = this.getDependencyMap(catalogKeys);
    const originalEnabled = new Set(this.getEnabledModuleKeys(workspaceId));
    const desiredEnabled = new Set(originalEnabled);
    desiredEnabled.add(moduleKey);
    const expandedEnabled = this.expandEnabledSet(desiredEnabled, dependencyMap);
    const newlyEnabled = Array.from(expandedEnabled).filter((key) => !originalEnabled.has(key));
    this.assertGlobalModulesEnabled(newlyEnabled);

    const updates = Array.from(expandedEnabled).map((key) => ({
      key,
      enabled: true,
    }));
    const result = this.updateWorkspaceModules(workspaceId, userId, updates);
    const updated = result.find((module) => module.key === moduleKey);
    if (!updated) {
      throw new NotFoundException('Module not found in workspace');
    }
    return updated;
  }

  configureModule(workspaceId: string, userId: string, moduleKey: string): WorkspaceModuleState {
    if (this.compatMode) {
      this.warnCompat('configureModule');
      this.companiesService.configureModule(workspaceId, moduleKey, userId, {});
      return {
        key: moduleKey,
        enabled: true,
        configured: true,
        status: 'ready',
      };
    }

    const workspace = this.getWorkspace(workspaceId);
    const moduleState = workspace.enabledModules.find((module) => module.key === moduleKey);
    if (!moduleState || !moduleState.enabled) {
      throw new BadRequestException('Module not enabled');
    }

    moduleState.configured = true;
    moduleState.enabledBy = userId;
    moduleState.status = this.deriveModuleStatus(moduleKey, true, true);
    this.persistState();
    return moduleState;
  }

  getInventorySettings(workspaceId: string): InventorySettings {
    if (this.compatMode) {
      this.warnCompat('getInventorySettings');
      const settings = this.companiesService.getModuleSettings(workspaceId, 'inventory');
      return this.normalizeInventorySettings(settings);
    }

    const workspace = this.getWorkspace(workspaceId);
    const settings = this.moduleSettings.getSettings(workspace, 'inventory');
    return this.normalizeInventorySettings(settings);
  }

  updateInventorySettings(workspaceId: string, dto: UpdateInventorySettingsDto): InventorySettings {
    if (this.compatMode) {
      this.warnCompat('updateInventorySettings');
      const current = this.normalizeInventorySettings(
        this.companiesService.getModuleSettings(workspaceId, 'inventory'),
      );
      const next: InventorySettings = {
        costMethod: dto.costMethod ?? current.costMethod,
        stockLevel: dto.stockLevel ?? current.stockLevel,
        allowNegative: dto.allowNegative ?? current.allowNegative,
      };
      this.companiesService.updateModuleSettings(workspaceId, 'inventory', next);
      return next;
    }

    const workspace = this.getWorkspace(workspaceId);
    const current = this.normalizeInventorySettings(
      this.moduleSettings.getSettings(workspace, 'inventory')
    );
    const next: InventorySettings = {
      costMethod: dto.costMethod ?? current.costMethod,
      stockLevel: dto.stockLevel ?? current.stockLevel,
      allowNegative: dto.allowNegative ?? current.allowNegative,
    };
    this.moduleSettings.patchSettings(workspace, 'inventory', next);
    this.persistState();
    return next;
  }

  getAccountingDefaults(workspaceId: string): AccountingDefaults {
    if (this.compatMode) {
      this.warnCompat('getAccountingDefaults');
      const settings = this.companiesService.getModuleSettings(workspaceId, 'accounting');
      return this.normalizeAccountingDefaults(settings?.defaults ?? {});
    }

    const workspace = this.getWorkspace(workspaceId);
    const settings = this.moduleSettings.getSettings(workspace, 'accounting');
    return this.normalizeAccountingDefaults(settings?.defaults ?? {});
  }

  updateAccountingDefaults(workspaceId: string, dto: UpdateAccountingDefaultsDto): AccountingDefaults {
    if (this.compatMode) {
      this.warnCompat('updateAccountingDefaults');
      const current = this.getAccountingDefaults(workspaceId);
      const next: AccountingDefaults = {
        salesIncomeAccountId: dto.salesIncomeAccountId ?? current.salesIncomeAccountId,
        salesDiscountAccountId: dto.salesDiscountAccountId ?? current.salesDiscountAccountId,
        inventoryAccountId: dto.inventoryAccountId ?? current.inventoryAccountId,
        cogsAccountId: dto.cogsAccountId ?? current.cogsAccountId,
        purchasesAccountId: dto.purchasesAccountId ?? current.purchasesAccountId,
        taxPayableAccountId: dto.taxPayableAccountId ?? current.taxPayableAccountId,
        taxReceivableAccountId: dto.taxReceivableAccountId ?? current.taxReceivableAccountId,
      };

      this.validateAccountIds(workspaceId, [
        next.salesIncomeAccountId,
        next.salesDiscountAccountId,
        next.inventoryAccountId,
        next.cogsAccountId,
        next.purchasesAccountId,
        next.taxPayableAccountId,
        next.taxReceivableAccountId,
      ]);

      this.companiesService.updateModuleSettings(workspaceId, 'accounting', { defaults: next });
      return next;
    }

    const workspace = this.getWorkspace(workspaceId);
    const current = this.getAccountingDefaults(workspaceId);
    const next: AccountingDefaults = {
      salesIncomeAccountId: dto.salesIncomeAccountId ?? current.salesIncomeAccountId,
      salesDiscountAccountId: dto.salesDiscountAccountId ?? current.salesDiscountAccountId,
      inventoryAccountId: dto.inventoryAccountId ?? current.inventoryAccountId,
      cogsAccountId: dto.cogsAccountId ?? current.cogsAccountId,
      purchasesAccountId: dto.purchasesAccountId ?? current.purchasesAccountId,
      taxPayableAccountId: dto.taxPayableAccountId ?? current.taxPayableAccountId,
      taxReceivableAccountId: dto.taxReceivableAccountId ?? current.taxReceivableAccountId,
    };

    this.validateAccountIds(workspaceId, [
      next.salesIncomeAccountId,
      next.salesDiscountAccountId,
      next.inventoryAccountId,
      next.cogsAccountId,
      next.purchasesAccountId,
      next.taxPayableAccountId,
      next.taxReceivableAccountId,
    ]);

    this.moduleSettings.patchSettings(workspace, 'accounting', { defaults: next });
    this.persistState();
    return next;
  }

  listAccountingTaxes(workspaceId: string): AccountingTax[] {
    if (this.compatMode) {
      this.warnCompat('listAccountingTaxes');
      const settings = this.companiesService.getModuleSettings(workspaceId, 'accounting');
      const taxes = settings?.taxes;
      return Array.isArray(taxes) ? taxes : [];
    }

    const workspace = this.getWorkspace(workspaceId);
    const settings = this.moduleSettings.getSettings(workspace, 'accounting');
    const taxes = settings?.taxes;
    return Array.isArray(taxes) ? taxes : [];
  }

  createAccountingTax(workspaceId: string, dto: CreateAccountingTaxDto): AccountingTax {
    if (this.compatMode) {
      this.warnCompat('createAccountingTax');
      if (dto.accountId) {
        this.validateAccountIds(workspaceId, [dto.accountId]);
      }

      const taxes = this.listAccountingTaxes(workspaceId);
      const tax: AccountingTax = {
        id: uuid(),
        name: dto.name,
        rate: dto.rate,
        type: dto.type,
        accountId: dto.accountId,
        isActive: dto.isActive ?? true,
      };

      this.companiesService.updateModuleSettings(workspaceId, 'accounting', {
        taxes: [...taxes, tax],
      });
      return tax;
    }

    const workspace = this.getWorkspace(workspaceId);
    if (dto.accountId) {
      this.validateAccountIds(workspaceId, [dto.accountId]);
    }

    const taxes = this.listAccountingTaxes(workspaceId);
    const tax: AccountingTax = {
      id: uuid(),
      name: dto.name,
      rate: dto.rate,
      type: dto.type,
      accountId: dto.accountId,
      isActive: dto.isActive ?? true,
    };

    this.moduleSettings.patchSettings(workspace, 'accounting', {
      taxes: [...taxes, tax],
    });
    this.persistState();
    return tax;
  }

  updateAccountingTax(workspaceId: string, taxId: string, dto: UpdateAccountingTaxDto): AccountingTax {
    if (this.compatMode) {
      this.warnCompat('updateAccountingTax');
      const taxes = this.listAccountingTaxes(workspaceId);
      const tax = taxes.find((item) => item.id === taxId);
      if (!tax) {
        throw new NotFoundException('Accounting tax not found');
      }

      if (dto.accountId) {
        this.validateAccountIds(workspaceId, [dto.accountId]);
      }

      Object.assign(tax, {
        name: dto.name ?? tax.name,
        rate: dto.rate ?? tax.rate,
        type: dto.type ?? tax.type,
        accountId: dto.accountId ?? tax.accountId,
        isActive: dto.isActive ?? tax.isActive,
      });

      this.companiesService.updateModuleSettings(workspaceId, 'accounting', { taxes });
      return tax;
    }

    const workspace = this.getWorkspace(workspaceId);
    const taxes = this.listAccountingTaxes(workspaceId);
    const tax = taxes.find((item) => item.id === taxId);
    if (!tax) {
      throw new NotFoundException('Accounting tax not found');
    }

    if (dto.accountId) {
      this.validateAccountIds(workspaceId, [dto.accountId]);
    }

    Object.assign(tax, {
      name: dto.name ?? tax.name,
      rate: dto.rate ?? tax.rate,
      type: dto.type ?? tax.type,
      accountId: dto.accountId ?? tax.accountId,
      isActive: dto.isActive ?? tax.isActive,
    });

    this.moduleSettings.patchSettings(workspace, 'accounting', { taxes });
    this.persistState();
    return tax;
  }

  deleteAccountingTax(workspaceId: string, taxId: string): { id: string } {
    if (this.compatMode) {
      this.warnCompat('deleteAccountingTax');
      const taxes = this.listAccountingTaxes(workspaceId);
      const index = taxes.findIndex((item) => item.id === taxId);
      if (index === -1) {
        throw new NotFoundException('Accounting tax not found');
      }
      taxes.splice(index, 1);
      this.companiesService.updateModuleSettings(workspaceId, 'accounting', { taxes });
      return { id: taxId };
    }

    const workspace = this.getWorkspace(workspaceId);
    const taxes = this.listAccountingTaxes(workspaceId);
    const index = taxes.findIndex((item) => item.id === taxId);
    if (index === -1) {
      throw new NotFoundException('Accounting tax not found');
    }
    taxes.splice(index, 1);
    this.moduleSettings.patchSettings(workspace, 'accounting', { taxes });
    this.persistState();
    return { id: taxId };
  }

  listAccountingCategoryMappings(workspaceId: string): AccountingCategoryMapping[] {
    if (this.compatMode) {
      this.warnCompat('listAccountingCategoryMappings');
      const settings = this.companiesService.getModuleSettings(workspaceId, 'accounting');
      const mappings = settings?.categoryMappings;
      return Array.isArray(mappings) ? mappings : [];
    }

    const workspace = this.getWorkspace(workspaceId);
    const settings = this.moduleSettings.getSettings(workspace, 'accounting');
    const mappings = settings?.categoryMappings;
    return Array.isArray(mappings) ? mappings : [];
  }

  createAccountingCategoryMapping(
    workspaceId: string,
    dto: CreateAccountingCategoryMappingDto
  ): AccountingCategoryMapping {
    if (this.compatMode) {
      this.warnCompat('createAccountingCategoryMapping');
      this.validateAccountIds(workspaceId, [
        dto.salesIncomeAccountId,
        dto.cogsAccountId,
        dto.inventoryAccountId,
      ]);

      const mappings = this.listAccountingCategoryMappings(workspaceId);
      const mapping: AccountingCategoryMapping = {
        id: uuid(),
        categoryId: dto.categoryId,
        salesIncomeAccountId: dto.salesIncomeAccountId,
        cogsAccountId: dto.cogsAccountId,
        inventoryAccountId: dto.inventoryAccountId,
      };

      this.companiesService.updateModuleSettings(workspaceId, 'accounting', {
        categoryMappings: [...mappings, mapping],
      });
      return mapping;
    }

    const workspace = this.getWorkspace(workspaceId);
    this.validateAccountIds(workspaceId, [
      dto.salesIncomeAccountId,
      dto.cogsAccountId,
      dto.inventoryAccountId,
    ]);

    const mappings = this.listAccountingCategoryMappings(workspaceId);
    const mapping: AccountingCategoryMapping = {
      id: uuid(),
      categoryId: dto.categoryId,
      salesIncomeAccountId: dto.salesIncomeAccountId,
      cogsAccountId: dto.cogsAccountId,
      inventoryAccountId: dto.inventoryAccountId,
    };

    this.moduleSettings.patchSettings(workspace, 'accounting', {
      categoryMappings: [...mappings, mapping],
    });
    this.persistState();
    return mapping;
  }

  updateAccountingCategoryMapping(
    workspaceId: string,
    mappingId: string,
    dto: UpdateAccountingCategoryMappingDto
  ): AccountingCategoryMapping {
    if (this.compatMode) {
      this.warnCompat('updateAccountingCategoryMapping');
      const mappings = this.listAccountingCategoryMappings(workspaceId);
      const mapping = mappings.find((item) => item.id === mappingId);
      if (!mapping) {
        throw new NotFoundException('Accounting category mapping not found');
      }

      this.validateAccountIds(workspaceId, [
        dto.salesIncomeAccountId,
        dto.cogsAccountId,
        dto.inventoryAccountId,
      ]);

      Object.assign(mapping, {
        categoryId: dto.categoryId ?? mapping.categoryId,
        salesIncomeAccountId: dto.salesIncomeAccountId ?? mapping.salesIncomeAccountId,
        cogsAccountId: dto.cogsAccountId ?? mapping.cogsAccountId,
        inventoryAccountId: dto.inventoryAccountId ?? mapping.inventoryAccountId,
      });

      this.companiesService.updateModuleSettings(workspaceId, 'accounting', { categoryMappings: mappings });
      return mapping;
    }

    const workspace = this.getWorkspace(workspaceId);
    const mappings = this.listAccountingCategoryMappings(workspaceId);
    const mapping = mappings.find((item) => item.id === mappingId);
    if (!mapping) {
      throw new NotFoundException('Accounting category mapping not found');
    }

    this.validateAccountIds(workspaceId, [
      dto.salesIncomeAccountId,
      dto.cogsAccountId,
      dto.inventoryAccountId,
    ]);

    Object.assign(mapping, {
      categoryId: dto.categoryId ?? mapping.categoryId,
      salesIncomeAccountId: dto.salesIncomeAccountId ?? mapping.salesIncomeAccountId,
      cogsAccountId: dto.cogsAccountId ?? mapping.cogsAccountId,
      inventoryAccountId: dto.inventoryAccountId ?? mapping.inventoryAccountId,
    });

    this.moduleSettings.patchSettings(workspace, 'accounting', { categoryMappings: mappings });
    this.persistState();
    return mapping;
  }

  deleteAccountingCategoryMapping(workspaceId: string, mappingId: string): { id: string } {
    if (this.compatMode) {
      this.warnCompat('deleteAccountingCategoryMapping');
      const mappings = this.listAccountingCategoryMappings(workspaceId);
      const index = mappings.findIndex((item) => item.id === mappingId);
      if (index === -1) {
        throw new NotFoundException('Accounting category mapping not found');
      }
      mappings.splice(index, 1);
      this.companiesService.updateModuleSettings(workspaceId, 'accounting', { categoryMappings: mappings });
      return { id: mappingId };
    }

    const workspace = this.getWorkspace(workspaceId);
    const mappings = this.listAccountingCategoryMappings(workspaceId);
    const index = mappings.findIndex((item) => item.id === mappingId);
    if (index === -1) {
      throw new NotFoundException('Accounting category mapping not found');
    }
    mappings.splice(index, 1);
    this.moduleSettings.patchSettings(workspace, 'accounting', { categoryMappings: mappings });
    this.persistState();
    return { id: mappingId };
  }

  listPosTerminals(workspaceId: string): PosTerminalSettings {
    if (this.compatMode) {
      this.warnCompat('listPosTerminals');
      const settings = this.companiesService.getModuleSettings(workspaceId, 'pos');
      const terminals = Array.isArray(settings?.terminals) ? settings.terminals : [];
      const defaults = settings?.defaults ?? {};
      return { terminals, defaults };
    }

    const workspace = this.getWorkspace(workspaceId);
    this.moduleSettings.validateModuleEnabled(workspace, 'pos');
    return this.getPosSettings(workspace);
  }

  createPosTerminal(workspaceId: string, dto: CreatePosTerminalDto): PosTerminal {
    if (this.compatMode) {
      this.warnCompat('createPosTerminal');
      const settings = this.listPosTerminals(workspaceId);
      this.assertWarehouse(dto.warehouseId, workspaceId, dto.companyId);
      this.assertUsers(dto.allowedUsers);

      const terminal: PosTerminal = {
        id: uuid(),
        name: dto.name,
        companyId: dto.companyId,
        branchId: dto.branchId,
        warehouseId: dto.warehouseId,
        currencyId: dto.currencyId,
        allowedUsers: Array.from(new Set(dto.allowedUsers ?? [])),
        isActive: dto.isActive ?? true,
      };

      const next = {
        ...settings,
        terminals: [...settings.terminals, terminal],
      };

      this.companiesService.updateModuleSettings(workspaceId, 'pos', next);
      return terminal;
    }

    const workspace = this.getWorkspace(workspaceId);
    this.moduleSettings.validateModuleEnabled(workspace, 'pos');
    this.assertWarehouse(dto.warehouseId, workspace.id, dto.companyId);
    this.assertUsers(dto.allowedUsers);

    const terminal: PosTerminal = {
      id: uuid(),
      name: dto.name,
      companyId: dto.companyId,
      branchId: dto.branchId,
      warehouseId: dto.warehouseId,
      currencyId: dto.currencyId,
      allowedUsers: Array.from(new Set(dto.allowedUsers ?? [])),
      isActive: dto.isActive ?? true,
    };

    const settings = this.getPosSettings(workspace);
    const next = {
      ...settings,
      terminals: [...settings.terminals, terminal],
    };

    this.moduleSettings.patchSettings(workspace, 'pos', next);
    this.persistState();
    return terminal;
  }

  updatePosTerminal(
    workspaceId: string,
    terminalId: string,
    dto: UpdatePosTerminalDto
  ): PosTerminal {
    if (this.compatMode) {
      this.warnCompat('updatePosTerminal');
      const settings = this.listPosTerminals(workspaceId);
      const terminal = settings.terminals.find((item) => item.id === terminalId);
      if (!terminal) {
        throw new NotFoundException('POS terminal not found');
      }

      const nextWarehouseId = dto.warehouseId ?? terminal.warehouseId;
      const nextCompanyId = dto.companyId ?? terminal.companyId;
      this.assertWarehouse(nextWarehouseId, workspaceId, nextCompanyId);

      if (dto.allowedUsers !== undefined) {
        this.assertUsers(dto.allowedUsers);
      }

      Object.assign(terminal, {
        name: dto.name ?? terminal.name,
        companyId: nextCompanyId,
        branchId: dto.branchId ?? terminal.branchId,
        warehouseId: nextWarehouseId,
        currencyId: dto.currencyId ?? terminal.currencyId,
        allowedUsers:
          dto.allowedUsers !== undefined
            ? Array.from(new Set(dto.allowedUsers))
            : terminal.allowedUsers,
        isActive: dto.isActive ?? terminal.isActive,
      });

      this.companiesService.updateModuleSettings(workspaceId, 'pos', settings);
      return terminal;
    }

    const workspace = this.getWorkspace(workspaceId);
    this.moduleSettings.validateModuleEnabled(workspace, 'pos');

    const settings = this.getPosSettings(workspace);
    const terminal = settings.terminals.find((item) => item.id === terminalId);
    if (!terminal) {
      throw new NotFoundException('POS terminal not found');
    }

    const nextWarehouseId = dto.warehouseId ?? terminal.warehouseId;
    const nextCompanyId = dto.companyId ?? terminal.companyId;
    this.assertWarehouse(nextWarehouseId, workspace.id, nextCompanyId);

    if (dto.allowedUsers !== undefined) {
      this.assertUsers(dto.allowedUsers);
    }

    Object.assign(terminal, {
      name: dto.name ?? terminal.name,
      companyId: nextCompanyId,
      branchId: dto.branchId ?? terminal.branchId,
      warehouseId: nextWarehouseId,
      currencyId: dto.currencyId ?? terminal.currencyId,
      allowedUsers:
        dto.allowedUsers !== undefined
          ? Array.from(new Set(dto.allowedUsers))
          : terminal.allowedUsers,
      isActive: dto.isActive ?? terminal.isActive,
    });

    this.moduleSettings.patchSettings(workspace, 'pos', settings);
    this.persistState();
    return terminal;
  }

  deletePosTerminal(workspaceId: string, terminalId: string): { id: string } {
    if (this.compatMode) {
      this.warnCompat('deletePosTerminal');
      const settings = this.listPosTerminals(workspaceId);
      const index = settings.terminals.findIndex((item) => item.id === terminalId);
      if (index === -1) {
        throw new NotFoundException('POS terminal not found');
      }

      settings.terminals.splice(index, 1);
      if (settings.defaults?.terminalId === terminalId) {
        settings.defaults = { ...settings.defaults, terminalId: undefined };
      }

      this.companiesService.updateModuleSettings(workspaceId, 'pos', settings);
      return { id: terminalId };
    }

    const workspace = this.getWorkspace(workspaceId);
    this.moduleSettings.validateModuleEnabled(workspace, 'pos');

    const settings = this.getPosSettings(workspace);
    const index = settings.terminals.findIndex((item) => item.id === terminalId);
    if (index === -1) {
      throw new NotFoundException('POS terminal not found');
    }

    settings.terminals.splice(index, 1);
    if (settings.defaults?.terminalId === terminalId) {
      settings.defaults = { ...settings.defaults, terminalId: undefined };
    }

    this.moduleSettings.patchSettings(workspace, 'pos', settings);
    this.persistState();
    return { id: terminalId };
  }

  markSetupCompleted(workspaceId: string): WorkspaceEntity {
    const workspace = this.getWorkspace(workspaceId);
    workspace.setupCompleted = true;
    this.persistState();
    return workspace;
  }

  joinByCode(userId: string, code: string): WorkspaceEntity {
    if (this.compatMode) {
      this.warnCompat('joinByCode');
      const company = this.companiesService.joinCompany(code, userId);
      this.usersService.addWorkspaceMembership(userId, { workspaceId: company.id, roles: ['member'] });
      const user = this.usersService.findById(userId);
      if (!user.defaultWorkspaceId) {
        this.usersService.setDefaultWorkspace(userId, company.id);
      }
      return this.mapCompanyToWorkspace(company);
    }

    const normalizedCode = code.trim().toUpperCase();
    const workspace = this.workspaces.find((item) => item.code === normalizedCode);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const existing = workspace.members.find((member) => member.userId === userId);
    if (!existing) {
      workspace.members.push({ userId, roleKey: 'member', status: 'active' });
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
    if (this.compatMode) {
      this.warnCompat('listByUser');
      return this.companiesService.listByUser(userId).map((company) => this.mapCompanyToWorkspace(company));
    }

    return this.workspaces.filter((workspace) =>
      workspace.members.some((member) => member.userId === userId && member.status === 'active'),
    );
  }

  getWorkspace(workspaceId: string): WorkspaceEntity {
    if (this.compatMode) {
      this.warnCompat('getWorkspace');
      const company = this.companiesService.getCompany(workspaceId);
      return this.mapCompanyToWorkspace(company);
    }

    const workspace = this.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  isCompatMode(): boolean {
    return this.compatMode;
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
    const roles = Array.isArray(raw.roles)
      ? raw.roles
          .filter((role: any) => typeof role?.key === 'string')
          .map((role: any) => ({
            key: role.key,
            name: typeof role.name === 'string' && role.name.trim() ? role.name.trim() : role.key,
            permissions: this.normalizePermissions(Array.isArray(role.permissions) ? role.permissions : []),
          }))
      : this.buildDefaultRoles();

    const ensureBaseRoles = (items: WorkspaceRoleDefinition[]): WorkspaceRoleDefinition[] => {
      const hasAdmin = items.some((role) => role.key === 'admin');
      const hasMember = items.some((role) => role.key === 'member');
      const next = [...items];
      if (!hasAdmin) {
        next.unshift({ key: 'admin', name: 'Admin', permissions: [...this.basePermissions] });
      } else {
        const adminRole = next.find((role) => role.key === 'admin');
        if (adminRole) {
          adminRole.permissions = [...this.basePermissions];
        }
      }
      if (!hasMember) {
        next.push({ key: 'member', name: 'Member', permissions: [] });
      }
      return next;
    };

    const normalizedRoles = ensureBaseRoles(roles);

    const members = Array.isArray(raw.members)
      ? raw.members.map((member: any) => {
          const legacyRole =
            member?.role === 'admin' || member?.role === 'member' ? member.role : undefined;
          const roleKey =
            typeof member?.roleKey === 'string'
              ? member.roleKey
              : Array.isArray(member?.roles)
                ? member.roles.includes('admin') || member.roles.includes('owner')
                  ? 'admin'
                  : 'member'
                : legacyRole ?? 'member';
          const status: WorkspaceMemberStatus =
            member?.status === 'invited' || member?.status === 'disabled' ? member.status : 'active';
          return { userId: member.userId, roleKey, status };
        })
      : [];

    const roleKeys = new Set(normalizedRoles.map((role) => role.key));
    const normalizedMembers = members.map((member) => ({
      ...member,
      roleKey: roleKeys.has(member.roleKey) ? member.roleKey : 'member',
    }));

    const rawModules = Array.isArray(raw.enabledModules)
      ? raw.enabledModules
      : Array.isArray(raw.modules)
        ? raw.modules
        : [];

    const enabledModules =
      typeof rawModules[0] === 'string'
        ? rawModules.map((key: string) => {
            const requiresConfig = this.requiresConfig(key);
            const configured = requiresConfig ? false : true;
            return {
              key,
              enabled: true,
              configured,
              status: this.deriveModuleStatus(key, true, configured),
              enabledAt: undefined,
              enabledBy: undefined,
            };
          })
        : rawModules
            .filter((module: any) => typeof module?.key === 'string')
            .map((module: any) => {
              const requiresConfig = this.requiresConfig(module.key);
              const configured =
                typeof module.configured === 'boolean'
                  ? module.configured
                  : requiresConfig
                    ? Boolean(raw.moduleSettings?.[module.key])
                    : true;
              const enabled = Boolean(module.enabled);
              return {
                key: module.key,
                enabled,
                configured: enabled ? configured : false,
                status: this.deriveModuleStatus(module.key, enabled, enabled ? configured : false),
                enabledAt: module.enabledAt ? new Date(module.enabledAt) : undefined,
                enabledBy: module.enabledBy,
              };
            });
    const ownerUserId =
      raw.ownerUserId ||
      normalizedMembers.find((member) => member.roleKey === 'admin')?.userId ||
      normalizedMembers[0]?.userId ||
      'unknown';

    return {
      id: raw.id || uuid(),
      name: raw.name || 'Workspace',
      code: raw.code || this.generateUniqueCode(existing),
      organizationId: raw.organizationId || 'unknown',
      countryId: raw.countryId || 'unknown',
      baseCurrencyId: raw.baseCurrencyId,
      ownerUserId,
      roles: normalizedRoles,
      members: normalizedMembers,
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

  private warnCompat(action: string): void {
    if (this.compatWarnings.has(action)) {
      return;
    }
    this.compatWarnings.add(action);
    this.logger.warn(`Workspaces compat mode active for ${action}. Use /companies instead.`);
  }

  private mapCompanyToWorkspace(company: any): WorkspaceEntity {
    const ownerUserId =
      company.members?.find((member: any) => member.roleKey === 'owner')?.userId ??
      company.members?.[0]?.userId ??
      'unknown';

    const roles = Array.isArray(company.roles)
      ? company.roles.map((role: any) => ({
          key: role.key,
          name: role.name,
          permissions: Array.isArray(role.permissions) ? [...role.permissions] : [],
        }))
      : this.buildDefaultRoles();

    const members = Array.isArray(company.members)
      ? company.members.map((member: any) => ({
          userId: member.userId,
          roleKey: member.roleKey ?? 'member',
          status: member.status ?? 'active',
        }))
      : [];

    const moduleStates = company.moduleStates ?? {};
    const enabledModules = Object.keys(moduleStates).map((key) => {
      const status = moduleStates[key] ?? 'inactive';
      const enabled = status !== 'inactive';
      const configured = status === 'ready';
      return {
        key,
        enabled,
        configured,
        status,
      };
    });

    return {
      id: company.id,
      name: company.name ?? 'Company',
      code: company.code ?? company.id,
      organizationId: company.organizationId ?? 'unknown',
      countryId: company.baseCountryId ?? 'unknown',
      baseCurrencyId: company.baseCurrencyId,
      ownerUserId,
      roles,
      members,
      enabledModules,
      moduleSettings: company.moduleSettings ?? {},
      setupCompleted: false,
      createdAt: company.createdAt ? new Date(company.createdAt) : new Date(),
    };
  }

  private getPosSettings(workspace: WorkspaceEntity): PosTerminalSettings {
    const raw = (workspace.moduleSettings?.pos ?? {}) as PosTerminalSettings;
    const terminals = Array.isArray(raw.terminals) ? raw.terminals : [];
    const defaults = raw.defaults ?? {};
    return { terminals, defaults };
  }

  private normalizeInventorySettings(payload: Record<string, any>): InventorySettings {
    return {
      costMethod:
        payload?.costMethod === 'fifo' || payload?.costMethod === 'standard'
          ? payload.costMethod
          : 'weighted_avg',
      stockLevel: payload?.stockLevel === 'location' ? 'location' : 'warehouse',
      allowNegative: payload?.allowNegative === true,
    };
  }

  private normalizeAccountingDefaults(payload: Record<string, any>): AccountingDefaults {
    return {
      salesIncomeAccountId: payload?.salesIncomeAccountId,
      salesDiscountAccountId: payload?.salesDiscountAccountId,
      inventoryAccountId: payload?.inventoryAccountId,
      cogsAccountId: payload?.cogsAccountId,
      purchasesAccountId: payload?.purchasesAccountId,
      taxPayableAccountId: payload?.taxPayableAccountId,
      taxReceivableAccountId: payload?.taxReceivableAccountId,
    };
  }

  private validateAccountIds(workspaceId: string, accountIds: Array<string | undefined>): void {
    const ids = accountIds.filter((id): id is string => Boolean(id));
    if (ids.length === 0) {
      return;
    }
    const accounts = this.accountingService.listAccounts(workspaceId);
    const accountMap = new Set(accounts.map((account) => account.id));
    ids.forEach((id) => {
      if (!accountMap.has(id)) {
        throw new BadRequestException('Account not found');
      }
    });
  }

  private assertUsers(userIds?: string[]): void {
    if (!userIds || userIds.length === 0) {
      return;
    }
    userIds.forEach((id) => this.usersService.findById(id));
  }

  private assertWarehouse(warehouseId: string, workspaceId: string, companyId?: string): void {
    const warehouse = this.warehousesService.findOne(warehouseId);
    if (warehouse.workspaceId !== workspaceId) {
      throw new BadRequestException('Warehouse does not belong to the workspace');
    }
    if (companyId && warehouse.companyId !== companyId) {
      throw new BadRequestException('Warehouse does not belong to the company');
    }
  }

  private validateCoreSettings(settings: WorkspaceCoreSettings): void {
    const companies = new Set(settings.companies.map((company) => company.id));
    const branches = new Set(settings.branches.map((branch) => branch.id));

    settings.branches.forEach((branch) => {
      if (!companies.has(branch.companyId)) {
        throw new BadRequestException('Branch company not found');
      }
    });

    settings.warehouses.forEach((warehouse) => {
      if (!branches.has(warehouse.branchId)) {
        throw new BadRequestException('Warehouse branch not found');
      }
    });
  }

  private normalizeCurrencyIds(
    rawCurrencyIds: Array<string | undefined> | undefined,
    baseCurrencyId?: string,
  ): string[] {
    const list = Array.isArray(rawCurrencyIds) ? rawCurrencyIds : [];
    const normalized = list
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
    if (baseCurrencyId && !normalized.includes(baseCurrencyId)) {
      normalized.push(baseCurrencyId);
    }
    return Array.from(new Set(normalized));
  }

  private buildDefaultRoles(): WorkspaceRoleDefinition[] {
    return [
      {
        key: 'admin',
        name: 'Admin',
        permissions: [...this.basePermissions],
      },
      {
        key: 'member',
        name: 'Member',
        permissions: [],
      },
    ];
  }

  private ensureRoleExists(workspace: WorkspaceEntity, roleKey: string): void {
    if (!workspace.roles.some((role) => role.key === roleKey)) {
      throw new BadRequestException('Role not found');
    }
  }

  private assertPermission(workspaceId: string, userId: string, permission: string): void {
    const member = this.getMember(workspaceId, userId);
    if (!member) {
      throw new ForbiddenException('User is not a member of workspace');
    }
    if (member.status !== 'active') {
      this.logger.warn('[workspaces] permission denied: pending approval', {
        workspaceId,
        userId,
        roleKey: member.roleKey,
        permission,
      });
      throw new ForbiddenException('Pending approval');
    }
    const permissions = this.getMemberPermissions(workspaceId, userId);
    if (!this.hasPermission(permissions, permission)) {
      this.logger.warn('[workspaces] permission denied: missing permission', {
        workspaceId,
        userId,
        roleKey: member.roleKey,
        permission,
        permissions,
      });
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }

  hasPermission(permissions: string[], required: string): boolean {
    if (permissions.includes('*') || permissions.includes(required)) {
      return true;
    }
    return permissions.some((permission) => {
      if (!permission.endsWith('.*')) {
        return false;
      }
      const prefix = permission.slice(0, -1);
      return required.startsWith(prefix);
    });
  }

  getMember(workspaceId: string, userId?: string): WorkspaceMember | null {
    if (!userId) {
      return null;
    }

    if (this.compatMode) {
      this.warnCompat('getMember');
      const company = this.companiesService.getCompany(workspaceId);
      const member = company.members?.find((item) => item.userId === userId);
      if (!member) {
        return null;
      }
      return {
        userId: member.userId,
        roleKey: member.roleKey ?? 'member',
        status: member.status ?? 'active',
      };
    }

    const workspace = this.getWorkspace(workspaceId);
    return workspace.members.find((item) => item.userId === userId) ?? null;
  }

  private normalizePermissions(permissions: string[] | undefined): string[] {
    if (!permissions) {
      return [];
    }
    const normalized = permissions
      .map((permission) => permission.trim())
      .filter((permission) => permission.length > 0);
    return Array.from(new Set(normalized));
  }

  private getDependencyMap(catalogKeys: Set<string>): Map<string, string[]> {
    const descriptors = this.moduleLoader.listModules();
    const dependencyMap = new Map<string, string[]>();
    descriptors.forEach((descriptor) => {
      const key = descriptor.config.name;
      if (!catalogKeys.has(key)) {
        return;
      }
      const deps = (descriptor.config.dependencies ?? []).filter((dep) => catalogKeys.has(dep));
      dependencyMap.set(key, deps);
    });
    return dependencyMap;
  }

  private getAvailableModulesCatalog(): ModuleCatalogEntry[] {
    const enabledGlobal = this.getGloballyEnabledModuleKeys();
    return MODULE_CATALOG.filter((entry) => enabledGlobal.has(entry.key));
  }

  private getGloballyEnabledModuleKeys(): Set<string> {
    const descriptors = this.moduleLoader.listModules();
    return new Set(
      descriptors.filter((descriptor) => descriptor.config.enabled).map((descriptor) => descriptor.config.name),
    );
  }

  private assertGlobalModulesEnabled(moduleKeys: string[]): void {
    if (moduleKeys.length === 0) {
      return;
    }
    const descriptors = new Map(
      this.moduleLoader.listModules().map((descriptor) => [descriptor.config.name, descriptor]),
    );
    const disabled: string[] = [];
    const missingDeps: string[] = [];

    moduleKeys.forEach((key) => {
      const descriptor = descriptors.get(key);
      if (!descriptor || !descriptor.config.enabled) {
        disabled.push(key);
        return;
      }
      if (descriptor.missingDependencies.length > 0) {
        missingDeps.push(`${key} (${descriptor.missingDependencies.join(', ')})`);
      }
    });

    if (disabled.length > 0) {
      throw new BadRequestException(`Modules not enabled globally: ${disabled.join(', ')}`);
    }

    if (missingDeps.length > 0) {
      throw new BadRequestException(`Modules missing global dependencies: ${missingDeps.join('; ')}`);
    }
  }

  private requiresConfig(moduleKey: string): boolean {
    const entry = MODULE_CATALOG.find((item) => item.key === moduleKey);
    return entry?.requiresConfig ?? false;
  }

  private deriveModuleStatus(
    moduleKey: string,
    enabled: boolean,
    configured: boolean,
  ): WorkspaceModuleStatus {
    if (!enabled) {
      return 'inactive';
    }
    const requiresConfig = this.requiresConfig(moduleKey);
    if (!requiresConfig) {
      return configured ? 'ready' : 'enabled';
    }
    return configured ? 'ready' : 'pendingConfig';
  }

  private expandEnabledSet(enabled: Set<string>, dependencyMap: Map<string, string[]>): Set<string> {
    const expanded = new Set(enabled);
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (key: string) => {
      if (visited.has(key) || visiting.has(key)) {
        return;
      }
      visiting.add(key);
      const deps = dependencyMap.get(key) ?? [];
      deps.forEach((dep) => {
        expanded.add(dep);
        visit(dep);
      });
      visiting.delete(key);
      visited.add(key);
    };

    enabled.forEach((key) => visit(key));
    return expanded;
  }

  private resolveDependencies(moduleKey: string, dependencyMap: Map<string, string[]>): Set<string> {
    const resolved = new Set<string>();
    const visiting = new Set<string>();

    const visit = (key: string) => {
      if (visiting.has(key)) {
        return;
      }
      visiting.add(key);
      const deps = dependencyMap.get(key) ?? [];
      deps.forEach((dep) => {
        if (!resolved.has(dep)) {
          resolved.add(dep);
        }
        visit(dep);
      });
      visiting.delete(key);
    };

    visit(moduleKey);
    return resolved;
  }

  private getDependents(
    moduleKey: string,
    enabled: Set<string>,
    dependencyMap: Map<string, string[]>
  ): string[] {
    const dependents: string[] = [];
    enabled.forEach((key) => {
      if (key === moduleKey) {
        return;
      }
      const deps = this.resolveDependencies(key, dependencyMap);
      if (deps.has(moduleKey)) {
        dependents.push(key);
      }
    });
    return dependents;
  }
}
