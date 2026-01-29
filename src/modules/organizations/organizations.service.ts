import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { MODULE_CATALOG } from '../../core/constants/modules.catalog';
import { UsersService } from '../users/users.service';
import { SafeUser } from '../users/entities/user.entity';
import { CompaniesService } from '../companies/companies.service';
import { BranchesService } from '../branches/branches.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { WarehouseType } from '../warehouses/entities/warehouse.entity';
import { ModuleLoaderService } from '../module-loader/module-loader.service';
import { BootstrapOrganizationDto } from './dto/bootstrap-organization.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {
  OrganizationCoreSettings as LegacyOrganizationCoreSettings,
  OrganizationCoreSettingsUpdate as LegacyOrganizationCoreSettingsUpdate,
} from '../../core/types/organization-core-settings.types';
import {
  OrganizationStructureSettings,
  OrganizationStructureSettingsUpdate,
} from '../../core/types/organization-structure-settings.types';
import {
  OrganizationEntity,
  OrganizationMember,
  OrganizationMemberStatus,
  OrganizationRoleDefinition,
} from './entities/organization.entity';
import { OrganizationRoleKey, OWNER_ROLE_KEY } from './types/organization-role.types';
import {
  CoreCompany,
  CoreCompanyInput,
  CoreCountry,
  CoreCountryInput,
  CoreCurrency,
  CoreCurrencyInput,
  OrganizationCoreSettings,
  OrganizationCoreSettingsUpdate,
} from './types/core-settings.types';
import { OrganizationWorkspaceSnapshot } from './types/organization-workspace-snapshot.types';
import {
  OrganizationModuleKey,
  OrganizationModuleState,
  OrganizationModuleStates,
  OrganizationModuleStatus,
} from './types/module-state.types';
import { OrganizationModuleSettingsMap } from './types/module-settings.types';
import {
  OrganizationModuleDefinition,
  OrganizationModuleOverviewItem,
  OrganizationModulesOverviewResponse,
} from './types/organization-modules-overview.types';
import type { ModuleDescriptor } from '../module-loader/module-loader.service';

interface OrganizationsState {
  organizations: OrganizationEntity[];
}

interface WorkspacesState {
  workspaces: OrganizationWorkspaceSnapshot[];
}

@Injectable()
export class OrganizationsService implements OnModuleInit {
  private readonly logger = new Logger(OrganizationsService.name);
  private readonly stateKey = 'module:organizations';
  private organizations: OrganizationEntity[] = [];

