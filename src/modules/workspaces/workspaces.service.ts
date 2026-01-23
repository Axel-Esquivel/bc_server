import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { MODULE_CATALOG } from '../../core/constants/modules.catalog';
import { UsersService } from '../users/users.service';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { WorkspaceModuleSettingsService } from './workspace-module-settings.service';
import { WarehousesService } from '../warehouses/warehouses.service';
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

export type WorkspaceRole = 'admin' | 'member';

export interface WorkspaceModuleState {
  key: string;
  enabled: boolean;
  configured: boolean;
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
    private readonly moduleSettings: WorkspaceModuleSettingsService,
    private readonly warehousesService: WarehousesService,
    private readonly accountingService: AccountingService,
    private readonly moduleLoader: ModuleLoaderService,
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
      const update = { key, enabled, configured: false };
      const existing = workspace.enabledModules.find((module) => module.key === update.key);
      if (existing) {
        const wasEnabled = existing.enabled;
        existing.enabled = update.enabled;
        if (update.enabled) {
          existing.enabledAt = now;
          existing.enabledBy = userId;
          if (!wasEnabled) {
            existing.configured = false;
          }
        } else {
          existing.enabledAt = undefined;
          existing.enabledBy = undefined;
        }
      } else {
        workspace.enabledModules.push({
          key: update.key,
          enabled: update.enabled,
          configured: update.enabled ? false : false,
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

    if (invalidKeys.length > 0) {
      throw new BadRequestException(`Invalid module keys: ${invalidKeys.join(', ')}`);
    }

    const dependencyMap = this.getDependencyMap(catalogKeys);
    const requestedEnabled = new Set(enabledModules);
    const expandedEnabled = this.expandEnabledSet(requestedEnabled, dependencyMap);
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
      const current = existing.get(key);
      if (current) {
        const wasEnabled = current.enabled;
        current.enabled = enabled;
        if (enabled) {
          current.enabledAt = current.enabledAt ?? now;
          current.enabledBy = userId;
          if (!wasEnabled) {
            current.configured = false;
          }
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
        configured: enabled ? false : false,
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
    return this.moduleSettings.getSettings(workspace, moduleId);
  }

  updateModuleSettings(workspaceId: string, moduleId: string, updates: Record<string, any>) {
    const workspace = this.getWorkspace(workspaceId);
    const result = this.moduleSettings.patchSettings(workspace, moduleId, updates);
    const moduleState = workspace.enabledModules.find((module) => module.key === moduleId);
    if (moduleState && moduleState.enabled) {
      moduleState.configured = true;
    }
    this.persistState();
    return result;
  }

  getInventorySettings(workspaceId: string): InventorySettings {
    const workspace = this.getWorkspace(workspaceId);
    const settings = this.moduleSettings.getSettings(workspace, 'inventory');
    return this.normalizeInventorySettings(settings);
  }

  updateInventorySettings(workspaceId: string, dto: UpdateInventorySettingsDto): InventorySettings {
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
    const workspace = this.getWorkspace(workspaceId);
    const settings = this.moduleSettings.getSettings(workspace, 'accounting');
    return this.normalizeAccountingDefaults(settings?.defaults ?? {});
  }

  updateAccountingDefaults(workspaceId: string, dto: UpdateAccountingDefaultsDto): AccountingDefaults {
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
    const workspace = this.getWorkspace(workspaceId);
    const settings = this.moduleSettings.getSettings(workspace, 'accounting');
    const taxes = settings?.taxes;
    return Array.isArray(taxes) ? taxes : [];
  }

  createAccountingTax(workspaceId: string, dto: CreateAccountingTaxDto): AccountingTax {
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
    const workspace = this.getWorkspace(workspaceId);
    const settings = this.moduleSettings.getSettings(workspace, 'accounting');
    const mappings = settings?.categoryMappings;
    return Array.isArray(mappings) ? mappings : [];
  }

  createAccountingCategoryMapping(
    workspaceId: string,
    dto: CreateAccountingCategoryMappingDto
  ): AccountingCategoryMapping {
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
    const workspace = this.getWorkspace(workspaceId);
    this.moduleSettings.validateModuleEnabled(workspace, 'pos');
    return this.getPosSettings(workspace);
  }

  createPosTerminal(workspaceId: string, dto: CreatePosTerminalDto): PosTerminal {
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
            configured: false,
            enabledAt: undefined,
            enabledBy: undefined,
          }))
        : rawModules
            .filter((module: any) => typeof module?.key === 'string')
            .map((module: any) => ({
              key: module.key,
              enabled: Boolean(module.enabled),
              configured: typeof module.configured === 'boolean' ? module.configured : false,
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
