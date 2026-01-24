import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { MODULE_CATALOG, ModuleCatalogEntry } from '../../core/constants/modules.catalog';
import { OrganizationsService } from '../organizations/organizations.service';
import { ModuleLoaderService } from '../module-loader/module-loader.service';
import { UsersService } from '../users/users.service';
import { AddCompanyMemberDto } from './dto/add-company-member.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import {
  CompanyEntity,
  CompanyMember,
  CompanyMemberStatus,
  CompanyRoleDefinition,
  CompanyModuleStatus,
} from './entities/company.entity';

interface CompaniesState {
  companies: CompanyEntity[];
}

interface CompanyCoreSettings {
  countryId?: string;
  baseCurrencyId?: string;
  currencies: Array<{ id: string; code?: string; name?: string; symbol?: string }>;
  companies: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; companyId: string; name: string; type?: string }>;
  warehouses: Array<{ id: string; branchId: string; name: string }>;
}

@Injectable()
export class CompaniesService implements OnModuleInit {
  private readonly logger = new Logger(CompaniesService.name);
  private readonly stateKey = 'module:companies';
  private companies: CompanyEntity[] = [];
  private readonly basePermissions = [
    'company.manage',
    'company.invite',
    'roles.manage',
    'modules.enable',
    'modules.configure',
  ];

  constructor(
    private readonly moduleState: ModuleStateService,
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly moduleLoader: ModuleLoaderService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<CompaniesState>(this.stateKey, { companies: [] });
    const normalized: CompanyEntity[] = [];
    (state.companies ?? []).forEach((company) => {
      const normalizedCompany = this.normalizeCompany(company, normalized);
      normalized.push(normalizedCompany);
    });
    this.companies = normalized;
    this.persistState();
  }

  createCompany(organizationId: string, ownerUserId: string, dto: CreateCompanyDto): CompanyEntity {
    const orgRole = this.organizationsService.getMemberRole(organizationId, ownerUserId);
    if (!orgRole) {
      throw new BadRequestException('Organization membership not found');
    }

    this.usersService.findById(ownerUserId);

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Company name is required');
    }

    const currencies = this.normalizeCurrencies(dto.currencies, dto.baseCurrencyId);

    const company: CompanyEntity = {
      id: uuid(),
      organizationId,
      name,
      legalName: dto.legalName?.trim() || undefined,
      taxId: dto.taxId?.trim() || undefined,
      baseCountryId: dto.baseCountryId,
      baseCurrencyId: dto.baseCurrencyId,
      currencies,
      members: [{ userId: ownerUserId, roleKey: 'owner', status: 'active' }],
      roles: this.buildDefaultRoles(),
      moduleStates: {},
      moduleSettings: {},
      createdAt: new Date(),
    };