  constructor(
    private readonly moduleState: ModuleStateService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => CompaniesService))
    private readonly companiesService: CompaniesService,
    @Inject(forwardRef(() => BranchesService))
    private readonly branchesService: BranchesService,
    @Inject(forwardRef(() => WarehousesService))
    private readonly warehousesService: WarehousesService,
    private readonly moduleLoader: ModuleLoaderService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<OrganizationsState>(this.stateKey, {
      organizations: [],
    });
    const normalized: OrganizationEntity[] = [];
    (state.organizations ?? []).forEach((org) => {
      const normalizedOrg = this.normalizeOrganization(org, normalized);
      normalized.push(normalizedOrg);
    });
    this.organizations = normalized;
    this.persistState();
  }

  createOrganization(dto: CreateOrganizationDto, ownerUserId: string): OrganizationEntity {
    if (!ownerUserId) {
      throw new UnauthorizedException();
    }
    this.usersService.findById(ownerUserId);

    const now = new Date();
    const organization: OrganizationEntity = {
      id: uuid(),
      name: dto.name.trim(),
      code: this.generateUniqueCode(),
      ownerUserId,
      createdBy: ownerUserId,
      moduleStates: this.createModuleStatesMap(),
      moduleSettings: this.createModuleSettingsMap(),
      members: [
        {
          userId: ownerUserId,
          roleKey: OWNER_ROLE_KEY,
          status: OrganizationMemberStatus.Active,
          invitedAt: now,
          activatedAt: now,
          createdAt: now,
        },
      ],
      roles: [{ key: OWNER_ROLE_KEY, name: 'Owner', permissions: ['*'], isSystem: true }],
      coreSettings: this.createDefaultCoreSettings(),
      createdAt: new Date(),
    };

    this.organizations.push(organization);
    this.persistState();
    return organization;
  }

  createOrganizationBootstrap(dto: BootstrapOrganizationDto, ownerUserId: string): {
    organization: OrganizationEntity;
    companies: Array<{ id: string; name: string }>;
    branches: Array<{ id: string; name: string; companyId: string }>;
    warehouses: Array<{ id: string; name: string; companyId: string; branchId: string }>;
  } {
    if (!ownerUserId) {
      throw new UnauthorizedException();
    }

    const organization = this.createOrganization({ name: dto.name }, ownerUserId);
    const currencyIds = this.normalizeIds(dto.currencyIds);
    const countryIds = this.normalizeIds(dto.countryIds);

    if (currencyIds.length === 0) {
      throw new BadRequestException('At least one currency is required');
    }
    if (countryIds.length === 0) {
      throw new BadRequestException('At least one country is required');
    }

    const createdCompanies: Array<{ id: string; name: string }> = [];
    const coreCompanies: CoreCompany[] = [];
    const createdBranches: Array<{ id: string; name: string; companyId: string }> = [];
    const createdWarehouses: Array<{ id: string; name: string; companyId: string; branchId: string }> = [];

    (dto.companies ?? []).forEach((companyPayload) => {
      if (!countryIds.includes(companyPayload.countryId)) {
        throw new BadRequestException('Company country is not in selected countries');
      }

      const baseCurrencyId = (companyPayload.baseCurrencyId ?? currencyIds[0]).trim();
      if (!baseCurrencyId) {
        throw new BadRequestException('Company base currency is required');
      }
      const companyCurrencyIds = this.normalizeIds(
        companyPayload.currencyIds?.length ? companyPayload.currencyIds : currencyIds,
      );
      if (!companyCurrencyIds.includes(baseCurrencyId)) {
        companyCurrencyIds.push(baseCurrencyId);
      }

      const company = this.companiesService.createCompany(organization.id, ownerUserId, {
        name: companyPayload.name,
        baseCountryId: companyPayload.countryId,
        baseCurrencyId,
        currencies: companyCurrencyIds,
      });
      createdCompanies.push({ id: company.id, name: company.name });
      coreCompanies.push({ id: company.id, name: company.name, countryId: companyPayload.countryId });

      const branchMap = new Map<string, string>();
      (companyPayload.branches ?? []).forEach((branchPayload) => {
        const branch = this.branchesService.create(company.id, {
          name: branchPayload.name,
          countryId: branchPayload.countryId ?? companyPayload.countryId,
          type: branchPayload.type ?? 'retail',
          currencyIds: branchPayload.currencyIds,
          settings: undefined,
        });
        createdBranches.push({ id: branch.id, name: branch.name, companyId: company.id });
        if (branchPayload.tempKey) {
          branchMap.set(branchPayload.tempKey, branch.id);
        }
      });

      const branchIds = createdBranches.filter((item) => item.companyId === company.id).map((item) => item.id);
      (companyPayload.warehouses ?? []).forEach((warehousePayload) => {
        let branchId = warehousePayload.branchId?.trim();
        if (!branchId && warehousePayload.branchTempKey) {
          branchId = branchMap.get(warehousePayload.branchTempKey);
        }
        if (!branchId) {
          if (branchIds.length === 1) {
            branchId = branchIds[0];
          } else {
            throw new BadRequestException('Warehouse must reference a branch');
          }
        }

        const warehouse = this.warehousesService.createForCompany(company.id, {
          name: warehousePayload.name,
          branchId,
          type: warehousePayload.type ?? WarehouseType.WAREHOUSE,
        });
        createdWarehouses.push({
          id: warehouse.id,
          name: warehouse.name,
          companyId: company.id,
          branchId: warehouse.branchId,
        });
      });
    });

    organization.coreSettings = this.buildCoreSettingsFromBootstrap(countryIds, currencyIds, coreCompanies);
    organization.structureSettings = {
      companies: createdCompanies,
      branches: createdBranches,
      warehouses: createdWarehouses,
    };
    this.persistState();

    return {
      organization,
      companies: createdCompanies,
      branches: createdBranches,
      warehouses: createdWarehouses,
    };
  }

  getCoreSettings(organizationId: string): OrganizationCoreSettings {
    const organization = this.getOrganization(organizationId);
    const normalized = this.normalizeCoreSettings(organization.coreSettings);
    organization.coreSettings = normalized;
    return this.cloneCoreSettings(normalized);
  }

  updateCoreSettings(
    organizationId: string,
    update: OrganizationCoreSettingsUpdate,
  ): OrganizationCoreSettings {
    const organization = this.getOrganization(organizationId);
    const current = this.normalizeCoreSettings(organization.coreSettings);
    const next = this.mergeCoreSettings(current, update);
    organization.coreSettings = next;
    this.persistState();
    return this.cloneCoreSettings(next);
  }

  addCountry(organizationId: string, payload: CoreCountryInput): CoreCountry {
    const organization = this.getOrganization(organizationId);
    const current = this.normalizeCoreSettings(organization.coreSettings);
    const country = this.buildCoreCountry(payload);
    this.assertUniqueCountryCode(current.countries, country.code);
    const next: OrganizationCoreSettings = {
      ...current,
      countries: [...current.countries, country],
    };
    this.validateCoreSettings(next);
    organization.coreSettings = next;
    this.persistState();
    return country;
  }

  addCurrency(organizationId: string, payload: CoreCurrencyInput): CoreCurrency {
    const organization = this.getOrganization(organizationId);
    const current = this.normalizeCoreSettings(organization.coreSettings);
    const currency = this.buildCoreCurrency(payload);
    this.assertUniqueCurrencyCode(current.currencies, currency.code);
    const next: OrganizationCoreSettings = {
      ...current,
      currencies: [...current.currencies, currency],
    };
    this.validateCoreSettings(next);
    organization.coreSettings = next;
    this.persistState();
    return currency;
  }

  addCompany(organizationId: string, payload: CoreCompanyInput): CoreCompany {
    const organization = this.getOrganization(organizationId);
    const current = this.normalizeCoreSettings(organization.coreSettings);
    const company = this.buildCoreCompany(payload);
    this.assertCountryExists(current.countries, company.countryId);
    this.assertUniqueCompanyName(current.companies, company.name);
    const next: OrganizationCoreSettings = {
      ...current,
      companies: [...current.companies, company],
    };
    this.validateCoreSettings(next);
    organization.coreSettings = next;
    this.persistState();
    return company;
  }

  getLegacyCoreSettings(organizationId: string): LegacyOrganizationCoreSettings {
    const coreSettings = this.getCoreSettings(organizationId);
    return this.toLegacyCoreSettings(coreSettings);
  }

  updateLegacyCoreSettings(
    organizationId: string,
    update: LegacyOrganizationCoreSettingsUpdate,
  ): LegacyOrganizationCoreSettings {
    const organization = this.getOrganization(organizationId);
    const current = this.normalizeCoreSettings(organization.coreSettings);
    const next = this.applyLegacyCoreSettingsUpdate(current, update);
    organization.coreSettings = next;
    this.persistState();
    return this.toLegacyCoreSettings(next);
  }

  getStructureSettings(organizationId: string): OrganizationStructureSettings {
    const organization = this.getOrganization(organizationId);
    const stored = organization.structureSettings;
    return {
      companies: Array.isArray(stored?.companies) ? stored.companies : [],
      branches: Array.isArray(stored?.branches) ? stored.branches : [],
      warehouses: Array.isArray(stored?.warehouses) ? stored.warehouses : [],
    };
  }

  updateStructureSettings(
    organizationId: string,
    update: OrganizationStructureSettingsUpdate,
  ): OrganizationStructureSettings {
    const organization = this.getOrganization(organizationId);
    const current = this.getStructureSettings(organizationId);
    const next: OrganizationStructureSettings = {
      companies: update.companies ?? current.companies,
      branches: update.branches ?? current.branches,
      warehouses: update.warehouses ?? current.warehouses,
    };

    this.validateStructureSettings(next);
    organization.structureSettings = next;
    this.persistState();
    return next;
  }

  listByUser(userId: string): OrganizationEntity[] {
    return this.organizations.filter((org) =>
      org.members.some((member) => member.userId === userId),
    );
  }

  listMembershipsByUser(
    userId: string,
  ): Array<{ organizationId: string; name: string; code: string; roleKey: string; status: OrganizationMemberStatus }> {
    return this.organizations
      .map((organization) => {
        const member = organization.members.find((item) => item.userId === userId);
        if (!member) {
          return null;
        }
        return {
          organizationId: organization.id,
          name: organization.name,
          code: organization.code,
          roleKey: member.roleKey,
          status: member.status,
        };
      })
      .filter((item): item is { organizationId: string; name: string; code: string; roleKey: string; status: OrganizationMemberStatus } => Boolean(item));
  }

  hasActiveMemberships(userId: string): boolean {
    return this.organizations.some((organization) =>
      organization.members.some((member) => member.userId === userId && member.status === OrganizationMemberStatus.Active),
    );
  }

  listRoles(organizationId: string): OrganizationRoleDefinition[] {
    const organization = this.getOrganization(organizationId);
    return organization.roles.map((role) => ({
      key: role.key,
      name: role.name,
      permissions: [...role.permissions],
      isSystem: role.isSystem,
    }));
  }

  listPermissions(): Array<{ moduleKey: string; permissions: string[] }> {
    const catalog = MODULE_CATALOG.map((entry) => ({
      moduleKey: entry.key,
      permissions: [
        `${entry.key}.read`,
        `${entry.key}.write`,
        `${entry.key}.configure`,
      ],
    }));
    return [...catalog, { moduleKey: 'modules', permissions: ['modules.configure'] }];
  }

  getOrganization(organizationId: string): OrganizationEntity {
    const organization = this.organizations.find((item) => item.id === organizationId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  findByCode(code: string): OrganizationEntity | null {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    return this.organizations.find((item) => item.code === normalized) ?? null;
  }

  async listWorkspaces(organizationId: string): Promise<OrganizationWorkspaceSnapshot[]> {
    this.getOrganization(organizationId);
    const state = await this.moduleState.loadState<WorkspacesState>('module:workspaces', {
      workspaces: [],
    });
    return (state.workspaces ?? []).filter((workspace) => workspace.organizationId === organizationId);
  }

  async getOverview(organizationId: string): Promise<{
    totalWorkspaces: number;
    totalCompanies: number;
    totalBranches: number;
    totalWarehouses: number;
    workspaces: Array<{
      id: string;
      name?: string;
      activeModules: Array<{ key: string; status: string }>;
    }>;
  }> {
    const workspaces = await this.listWorkspaces(organizationId);
    const structure = this.getStructureSettings(organizationId);
    const totalCompanies = structure.companies.length;
    const totalBranches = structure.branches.length;
    const totalWarehouses = structure.warehouses.length;

    const workspaceSummaries = workspaces.map((workspace) => {
      const activeModules = (workspace.enabledModules ?? [])
        .filter((module) => module.enabled)
        .map((module) => ({
          key: module.key,
          status: module.status ?? (module.configured ? 'ready' : 'enabled'),
        }));

      return {
        id: workspace.id,
        name: workspace.name,
        activeModules,
      };
    });

    return {
      totalWorkspaces: workspaces.length,
      totalCompanies,
      totalBranches,
      totalWarehouses,
      workspaces: workspaceSummaries,
    };
  }

  updateOrganization(
    organizationId: string,
    requesterId: string,
    dto: UpdateOrganizationDto,
  ): OrganizationEntity {
    const organization = this.getOrganization(organizationId);
    this.assertOwner(organization, requesterId);

    if (dto.name !== undefined) {
      organization.name = dto.name.trim();
    }

    this.persistState();
    return organization;
  }

  async getModulesOverview(organizationId: string): Promise<OrganizationModulesOverviewResponse> {
    const organization = this.getOrganization(organizationId);
    const descriptors = this.moduleLoader.listModules();
    const states = this.cloneModuleStates(organization.moduleStates);
    const modules = this.buildModuleOverviewItems(states, descriptors);
    return this.buildModulesOverviewResponse(modules);
  }

  async enableModules(
    organizationId: string,
    moduleKeys: string[],
    userId: string,
  ): Promise<OrganizationModulesOverviewResponse> {
    const organization = this.getOrganization(organizationId);
    this.assertPermission(organization, userId, 'modules.configure');

    const normalizedKeys = this.normalizeIds(moduleKeys);
    const descriptors = this.moduleLoader.listModules();
    const descriptorMap = this.getModuleDescriptorMap(descriptors);
    this.assertModuleKeysExist(descriptorMap, normalizedKeys);

    const dependencyMap = this.getModuleDependencyMap(descriptors);
    const expandedKeys = this.expandDependencies(new Set(normalizedKeys), dependencyMap);
    this.assertGlobalModulesEnabled(descriptorMap, Array.from(expandedKeys));

    const nextStates: OrganizationModuleStates = this.createModuleStatesMap();
    descriptors.forEach((descriptor) => {
      const key = descriptor.config.name;
      const existing = this.ensureModuleState(organization.moduleStates, key);
      if (!expandedKeys.has(key)) {
        nextStates[key] = this.createModuleState(OrganizationModuleStatus.Disabled);
        return;
      }
      const status =
        existing.status === OrganizationModuleStatus.Configured
          ? OrganizationModuleStatus.Configured
          : OrganizationModuleStatus.EnabledUnconfigured;
      nextStates[key] = this.createModuleState(status, existing.configuredAt, existing.configuredBy);
    });

    organization.moduleStates = nextStates;
    if (!organization.moduleSettings) {
      organization.moduleSettings = this.createModuleSettingsMap();
    }
    this.persistState();

    const modules = this.buildModuleOverviewItems(organization.moduleStates, descriptors);
    return this.buildModulesOverviewResponse(modules);
  }

  async markModuleConfigured(
    organizationId: string,
    moduleKey: string,
    userId: string,
  ): Promise<OrganizationModuleState> {
    const organization = this.getOrganization(organizationId);
    this.assertPermission(organization, userId, 'modules.configure');

    const descriptors = this.moduleLoader.listModules();
    const descriptorMap = this.getModuleDescriptorMap(descriptors);
    this.assertModuleKeysExist(descriptorMap, [moduleKey]);

    const existing = this.ensureModuleState(organization.moduleStates, moduleKey);
    if (existing.status === OrganizationModuleStatus.Disabled) {
      throw new BadRequestException('Module is disabled');
    }

    const configuredAt = new Date().toISOString();
    const nextState = this.createModuleState(OrganizationModuleStatus.Configured, configuredAt, userId);
    organization.moduleStates[moduleKey] = nextState;
    this.persistState();
    return nextState;
  }

  addMember(
    organizationId: string,
    requesterId: string,
    member: { userId: string; role: OrganizationRoleKey },
  ): OrganizationEntity {
    const organization = this.getOrganization(organizationId);
    this.assertRoleForMemberChange(organization, requesterId, member.role, null);
    this.ensureRoleExists(organization, member.role);
    this.usersService.findById(member.userId);

    const existing = organization.members.find((item) => item.userId === member.userId);
    if (existing) {
      if (existing.status === OrganizationMemberStatus.Active) {
        throw new ConflictException('Organization member already exists');
      }
        if (existing.roleKey === OWNER_ROLE_KEY) {
          throw new ForbiddenException('Owner role cannot be changed');
        }
      const invitedAt = new Date();
      existing.status = OrganizationMemberStatus.Active;
      existing.invitedBy = requesterId;
      existing.invitedAt = invitedAt;
      existing.activatedAt = invitedAt;
      existing.createdAt = existing.createdAt ?? invitedAt;
      existing.requestedBy = existing.requestedBy ?? member.userId;
      existing.requestedAt = existing.requestedAt ?? existing.invitedAt;
      this.persistState();
      return organization;
    }

    const invitedAt = new Date();
    const user = this.usersService.findById(member.userId);
    organization.members.push({
      userId: member.userId,
      email: user?.email?.toLowerCase(),
      roleKey: member.role,
      status: OrganizationMemberStatus.Active,
      invitedBy: requesterId,
      invitedAt,
      activatedAt: invitedAt,
      createdAt: invitedAt,
    });
    this.persistState();
    return organization;
  }

  addMemberByEmail(
    organizationId: string,
    requesterId: string,
    email: string,
    role: OrganizationRoleKey,
  ): OrganizationEntity {
    const organization = this.getOrganization(organizationId);
    this.assertRoleForMemberChange(organization, requesterId, role, null);
    this.ensureRoleExists(organization, role);

    const normalizedEmail = email.trim().toLowerCase();
    const user = this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundException('User with email not found');
    }

    const existing = organization.members.find((item) => item.userId === user.id);
    if (existing) {
      if (existing.status === OrganizationMemberStatus.Active) {
        throw new ConflictException('User already member');
      }
        if (existing.roleKey === OWNER_ROLE_KEY) {
          throw new ForbiddenException('Owner role cannot be changed');
        }
      const invitedAt = new Date();
      existing.status = OrganizationMemberStatus.Active;
      existing.invitedBy = requesterId;
      existing.invitedAt = invitedAt;
      existing.activatedAt = invitedAt;
      existing.email = existing.email ?? user.email?.toLowerCase();
      existing.createdAt = existing.createdAt ?? invitedAt;
      this.persistState();
      return organization;
    }

    const invitedAt = new Date();
    organization.members.push({
      userId: user.id,
      email: user.email?.toLowerCase(),
      roleKey: role,
      status: OrganizationMemberStatus.Active,
      invitedBy: requesterId,
      invitedAt,
      activatedAt: invitedAt,
      createdAt: invitedAt,
    });
    this.persistState();
    return organization;
  }

  requestJoin(
    organizationId: string,
    requesterId: string,
    roleKey?: OrganizationRoleKey,
  ): OrganizationEntity {
    const organization = this.getOrganization(organizationId);
    const fallbackRole = organization.roles[0]?.key;
    if (!fallbackRole && !roleKey) {
      throw new BadRequestException('Role key is required');
    }
    const targetRole = roleKey && roleKey.trim() ? roleKey.trim() : fallbackRole;
    if (!targetRole) {
      throw new BadRequestException('Role key is required');
    }
    this.ensureRoleExists(organization, targetRole);

    const existing = organization.members.find((item) => item.userId === requesterId);
    if (existing) {
      if (!existing.email) {
        const requester = this.usersService.findById(requesterId);
        existing.email = requester?.email?.toLowerCase();
      }
      if (!existing.createdAt) {
        existing.createdAt = new Date();
      }
      if (existing.status === OrganizationMemberStatus.Active) {
        return organization;
      }
      if (existing.requestedBy) {
        return organization;
      }
      existing.requestedBy = requesterId;
      existing.requestedAt = new Date();
      this.persistState();
      return organization;
    }

    const requestedAt = new Date();
    const requester = this.usersService.findById(requesterId);
    organization.members.push({
      userId: requesterId,
      email: requester?.email?.toLowerCase(),
      roleKey: targetRole,
      status: OrganizationMemberStatus.Pending,
      requestedBy: requesterId,
      requestedAt,
      createdAt: requestedAt,
    });
    this.persistState();
    return organization;
  }

  requestJoinByCode(
    code: string,
    requesterId: string,
    roleKey?: OrganizationRoleKey,
  ): OrganizationEntity {
    const organization = this.findByCode(code);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return this.requestJoin(organization.id, requesterId, roleKey);
  }

  requestJoinBySelector(
    payload: { code?: string; organizationId?: string; email?: string; roleKey?: OrganizationRoleKey },
    requesterId: string,
  ): OrganizationEntity {
    const trimmedCode = payload.code?.trim();
    const trimmedOrgId = payload.organizationId?.trim();
    const trimmedEmail = payload.email?.trim().toLowerCase();

    if (trimmedOrgId) {
      return this.requestJoin(trimmedOrgId, requesterId, payload.roleKey);
    }

    if (trimmedCode) {
      return this.requestJoinByCode(trimmedCode, requesterId, payload.roleKey);
    }

    if (trimmedEmail) {
      const user = this.usersService.findById(requesterId);
      if (user.email.toLowerCase() !== trimmedEmail) {
        throw new BadRequestException('Email does not match requester');
      }

      const memberships = this.listMembershipsByUser(requesterId);
      if (memberships.length === 0) {
        throw new NotFoundException('Organization invitation not found');
      }
      if (memberships.length > 1) {
        throw new BadRequestException('Multiple invitations found, use code instead');
      }

      const target = memberships[0];
      const organization = this.getOrganization(target.organizationId);
      return organization;
    }

    throw new BadRequestException('Join selector is required');
  }

  requestJoinByEmail(
    payload: { email: string; orgCode?: string },
    requesterId: string,
  ): OrganizationEntity {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const orgCode = payload.orgCode?.trim();
    if (!orgCode) {
      throw new BadRequestException('Organization code is required');
    }

    const requester = this.usersService.findById(requesterId);
    if (requester.email.toLowerCase() !== normalizedEmail) {
      throw new BadRequestException('Email does not match requester');
    }

    const organization = this.findByCode(orgCode);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.requestJoin(organization.id, requesterId);
  }

  acceptMember(
    organizationId: string,
    requesterId: string,
    targetUserId: string,
  ): OrganizationEntity {
    const organization = this.getOrganization(organizationId);
    this.assertRoleForMemberChange(organization, requesterId, null, null);

    const member = organization.members.find((item) => item.userId === targetUserId);
    if (!member) {
      throw new NotFoundException('Organization member not found');
    }

    if (!member.requestedBy) {
      throw new BadRequestException('Member was not requested');
    }

    if (member.status !== OrganizationMemberStatus.Pending) {
      throw new BadRequestException('Member is not pending');
    }

    member.status = OrganizationMemberStatus.Active;
    member.activatedAt = new Date();
    member.createdAt = member.createdAt ?? member.activatedAt ?? new Date();
    this.persistState();
    return organization;
  }

  rejectMember(
    organizationId: string,
    requesterId: string,
    targetUserId: string,
  ): OrganizationEntity {
    const organization = this.getOrganization(organizationId);
    this.assertRoleForMemberChange(organization, requesterId, null, null);

    const index = organization.members.findIndex((item) => item.userId === targetUserId);
    if (index === -1) {
      throw new NotFoundException('Organization member not found');
    }

    const member = organization.members[index];
    if (!member.requestedBy) {
      throw new BadRequestException('Member was not requested');
    }
    if (member.status !== OrganizationMemberStatus.Pending) {
      throw new BadRequestException('Member is not pending');
    }
    if (member.roleKey === OWNER_ROLE_KEY) {
      const ownerCount = organization.members.filter((item) => item.roleKey === OWNER_ROLE_KEY).length;
      if (ownerCount <= 1) {
        throw new BadRequestException('At least one owner is required');
      }
    }

    organization.members.splice(index, 1);
    this.persistState();
    return organization;
  }

  updateMemberRole(
    organizationId: string,
    requesterId: string,
    targetUserId: string,
    nextRole: OrganizationRoleKey,
  ): OrganizationEntity {
    const organization = this.getOrganization(organizationId);
    const member = organization.members.find((item) => item.userId === targetUserId);
    if (!member) {
      throw new NotFoundException('Organization member not found');
    }
    if (member.roleKey === OWNER_ROLE_KEY && nextRole !== OWNER_ROLE_KEY) {
      throw new ForbiddenException('Owner role cannot be changed');
    }

    this.assertRoleForMemberChange(organization, requesterId, nextRole, member.roleKey, targetUserId);
    this.ensureRoleExists(organization, nextRole);

    member.roleKey = nextRole;
    this.persistState();
    return organization;
  }

  removeMember(
    organizationId: string,
    requesterId: string,
    targetUserId: string,
  ): OrganizationEntity {
    const organization = this.getOrganization(organizationId);
    this.assertRoleForMemberChange(organization, requesterId, null, null, targetUserId);

    const index = organization.members.findIndex((item) => item.userId === targetUserId);
    if (index === -1) {
      throw new NotFoundException('Organization member not found');
    }

    const member = organization.members[index];
    if (member.roleKey === OWNER_ROLE_KEY) {
      throw new ForbiddenException('Owner role cannot be removed');
    }

    organization.members.splice(index, 1);
    this.usersService.clearDefaultOrganization(targetUserId, organizationId);
    this.persistState();
    return organization;
  }

  leaveOrganization(organizationId: string, userId: string): OrganizationEntity {
    const organization = this.getOrganization(organizationId);
    const index = organization.members.findIndex((item) => item.userId === userId);
    if (index === -1) {
      throw new NotFoundException('Organization member not found');
    }

    const member = organization.members[index];
    if (member.roleKey === OWNER_ROLE_KEY) {
      throw new ForbiddenException('Owner role cannot leave organization');
    }

    organization.members.splice(index, 1);
    this.usersService.clearDefaultOrganization(userId, organizationId);
    this.persistState();
    return organization;
  }

  setDefaultOrganization(organizationId: string, userId: string): SafeUser {
    const organization = this.getOrganization(organizationId);
    const member = organization.members.find((item) => item.userId === userId);
    if (!member) {
      throw new ForbiddenException('User is not a member of organization');
    }
    if (member.status !== OrganizationMemberStatus.Active) {
      throw new ForbiddenException('Membership is pending approval');
    }

    return this.usersService.setDefaultOrganization(userId, organizationId);
  }

  deleteOrganization(organizationId: string, requesterId: string): void {
    const organization = this.getOrganization(organizationId);
    this.assertOwner(organization, requesterId);

    this.organizations = this.organizations.filter((item) => item.id !== organizationId);
    organization.members.forEach((member) => {
      this.usersService.clearDefaultOrganization(member.userId, organizationId);
    });
    this.companiesService.removeByOrganization(organizationId);
    this.persistState();
  }

  createRole(
    organizationId: string,
    requesterId: string,
    payload: { key: string; name: string; permissions: string[] },
  ): OrganizationRoleDefinition[] {
    const organization = this.getOrganization(organizationId);
    this.assertOwner(organization, requesterId);

    const key = payload.key.trim();
    if (!key) {
      throw new BadRequestException('Role key is required');
    }
    if (key === OWNER_ROLE_KEY) {
      throw new BadRequestException('Owner role is reserved');
    }
    if (organization.roles.some((role) => role.key === key)) {
      throw new BadRequestException('Role key already exists');
    }

    const permissions = this.normalizePermissions(payload.permissions);
    this.validatePermissions(permissions);

    organization.roles.push({
      key,
      name: payload.name.trim(),
      permissions,
      isSystem: false,
    });
    this.persistState();
    return this.listRoles(organizationId);
  }

  updateRole(
    organizationId: string,
    requesterId: string,
    roleKey: string,
    payload: { name?: string; permissions?: string[] },
  ): OrganizationRoleDefinition[] {
    const organization = this.getOrganization(organizationId);
    this.assertOwner(organization, requesterId);

    const role = organization.roles.find((item) => item.key === roleKey);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.key === OWNER_ROLE_KEY) {
      throw new BadRequestException('Owner role is fixed');
    }

    if (payload.name !== undefined) {
      role.name = payload.name.trim();
    }
    if (payload.permissions !== undefined) {
      const permissions = this.normalizePermissions(payload.permissions);
      this.validatePermissions(permissions);
      role.permissions = permissions;
    }

    this.persistState();
    return this.listRoles(organizationId);
  }

  deleteRole(organizationId: string, requesterId: string, roleKey: string): OrganizationRoleDefinition[] {
    const organization = this.getOrganization(organizationId);
    this.assertOwner(organization, requesterId);

    if (roleKey === OWNER_ROLE_KEY) {
      throw new BadRequestException('Owner role cannot be removed');
    }
    const assigned = organization.members.some((member) => member.roleKey === roleKey);
    if (assigned) {
      throw new BadRequestException('Role is assigned to members');
    }

    const index = organization.roles.findIndex((role) => role.key === roleKey);
    if (index === -1) {
      throw new NotFoundException('Role not found');
    }
    organization.roles.splice(index, 1);
    this.persistState();
    return this.listRoles(organizationId);
  }

  getMember(organizationId: string, userId?: string): OrganizationMember | null {
    if (!userId) {
      return null;
    }

    const organization = this.getOrganization(organizationId);
    return organization.members.find((item) => item.userId === userId) ?? null;
  }

  getMemberRole(organizationId: string, userId?: string): OrganizationRoleKey | null {
    const member = this.getMember(organizationId, userId);
    if (!member || member.status !== OrganizationMemberStatus.Active) {
      return null;
    }
    return member.roleKey ?? null;
  }

  getModuleState(organizationId: string, moduleKey: OrganizationModuleKey): OrganizationModuleState {
    const organization = this.getOrganization(organizationId);
    const state = this.ensureModuleState(organization.moduleStates, moduleKey);
    return { ...state };
  }

  private assertRoleForMemberChange(
    organization: OrganizationEntity,
    requesterId: string,
    desiredRole: OrganizationRoleKey | null,
    currentRole: OrganizationRoleKey | null,
    targetUserId?: string,
  ): void {
    this.assertPermission(organization, requesterId, 'users.write');

    if (currentRole === OWNER_ROLE_KEY && desiredRole !== OWNER_ROLE_KEY) {
      const ownerCount = organization.members.filter((member) => member.roleKey === OWNER_ROLE_KEY).length;
      if (ownerCount <= 1 && targetUserId) {
        throw new BadRequestException('At least one owner is required');
      }
    }
  }

  private generateUniqueCode(existing: OrganizationEntity[] = this.organizations): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code =
        Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join(
          '',
        ) +
        '-' +
        Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');

      if (!existing.some((org) => org.code === code)) {
        return code;
      }
    }

    return `${uuid().slice(0, 4).toUpperCase()}-${uuid().slice(9, 13).toUpperCase()}`;
  }

  private normalizeOrganization(
    raw: Partial<OrganizationEntity>,
    existing: OrganizationEntity[],
  ): OrganizationEntity {
    const baseDate = raw.createdAt ? new Date(raw.createdAt) : new Date();
    const members: OrganizationMember[] = (raw.members ?? []).map((member) => {
      const legacyMember = member as OrganizationMember & {
        role?: string;
        acceptedAt?: Date | string;
        invitedAt?: Date | string;
        requestedAt?: Date | string;
        activatedAt?: Date | string;
      };
      const role: OrganizationRoleKey =
        typeof legacyMember.roleKey === 'string' && legacyMember.roleKey.trim()
          ? legacyMember.roleKey.trim()
          : typeof legacyMember.role === 'string' && legacyMember.role.trim()
            ? legacyMember.role.trim()
            : 'member';
      const status: OrganizationMember['status'] =
        legacyMember.status === OrganizationMemberStatus.Pending
          ? OrganizationMemberStatus.Pending
          : OrganizationMemberStatus.Active;
      const invitedAt = legacyMember.invitedAt ? new Date(legacyMember.invitedAt) : undefined;
      const requestedAt = legacyMember.requestedAt ? new Date(legacyMember.requestedAt) : undefined;
      const activatedAt =
        legacyMember.activatedAt
          ? new Date(legacyMember.activatedAt)
          : legacyMember.acceptedAt
            ? new Date(legacyMember.acceptedAt)
            : status === OrganizationMemberStatus.Active
              ? invitedAt ?? requestedAt ?? baseDate
              : undefined;
      const createdAt =
        legacyMember.createdAt
          ? new Date(legacyMember.createdAt)
          : invitedAt ?? requestedAt ?? activatedAt ?? baseDate;
      return {
        userId: legacyMember.userId,
        roleKey: role,
        status,
        email: typeof legacyMember.email === 'string' ? legacyMember.email.toLowerCase() : undefined,
        invitedBy: typeof legacyMember.invitedBy === 'string' ? legacyMember.invitedBy : undefined,
        requestedBy:
          typeof legacyMember.requestedBy === 'string' ? legacyMember.requestedBy : undefined,
        invitedAt,
        requestedAt,
        activatedAt,
        createdAt,
      };
    });

    const ownerUserId =
      raw.ownerUserId ||
      members.find((member) => member.roleKey === OWNER_ROLE_KEY)?.userId ||
      members[0]?.userId ||
      'unknown';
    const createdBy = raw.createdBy || raw.ownerUserId || ownerUserId;

    if (!members.some((member) => member.userId === ownerUserId)) {
      members.push({
        userId: ownerUserId,
        roleKey: OWNER_ROLE_KEY,
        status: OrganizationMemberStatus.Active,
        invitedAt: baseDate,
        activatedAt: baseDate,
        createdAt: baseDate,
      });
    }

    const roles = this.normalizeRoles(raw.roles, members);
    const coreSettings = this.normalizeCoreSettings(raw.coreSettings);
    const structureSettings = raw.structureSettings
      ? {
          companies: Array.isArray(raw.structureSettings.companies)
            ? raw.structureSettings.companies
            : [],
          branches: Array.isArray(raw.structureSettings.branches)
            ? raw.structureSettings.branches
            : [],
          warehouses: Array.isArray(raw.structureSettings.warehouses)
            ? raw.structureSettings.warehouses
            : [],
        }
      : undefined;

    return {
      id: raw.id || uuid(),
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Organization',
      code: raw.code || this.generateUniqueCode(existing),
      ownerUserId,
      createdBy,
      members,
      roles,
      coreSettings,
      structureSettings,
      moduleStates: this.normalizeModuleStates(raw.moduleStates),
      moduleSettings: this.normalizeModuleSettings(raw.moduleSettings),
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    };
  }

  private normalizeRoles(
    rawRoles: OrganizationRoleDefinition[] | undefined,
    members: OrganizationMember[],
  ): OrganizationRoleDefinition[] {
    const permissionSet = this.getPermissionSet();
    const mapped = Array.isArray(rawRoles)
      ? rawRoles
          .filter((role) => typeof role.key === 'string' && role.key.trim())
          .map((role) => {
      const permissions = Array.isArray(role.permissions)
        ? role.permissions.filter(
            (permission) => permission === '*' || permissionSet.has(permission),
          )
        : [];
      const legacySystem = (role as { system?: boolean }).system === true;
      return {
        key: role.key.trim(),
        name: typeof role.name === 'string' && role.name.trim() ? role.name.trim() : role.key.trim(),
        permissions,
        isSystem: role.isSystem === true || legacySystem || role.key === OWNER_ROLE_KEY || role.key === 'admin' || role.key === 'member',
      };
          })
      : [];

    const roleKeys = new Set(mapped.map((role) => role.key));
    if (!roleKeys.has(OWNER_ROLE_KEY)) {
      mapped.unshift({ key: OWNER_ROLE_KEY, name: 'Owner', permissions: ['*'], isSystem: true });
      roleKeys.add(OWNER_ROLE_KEY);
    }

    const memberRoles = new Set(members.map((member) => member.roleKey));
    if (memberRoles.has('admin') && !roleKeys.has('admin')) {
      mapped.push({ key: 'admin', name: 'Admin', permissions: [], isSystem: true });
    }
    if (memberRoles.has('member') && !roleKeys.has('member')) {
      mapped.push({ key: 'member', name: 'Member', permissions: [], isSystem: true });
    }

    return mapped;
  }

  private getPermissionSet(): Set<string> {
    const set = new Set<string>();
    MODULE_CATALOG.forEach((entry) => {
      set.add(`${entry.key}.read`);
      set.add(`${entry.key}.write`);
      set.add(`${entry.key}.configure`);
    });
    set.add('modules.configure');
    return set;
  }

  private assertOwner(organization: OrganizationEntity, requesterId: string): void {
    const member = this.getMember(organization.id, requesterId);
    if (!member) {
      throw new ForbiddenException('User is not a member of organization');
    }
    if (member.status !== OrganizationMemberStatus.Active) {
      throw new ForbiddenException('Membership is pending approval');
    }
    if (member.roleKey !== OWNER_ROLE_KEY) {
      throw new ForbiddenException('Owner role required');
    }
  }

  private assertPermission(organization: OrganizationEntity, requesterId: string, permission: string): void {
    const member = this.getMember(organization.id, requesterId);
    if (!member) {
      throw new ForbiddenException('User is not a member of organization');
    }
    if (member.status !== OrganizationMemberStatus.Active) {
      throw new ForbiddenException('Membership is pending approval');
    }

    const role = organization.roles.find((item) => item.key === member.roleKey);
    if (!role) {
      throw new ForbiddenException('Role not found');
    }
    if (role.permissions.includes('*')) {
      return;
    }
    if (!role.permissions.includes(permission)) {
      throw new ForbiddenException('Permission denied');
    }
  }

  private ensureRoleExists(organization: OrganizationEntity, roleKey: string): void {
    if (!organization.roles.some((role) => role.key === roleKey)) {
      throw new BadRequestException('Role not found');
    }
  }

  hasPermissionAnyOrganization(userId: string, permission: string): boolean {
    return this.organizations.some((organization) => {
      const member = organization.members.find(
        (item) => item.userId === userId && item.status === OrganizationMemberStatus.Active,
      );
      if (!member) {
        return false;
      }
      const role = organization.roles.find((item) => item.key === member.roleKey);
      if (!role) {
        return false;
      }
      return this.hasPermission(role.permissions, permission);
    });
  }

  private validatePermissions(permissions: string[]): void {
    if (permissions.includes('*')) {
      return;
    }
    const allowed = this.getPermissionSet();
    const invalid = permissions.filter((permission) => !allowed.has(permission));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid permissions: ${invalid.join(', ')}`);
    }
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

  private hasPermission(permissions: string[], required: string): boolean {
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

  private createModuleStatesMap(): OrganizationModuleStates {
    const states: OrganizationModuleStates = {};
    return states;
  }

  private cloneModuleStates(states: OrganizationModuleStates): OrganizationModuleStates {
    const cloned: OrganizationModuleStates = { ...states };
    return cloned;
  }

  private createModuleSettingsMap(): OrganizationModuleSettingsMap {
    const settings: OrganizationModuleSettingsMap = {};
    return settings;
  }

  private buildModuleOverviewItems(
    states: OrganizationModuleStates,
    descriptors: ModuleDescriptor[],
  ): OrganizationModuleOverviewItem[] {
    return descriptors.map((descriptor) => {
      const definition = this.buildModuleDefinition(descriptor);
      const state = this.ensureModuleState(states, definition.key);
      return this.buildModuleOverviewItem(definition, state);
    });
  }

  private buildModuleDefinition(descriptor: ModuleDescriptor): OrganizationModuleDefinition {
    const dependencies = Array.isArray(descriptor.config.dependencies) ? descriptor.config.dependencies : [];
    const definition: OrganizationModuleDefinition = {
      key: descriptor.config.name,
      name: descriptor.config.name,
      dependencies: [...dependencies],
      isSystem: descriptor.config.isSystem ?? false,
    };
    return definition;
  }

  private buildModuleOverviewItem(
    definition: OrganizationModuleDefinition,
    state: OrganizationModuleState,
  ): OrganizationModuleOverviewItem {
    const item: OrganizationModuleOverviewItem = {
      ...definition,
      state,
    };
    return item;
  }

  private buildModulesOverviewResponse(
    modules: OrganizationModuleOverviewItem[],
  ): OrganizationModulesOverviewResponse {
    const response: OrganizationModulesOverviewResponse = { modules };
    return response;
  }

  private ensureModuleState(
    states: OrganizationModuleStates,
    key: OrganizationModuleKey,
  ): OrganizationModuleState {
    const existing = states[key];
    if (existing) {
      return existing;
    }
    const fallback = this.createModuleState(OrganizationModuleStatus.Disabled);
    states[key] = fallback;
    return fallback;
  }

  private createModuleState(
    status: OrganizationModuleStatus,
    configuredAt?: string,
    configuredBy?: string,
  ): OrganizationModuleState {
    const state: OrganizationModuleState = {
      status,
      configuredAt,
      configuredBy,
    };
    return state;
  }

  private normalizeModuleStates(raw: unknown): OrganizationModuleStates {
    const normalized = this.createModuleStatesMap();
    if (!raw || typeof raw !== 'object') {
      return normalized;
    }
    const record = raw as Record<string, unknown>;
    Object.keys(record).forEach((key) => {
      const state = this.normalizeModuleStateValue(record[key]);
      if (state) {
        normalized[key] = state;
      }
    });
    return normalized;
  }

  private normalizeModuleSettings(raw: unknown): OrganizationModuleSettingsMap {
    if (!raw || typeof raw !== 'object') {
      return this.createModuleSettingsMap();
    }
    const settings: OrganizationModuleSettingsMap = { ...(raw as OrganizationModuleSettingsMap) };
    return settings;
  }

  private normalizeModuleStateValue(value: unknown): OrganizationModuleState | null {
    if (typeof value === 'string') {
      return this.createModuleState(this.mapLegacyModuleStatus(value));
    }
    if (!value || typeof value !== 'object') {
      return null;
    }
    const rawState = value as {
      status?: unknown;
      configuredAt?: unknown;
      configuredBy?: unknown;
    };
    const status = this.normalizeModuleStatus(rawState.status);
    if (!status) {
      return null;
    }
    const configuredAt = typeof rawState.configuredAt === 'string' ? rawState.configuredAt : undefined;
    const configuredBy = typeof rawState.configuredBy === 'string' ? rawState.configuredBy : undefined;
    return this.createModuleState(status, configuredAt, configuredBy);
  }

  private normalizeModuleStatus(value: unknown): OrganizationModuleStatus | null {
    if (value === OrganizationModuleStatus.Disabled) {
      return OrganizationModuleStatus.Disabled;
    }
    if (value === OrganizationModuleStatus.EnabledUnconfigured) {
      return OrganizationModuleStatus.EnabledUnconfigured;
    }
    if (value === OrganizationModuleStatus.Configured) {
      return OrganizationModuleStatus.Configured;
    }
    if (typeof value === 'string') {
      return this.mapLegacyModuleStatus(value);
    }
    return null;
  }

  private mapLegacyModuleStatus(value: string): OrganizationModuleStatus {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'disabled' || normalized === 'inactive') {
      return OrganizationModuleStatus.Disabled;
    }
    if (
      normalized === 'enabled_unconfigured' ||
      normalized === 'enabled' ||
      normalized === 'pendingconfig' ||
      normalized === 'pending_config'
    ) {
      return OrganizationModuleStatus.EnabledUnconfigured;
    }
    if (normalized === 'configured' || normalized === 'ready') {
      return OrganizationModuleStatus.Configured;
    }
    if (normalized === 'error') {
      return OrganizationModuleStatus.EnabledUnconfigured;
    }
    return OrganizationModuleStatus.Disabled;
  }

  private getModuleDescriptorMap(
    descriptors: ModuleDescriptor[],
  ): Map<OrganizationModuleKey, ModuleDescriptor> {
    return new Map(descriptors.map((descriptor) => [descriptor.config.name, descriptor]));
  }

  private assertModuleKeysExist(
    descriptors: Map<OrganizationModuleKey, ModuleDescriptor>,
    moduleKeys: string[],
  ): void {
    const invalid = moduleKeys.filter((key) => !descriptors.has(key));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid module keys: ${invalid.join(', ')}`);
    }
  }

  private getModuleDependencyMap(descriptors: ModuleDescriptor[]): Map<string, string[]> {
    const dependencyMap = new Map<string, string[]>();
    descriptors.forEach((descriptor) => {
      const deps = Array.isArray(descriptor.config.dependencies) ? descriptor.config.dependencies : [];
      dependencyMap.set(descriptor.config.name, deps);
    });
    return dependencyMap;
  }

  private expandDependencies(keys: Set<string>, dependencyMap: Map<string, string[]>): Set<string> {
    const expanded = new Set<string>();
    const visiting = new Set<string>();

    const visit = (key: string) => {
      if (visiting.has(key)) {
        return;
      }
      visiting.add(key);
      const deps = dependencyMap.get(key) ?? [];
      deps.forEach((dep) => visit(dep));
      visiting.delete(key);
      expanded.add(key);
    };

    keys.forEach((key) => visit(key));
    return expanded;
  }

  private assertGlobalModulesEnabled(
    descriptors: Map<OrganizationModuleKey, ModuleDescriptor>,
    moduleKeys: string[],
  ): void {
    if (moduleKeys.length === 0) {
      return;
    }
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

  private normalizeIds(values: string[] | undefined): string[] {
    if (!Array.isArray(values)) {
      return [];
    }
    const normalized = values
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value.length > 0);
    return Array.from(new Set(normalized));
  }

  private normalizeCurrencyIds(rawCurrencyIds: string[], baseCurrencyId?: string): string[] {
    const normalized = this.normalizeIds(rawCurrencyIds);
    if (baseCurrencyId && !normalized.includes(baseCurrencyId)) {
      normalized.push(baseCurrencyId);
    }
    return Array.from(new Set(normalized));
  }

  private createDefaultCoreSettings(): OrganizationCoreSettings {
    return {
      countries: [],
      currencies: [],
      companies: [],
    };
  }

  private cloneCoreSettings(settings: OrganizationCoreSettings): OrganizationCoreSettings {
    return {
      countries: settings.countries.map((country) => ({ ...country })),
      currencies: settings.currencies.map((currency) => ({ ...currency })),
      companies: settings.companies.map((company) => ({ ...company })),
    };
  }

  private normalizeCoreSettings(raw: unknown): OrganizationCoreSettings {
    const fallback = this.createDefaultCoreSettings();
    if (!raw || typeof raw !== 'object') {
      return fallback;
    }

    const candidate = raw as Partial<OrganizationCoreSettings> & LegacyOrganizationCoreSettings;
    const hasNewShape =
      Array.isArray(candidate.countries) ||
      Array.isArray(candidate.currencies) ||
      Array.isArray(candidate.companies);

    if (hasNewShape) {
      return {
        countries: this.normalizeStoredCountries(candidate.countries),
        currencies: this.normalizeStoredCurrencies(candidate.currencies),
        companies: this.normalizeStoredCompanies(candidate.companies),
      };
    }

    return this.buildCoreSettingsFromLegacy(candidate);
  }

  private buildCoreSettingsFromLegacy(
    legacy: LegacyOrganizationCoreSettings,
  ): OrganizationCoreSettings {
    const countryId = typeof legacy.countryId === 'string' ? legacy.countryId.trim() : '';
    const currencies = this.normalizeIds(legacy.currencyIds);
    const baseCurrencyId =
      typeof legacy.baseCurrencyId === 'string' ? legacy.baseCurrencyId.trim() : undefined;
    const orderedCurrencyIds = this.applyBaseCurrencyOrder(currencies, baseCurrencyId);
    return {
      countries: countryId ? this.buildCoreCountriesFromIds([countryId]) : [],
      currencies: this.buildCoreCurrenciesFromIds(orderedCurrencyIds),
      companies: [],
    };
  }

  private buildCoreSettingsFromBootstrap(
    countryIds: string[],
    currencyIds: string[],
    companies: CoreCompany[],
  ): OrganizationCoreSettings {
    const countries = this.buildCoreCountriesFromIds(this.normalizeIds(countryIds));
    const currencies = this.buildCoreCurrenciesFromIds(this.normalizeIds(currencyIds));
    const normalizedCompanies = this.normalizeCoreCompanies(companies);
    const next: OrganizationCoreSettings = {
      countries,
      currencies,
      companies: normalizedCompanies,
    };
    this.validateCoreSettings(next);
    return next;
  }

  private mergeCoreSettings(
    current: OrganizationCoreSettings,
    update: OrganizationCoreSettingsUpdate,
  ): OrganizationCoreSettings {
    const next: OrganizationCoreSettings = {
      countries:
        update.countries !== undefined
          ? this.normalizeCoreCountries(update.countries)
          : current.countries,
      currencies:
        update.currencies !== undefined
          ? this.normalizeCoreCurrencies(update.currencies)
          : current.currencies,
      companies:
        update.companies !== undefined
          ? this.normalizeCoreCompanies(update.companies)
          : current.companies,
    };
    this.validateCoreSettings(next);
    return next;
  }

  private applyLegacyCoreSettingsUpdate(
    current: OrganizationCoreSettings,
    update: LegacyOrganizationCoreSettingsUpdate,
  ): OrganizationCoreSettings {
    const nextCountries =
      update.countryId !== undefined
        ? this.buildCoreCountriesFromIds(
            update.countryId ? [update.countryId.trim()] : [],
            current.countries,
          )
        : current.countries;

    const requestedCurrencyIds =
      update.currencyIds !== undefined
        ? this.normalizeIds(update.currencyIds)
        : current.currencies.map((currency) => currency.id);
    const baseCurrencyId =
      typeof update.baseCurrencyId === 'string' ? update.baseCurrencyId.trim() : undefined;
    const normalizedCurrencyIds = this.normalizeCurrencyIds(requestedCurrencyIds, baseCurrencyId);
    const orderedCurrencyIds = this.applyBaseCurrencyOrder(normalizedCurrencyIds, baseCurrencyId);
    const nextCurrencies = this.buildCoreCurrenciesFromIds(orderedCurrencyIds, current.currencies);

    const next: OrganizationCoreSettings = {
      countries: nextCountries,
      currencies: nextCurrencies,
      companies: current.companies,
    };
    this.validateCoreSettings(next);
    return next;
  }

  private buildCoreCountriesFromIds(
    ids: string[],
    existing: CoreCountry[] = [],
  ): CoreCountry[] {
    const map = new Map(existing.map((country) => [country.id, country]));
    return ids.map((id) => map.get(id) ?? { id, name: id, code: id });
  }

  private buildCoreCurrenciesFromIds(
    ids: string[],
    existing: CoreCurrency[] = [],
  ): CoreCurrency[] {
    const map = new Map(existing.map((currency) => [currency.id, currency]));
    return ids.map((id) => map.get(id) ?? { id, name: id, code: id });
  }

  private applyBaseCurrencyOrder(ids: string[], baseCurrencyId?: string): string[] {
    if (!baseCurrencyId) {
      return ids;
    }
    const normalized = baseCurrencyId.trim();
    const filtered = ids.filter((id) => id !== normalized);
    return [normalized, ...filtered];
  }

  private normalizeStoredCountries(values: CoreCountryInput[] | undefined): CoreCountry[] {
    if (!Array.isArray(values)) {
      return [];
    }
    const result: CoreCountry[] = [];
    const usedCodes = new Set<string>();
    values.forEach((value) => {
      const country = this.coerceCoreCountry(value);
      if (!country) {
        return;
      }
      const codeKey = country.code.toUpperCase();
      if (usedCodes.has(codeKey)) {
        return;
      }
      usedCodes.add(codeKey);
      result.push(country);
    });
    return result;
  }

  private normalizeStoredCurrencies(values: CoreCurrencyInput[] | undefined): CoreCurrency[] {
    if (!Array.isArray(values)) {
      return [];
    }
    const result: CoreCurrency[] = [];
    const usedCodes = new Set<string>();
    values.forEach((value) => {
      const currency = this.coerceCoreCurrency(value);
      if (!currency) {
        return;
      }
      const codeKey = currency.code.toUpperCase();
      if (usedCodes.has(codeKey)) {
        return;
      }
      usedCodes.add(codeKey);
      result.push(currency);
    });
    return result;
  }

  private normalizeStoredCompanies(values: CoreCompanyInput[] | undefined): CoreCompany[] {
    if (!Array.isArray(values)) {
      return [];
    }
    const result: CoreCompany[] = [];
    const usedNames = new Set<string>();
    values.forEach((value) => {
      const company = this.coerceCoreCompany(value);
      if (!company) {
        return;
      }
      const nameKey = company.name.toLowerCase();
      if (usedNames.has(nameKey)) {
        return;
      }
      usedNames.add(nameKey);
      result.push(company);
    });
    return result;
  }

  private normalizeCoreCountries(values: CoreCountryInput[]): CoreCountry[] {
    return values.map((value) => this.buildCoreCountry(value));
  }

  private normalizeCoreCurrencies(values: CoreCurrencyInput[]): CoreCurrency[] {
    return values.map((value) => this.buildCoreCurrency(value));
  }

  private normalizeCoreCompanies(values: CoreCompanyInput[]): CoreCompany[] {
    return values.map((value) => this.buildCoreCompany(value));
  }

  private coerceCoreCountry(value: CoreCountryInput): CoreCountry | null {
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    const code = typeof value.code === 'string' ? value.code.trim() : '';
    if (!name || !code) {
      return null;
    }
    const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : uuid();
    return { id, name, code };
  }

  private coerceCoreCurrency(value: CoreCurrencyInput): CoreCurrency | null {
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    const code = typeof value.code === 'string' ? value.code.trim() : '';
    if (!name || !code) {
      return null;
    }
    const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : uuid();
    const symbol = typeof value.symbol === 'string' && value.symbol.trim() ? value.symbol.trim() : undefined;
    return { id, name, code, symbol };
  }

  private coerceCoreCompany(value: CoreCompanyInput): CoreCompany | null {
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    const countryId = typeof value.countryId === 'string' ? value.countryId.trim() : '';
    if (!name || !countryId) {
      return null;
    }
    const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : uuid();
    return { id, name, countryId };
  }

  private buildCoreCountry(value: CoreCountryInput): CoreCountry {
    const country = this.coerceCoreCountry(value);
    if (!country) {
      throw new BadRequestException('Country name and code are required');
    }
    return country;
  }

  private buildCoreCurrency(value: CoreCurrencyInput): CoreCurrency {
    const currency = this.coerceCoreCurrency(value);
    if (!currency) {
      throw new BadRequestException('Currency name and code are required');
    }
    return currency;
  }

  private buildCoreCompany(value: CoreCompanyInput): CoreCompany {
    const company = this.coerceCoreCompany(value);
    if (!company) {
      throw new BadRequestException('Company name and country are required');
    }
    return company;
  }

  private assertUniqueCountryCode(countries: CoreCountry[], code: string): void {
    const codeKey = code.trim().toUpperCase();
    if (countries.some((country) => country.code.trim().toUpperCase() === codeKey)) {
      throw new BadRequestException('Country code already exists');
    }
  }

  private assertUniqueCurrencyCode(currencies: CoreCurrency[], code: string): void {
    const codeKey = code.trim().toUpperCase();
    if (currencies.some((currency) => currency.code.trim().toUpperCase() === codeKey)) {
      throw new BadRequestException('Currency code already exists');
    }
  }

  private assertUniqueCompanyName(companies: CoreCompany[], name: string): void {
    const nameKey = name.trim().toLowerCase();
    if (companies.some((company) => company.name.trim().toLowerCase() === nameKey)) {
      throw new BadRequestException('Company name already exists');
    }
  }

  private assertCountryExists(countries: CoreCountry[], countryId: string): void {
    if (!countries.some((country) => country.id === countryId)) {
      throw new BadRequestException('Country not found');
    }
  }

  private validateCoreSettings(settings: OrganizationCoreSettings): void {
    const countryCodes = new Set<string>();
    const countryIds = new Set<string>();
    settings.countries.forEach((country) => {
      const codeKey = country.code.trim().toUpperCase();
      if (countryCodes.has(codeKey)) {
        throw new BadRequestException('Country code already exists');
      }
      countryCodes.add(codeKey);
      if (countryIds.has(country.id)) {
        throw new BadRequestException('Country id already exists');
      }
      countryIds.add(country.id);
    });

    const currencyCodes = new Set<string>();
    const currencyIds = new Set<string>();
    settings.currencies.forEach((currency) => {
      const codeKey = currency.code.trim().toUpperCase();
      if (currencyCodes.has(codeKey)) {
        throw new BadRequestException('Currency code already exists');
      }
      currencyCodes.add(codeKey);
      if (currencyIds.has(currency.id)) {
        throw new BadRequestException('Currency id already exists');
      }
      currencyIds.add(currency.id);
    });

    const companyNames = new Set<string>();
    settings.companies.forEach((company) => {
      const nameKey = company.name.trim().toLowerCase();
      if (companyNames.has(nameKey)) {
        throw new BadRequestException('Company name already exists');
      }
      companyNames.add(nameKey);
      if (!countryIds.has(company.countryId)) {
        throw new BadRequestException('Company country not found');
      }
    });
  }

  private toLegacyCoreSettings(settings: OrganizationCoreSettings): LegacyOrganizationCoreSettings {
    const currencyIds = settings.currencies.map((currency) => currency.id);
    return {
      countryId: settings.countries[0]?.id,
      baseCurrencyId: currencyIds[0],
      currencyIds,
    };
  }

  private validateStructureSettings(settings: OrganizationStructureSettings): void {
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

  private persistState(): void {
    void this.moduleState
      .saveState<OrganizationsState>(this.stateKey, { organizations: this.organizations })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist organizations: ${message}`);
      });
  }
}