    this.companies.push(company);
    this.persistState();
    return company;
  }

  listByOrganization(organizationId: string, userId: string): CompanyEntity[] {
    const orgRole = this.organizationsService.getMemberRole(organizationId, userId);
    if (!orgRole) {
      throw new ForbiddenException('Organization membership not found');
    }

    return this.companies.filter((company) => company.organizationId === organizationId);
  }

  listByUser(userId: string): CompanyEntity[] {
    return this.companies.filter((company) =>
      company.members.some((member) => member.userId === userId && member.status === 'active'),
    );
  }

  getCompany(companyId: string): CompanyEntity {
    const company = this.companies.find((item) => item.id === companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  updateCompany(companyId: string, userId: string, dto: UpdateCompanyDto): CompanyEntity {
    const company = this.getCompany(companyId);
    this.assertPermission(companyId, userId, 'company.manage');

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new BadRequestException('Company name is required');
      }
      company.name = trimmed;
    }
    if (dto.legalName !== undefined) {
      company.legalName = dto.legalName?.trim() || undefined;
    }
    if (dto.taxId !== undefined) {
      company.taxId = dto.taxId?.trim() || undefined;
    }
    if (dto.baseCountryId !== undefined) {
      company.baseCountryId = dto.baseCountryId;
    }
    if (dto.baseCurrencyId !== undefined) {
      company.baseCurrencyId = dto.baseCurrencyId;
    }
    if (dto.currencies !== undefined || dto.baseCurrencyId !== undefined) {
      company.currencies = this.normalizeCurrencies(dto.currencies ?? company.currencies, company.baseCurrencyId);
    }

    this.persistState();
    return company;
  }

  addMember(companyId: string, requesterId: string, dto: AddCompanyMemberDto): CompanyEntity {
    const company = this.getCompany(companyId);
    this.assertPermission(companyId, requesterId, 'company.invite');
    this.ensureRoleExists(company, dto.roleKey);

    if (dto.roleKey === 'owner') {
      this.assertOwnerPermission(company, requesterId);
    }

    this.usersService.findById(dto.userId);

    const existing = company.members.find((member) => member.userId === dto.userId);
    if (existing) {
      throw new ConflictException('Company member already exists');
    }

    company.members.push({ userId: dto.userId, roleKey: dto.roleKey, status: 'active' });
    this.persistState();
    return company;
  }

  joinCompany(companyId: string, userId: string): CompanyEntity {
    const company = this.getCompany(companyId);
    this.usersService.findById(userId);
    const existing = company.members.find((member) => member.userId === userId);
    if (!existing) {
      company.members.push({ userId, roleKey: 'member', status: 'active' });
      this.persistState();
    }
    return company;
  }

  updateMemberRole(
    companyId: string,
    requesterId: string,
    targetUserId: string,
    roleKey: string,
  ): CompanyMember {
    const company = this.getCompany(companyId);
    this.assertPermission(companyId, requesterId, 'roles.manage');
    this.ensureRoleExists(company, roleKey);

    const member = company.members.find((item) => item.userId === targetUserId);
    if (!member) {
      throw new NotFoundException('Company member not found');
    }

    if (roleKey === 'owner') {
      this.assertOwnerPermission(company, requesterId);
    }

    if (member.roleKey === 'owner' && roleKey !== 'owner') {
      this.assertOwnerPermission(company, requesterId);
      this.ensureOwnerRemaining(company, targetUserId);
    }

    member.roleKey = roleKey;
    member.status = member.status ?? 'active';
    this.persistState();
    return { ...member };
  }

  getMemberRole(companyId: string, userId?: string): string | null {
    if (!userId) {
      return null;
    }
    const company = this.getCompany(companyId);
    const member = company.members.find((item) => item.userId === userId && item.status === 'active');
    return member?.roleKey ?? null;
  }

  getMemberPermissions(companyId: string, userId?: string): string[] {
    if (!userId) {
      return [];
    }
    const company = this.getCompany(companyId);
    const member = company.members.find((item) => item.userId === userId && item.status === 'active');
    if (!member) {
      return [];
    }
    const role = company.roles.find((item) => item.key === member.roleKey);
    return role ? [...role.permissions] : [];
  }

  listRoles(companyId: string): CompanyRoleDefinition[] {
    const company = this.getCompany(companyId);
    return company.roles.map((role) => ({ ...role, permissions: [...role.permissions] }));
  }

  createRole(
    companyId: string,
    userId: string,
    payload: { key: string; name: string; permissions: string[] },
  ): CompanyRoleDefinition[] {
    const company = this.getCompany(companyId);
    this.assertPermission(companyId, userId, 'roles.manage');

    const key = payload.key.trim();
    if (!key) {
      throw new BadRequestException('Role key is required');
    }
    if (company.roles.some((role) => role.key === key)) {
      throw new BadRequestException('Role key already exists');
    }

    company.roles.push({
      key,
      name: payload.name.trim(),
      permissions: this.normalizePermissions(payload.permissions),
    });
    this.persistState();
    return this.listRoles(companyId);
  }

  updateRole(
    companyId: string,
    userId: string,
    roleKey: string,
    payload: { name?: string; permissions?: string[] },
  ): CompanyRoleDefinition[] {
    const company = this.getCompany(companyId);
    this.assertPermission(companyId, userId, 'roles.manage');

    const role = company.roles.find((item) => item.key === roleKey);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (payload.name !== undefined) {
      role.name = payload.name.trim();
    }
    if (payload.permissions !== undefined) {
      role.permissions =
        role.key === 'owner' || role.key === 'admin'
          ? this.basePermissions.slice()
          : this.normalizePermissions(payload.permissions);
    }

    this.persistState();
    return this.listRoles(companyId);
  }

  deleteRole(companyId: string, userId: string, roleKey: string): CompanyRoleDefinition[] {
    const company = this.getCompany(companyId);
    this.assertPermission(companyId, userId, 'roles.manage');

    if (roleKey === 'owner' || roleKey === 'admin' || roleKey === 'member') {
      throw new BadRequestException('Default roles cannot be removed');
    }

    const assigned = company.members.some((member) => member.roleKey === roleKey);
    if (assigned) {
      throw new BadRequestException('Role is assigned to members');
    }

    const index = company.roles.findIndex((role) => role.key === roleKey);
    if (index === -1) {
      throw new NotFoundException('Role not found');
    }

    company.roles.splice(index, 1);
    this.persistState();
    return this.listRoles(companyId);
  }

  getCoreSettings(companyId: string): CompanyCoreSettings {
    const company = this.getCompany(companyId);
    const stored = (company.moduleSettings?.core ?? {}) as Partial<CompanyCoreSettings>;
    return {
      countryId: stored.countryId ?? company.baseCountryId,
      baseCurrencyId: stored.baseCurrencyId ?? company.baseCurrencyId,
      currencies: Array.isArray(stored.currencies) ? stored.currencies : [],
      companies: Array.isArray(stored.companies) ? stored.companies : [],
      branches: Array.isArray(stored.branches) ? stored.branches : [],
      warehouses: Array.isArray(stored.warehouses) ? stored.warehouses : [],
    };
  }

  updateCoreSettings(companyId: string, dto: Partial<CompanyCoreSettings>): CompanyCoreSettings {
    const company = this.getCompany(companyId);
    const current = this.getCoreSettings(companyId);
    const next: CompanyCoreSettings = {
      countryId: dto.countryId ?? current.countryId,
      baseCurrencyId: dto.baseCurrencyId ?? current.baseCurrencyId,
      currencies: dto.currencies ?? current.currencies,
      companies: dto.companies ?? current.companies,
      branches: dto.branches ?? current.branches,
      warehouses: dto.warehouses ?? current.warehouses,
    };

    this.validateCoreSettings(next);
    company.baseCountryId = next.countryId ?? company.baseCountryId;
    company.baseCurrencyId = next.baseCurrencyId ?? company.baseCurrencyId;
    company.moduleSettings = {
      ...(company.moduleSettings ?? {}),
      core: next,
    };
    this.persistState();
    return next;
  }

  getModuleSettings(companyId: string, moduleKey: string): Record<string, any> {
    const company = this.getCompany(companyId);
    return (company.moduleSettings?.[moduleKey] ?? {}) as Record<string, any>;
  }

  updateModuleSettings(
    companyId: string,
    moduleKey: string,
    updates: Record<string, any>,
  ): Record<string, any> {
    const company = this.getCompany(companyId);
    const current = this.getModuleSettings(companyId, moduleKey);
    const next = { ...current, ...(updates ?? {}) };
    company.moduleSettings = {
      ...(company.moduleSettings ?? {}),
      [moduleKey]: next,
    };

    const states = this.buildModuleStates(company);
    if (states[moduleKey] && states[moduleKey] !== 'inactive') {
      states[moduleKey] = 'ready';
      company.moduleStates = states;
    }

    this.persistState();
    return next;
  }

  getModulesOverview(companyId: string, userId: string) {
    const roleKey = this.getMemberRole(companyId, userId);
    if (!roleKey) {
      throw new NotFoundException('Company membership not found');
    }

    return {
      availableModules: this.getAvailableModulesCatalog(),
      moduleStates: this.buildModuleStates(this.getCompany(companyId)),
      userRole: roleKey,
    };
  }

  enableModule(companyId: string, moduleKey: string, userId: string): Record<string, CompanyModuleStatus> {
    const company = this.getCompany(companyId);
    this.assertPermission(companyId, userId, 'modules.enable');
    this.ensureModuleExists(moduleKey);

    const dependencyMap = this.getDependencyMap();
    const toEnable = this.expandDependencies(moduleKey, dependencyMap);
    this.assertGlobalModulesEnabled(Array.from(toEnable));

    const currentStates = this.buildModuleStates(company);
    toEnable.forEach((key) => {
      const requiresConfig = this.requiresConfig(key);
      currentStates[key] = requiresConfig ? 'pendingConfig' : 'ready';
    });

    company.moduleStates = currentStates;
    this.persistState();
    return { ...company.moduleStates };
  }

  configureModule(
    companyId: string,
    moduleKey: string,
    userId: string,
    payload: Record<string, any>,
  ): Record<string, any> {
    const company = this.getCompany(companyId);
    this.assertPermission(companyId, userId, 'modules.configure');
    this.ensureModuleExists(moduleKey);

    const states = this.buildModuleStates(company);
    const current = states[moduleKey] ?? 'inactive';
    if (current === 'inactive') {
      throw new BadRequestException('Module is not enabled');
    }

    company.moduleSettings = {
      ...(company.moduleSettings ?? {}),
      [moduleKey]: payload ?? {},
    };

    states[moduleKey] = 'ready';
    company.moduleStates = states;
    this.persistState();
    return company.moduleSettings[moduleKey];
  }

  setModuleStates(companyId: string, states: Record<string, CompanyModuleStatus>): Record<string, CompanyModuleStatus> {
    const company = this.getCompany(companyId);
    company.moduleStates = { ...states };
    this.persistState();
    return { ...company.moduleStates };
  }

  private buildDefaultRoles(): CompanyRoleDefinition[] {
    return [
      { key: 'owner', name: 'Owner', permissions: [...this.basePermissions] },
      { key: 'admin', name: 'Admin', permissions: [...this.basePermissions] },
      { key: 'member', name: 'Member', permissions: [] },
    ];
  }

  private buildModuleStates(company: CompanyEntity): Record<string, CompanyModuleStatus> {
    const states: Record<string, CompanyModuleStatus> = { ...(company.moduleStates ?? {}) };
    MODULE_CATALOG.forEach((entry) => {
      if (!states[entry.key]) {
        states[entry.key] = 'inactive';
      }
    });
    return states;
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

  private ensureModuleExists(moduleKey: string): void {
    if (!MODULE_CATALOG.some((entry) => entry.key === moduleKey)) {
      throw new BadRequestException('Invalid module key');
    }
  }

  private requiresConfig(moduleKey: string): boolean {
    const entry = MODULE_CATALOG.find((item) => item.key === moduleKey);
    return entry?.requiresConfig ?? false;
  }

  private getDependencyMap(): Map<string, string[]> {
    const dependencyMap = new Map<string, string[]>();
    MODULE_CATALOG.forEach((entry) => {
      dependencyMap.set(entry.key, Array.isArray(entry.dependencies) ? entry.dependencies : []);
    });
    return dependencyMap;
  }

  private expandDependencies(moduleKey: string, dependencyMap: Map<string, string[]>): Set<string> {
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

    visit(moduleKey);
    return expanded;
  }

  private normalizeCompany(raw: any, existing: CompanyEntity[]): CompanyEntity {
    const roles = Array.isArray(raw.roles)
      ? raw.roles
          .filter((role: any) => typeof role?.key === 'string')
          .map((role: any) => ({
            key: role.key,
            name: typeof role.name === 'string' && role.name.trim() ? role.name.trim() : role.key,
            permissions: this.normalizePermissions(Array.isArray(role.permissions) ? role.permissions : []),
          }))
      : this.buildDefaultRoles();

    const ensureBaseRoles = (items: CompanyRoleDefinition[]): CompanyRoleDefinition[] => {
      const hasOwner = items.some((role) => role.key === 'owner');
      const hasAdmin = items.some((role) => role.key === 'admin');
      const hasMember = items.some((role) => role.key === 'member');
      const next = [...items];
      if (!hasOwner) {
        next.unshift({ key: 'owner', name: 'Owner', permissions: [...this.basePermissions] });
      } else {
        const owner = next.find((role) => role.key === 'owner');
        if (owner) {
          owner.permissions = [...this.basePermissions];
        }
      }
      if (!hasAdmin) {
        next.push({ key: 'admin', name: 'Admin', permissions: [...this.basePermissions] });
      } else {
        const admin = next.find((role) => role.key === 'admin');
        if (admin) {
          admin.permissions = [...this.basePermissions];
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
          const roleKey =
            typeof member?.roleKey === 'string'
              ? member.roleKey
              : member?.role === 'owner' || member?.role === 'admin' || member?.role === 'member'
                ? member.role
                : 'member';
          const status: CompanyMemberStatus =
            member?.status === 'invited' || member?.status === 'disabled' ? member.status : 'active';
          return { userId: member.userId, roleKey, status };
        })
      : [];

    const roleKeys = new Set(normalizedRoles.map((role) => role.key));
    const normalizedMembers = members.map((member) => ({
      ...member,
      roleKey: roleKeys.has(member.roleKey) ? member.roleKey : 'member',
    }));
    if (normalizedMembers.length > 0 && !normalizedMembers.some((member) => member.roleKey === 'owner')) {
      normalizedMembers[0].roleKey = 'owner';
    }

    const baseCurrencyId = raw.baseCurrencyId || 'unknown';
    const currencies = this.normalizeCurrencies(raw.currencies, baseCurrencyId);

    return {
      id: raw.id || uuid(),
      organizationId: raw.organizationId || 'unknown',
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Company',
      legalName: typeof raw.legalName === 'string' && raw.legalName.trim() ? raw.legalName.trim() : undefined,
      taxId: typeof raw.taxId === 'string' && raw.taxId.trim() ? raw.taxId.trim() : undefined,
      baseCountryId: raw.baseCountryId || 'unknown',
      baseCurrencyId,
      currencies,
      members: normalizedMembers,
      roles: normalizedRoles,
      moduleStates: raw.moduleStates ?? {},
      moduleSettings: raw.moduleSettings ?? {},
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    };
  }

  private validateCoreSettings(settings: CompanyCoreSettings): void {
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

  private normalizeCurrencies(currencies: string[] | undefined, baseCurrencyId: string): string[] {
    const list = Array.isArray(currencies) ? currencies : [];
    const normalized = list
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
    if (baseCurrencyId && !normalized.includes(baseCurrencyId)) {
      normalized.push(baseCurrencyId);
    }
    return Array.from(new Set(normalized));
  }

  private ensureRoleExists(company: CompanyEntity, roleKey: string): void {
    if (!company.roles.some((role) => role.key === roleKey)) {
      throw new BadRequestException('Role not found');
    }
  }

  private assertPermission(companyId: string, userId: string, permission: string): void {
    const permissions = this.getMemberPermissions(companyId, userId);
    if (!permissions.includes(permission)) {
      throw new ForbiddenException('Permission denied');
    }
  }

  private assertOwnerPermission(company: CompanyEntity, userId: string): void {
    const role = this.getMemberRole(company.id, userId);
    if (role !== 'owner') {
      throw new ForbiddenException('Owner role required');
    }
  }

  private ensureOwnerRemaining(company: CompanyEntity, targetUserId: string): void {
    const owners = company.members.filter(
      (member) => member.roleKey === 'owner' && member.userId !== targetUserId,
    );
    if (owners.length === 0) {
      throw new BadRequestException('At least one owner is required');
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

  private persistState(): void {
    void this.moduleState
      .saveState<CompaniesState>(this.stateKey, { companies: this.companies })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist companies: ${message}`);
      });
  }
}
