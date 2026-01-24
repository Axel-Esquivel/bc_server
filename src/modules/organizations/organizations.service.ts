import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { MODULE_CATALOG } from '../../core/constants/modules.catalog';
import { UsersService } from '../users/users.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {
  OrganizationEntity,
  OrganizationMember,
  OrganizationRole,
  OrganizationRoleDefinition,
} from './entities/organization.entity';

interface OrganizationsState {
  organizations: OrganizationEntity[];
}

interface WorkspaceModuleSnapshot {
  key: string;
  enabled?: boolean;
  configured?: boolean;
  status?: string;
}

interface WorkspaceSnapshot {
  id: string;
  name?: string;
  organizationId?: string;
  enabledModules?: WorkspaceModuleSnapshot[];
  moduleSettings?: Record<string, any>;
}

interface WorkspacesState {
  workspaces: WorkspaceSnapshot[];
}

@Injectable()
export class OrganizationsService implements OnModuleInit {
  private readonly logger = new Logger(OrganizationsService.name);
  private readonly stateKey = 'module:organizations';
  private organizations: OrganizationEntity[] = [];

  constructor(
    private readonly moduleState: ModuleStateService,
    private readonly usersService: UsersService,
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
      members: [
        {
          userId: ownerUserId,
          roleKey: 'owner',
          status: 'active',
          invitedAt: now,
          activatedAt: now,
        },
      ],
      roles: [{ key: 'owner', name: 'Owner', permissions: ['*'], system: true }],
      createdAt: new Date(),
    };

    this.organizations.push(organization);
    this.persistState();
    return organization;
  }

  listByUser(userId: string): OrganizationEntity[] {
    return this.organizations.filter((org) =>
      org.members.some((member) => member.userId === userId),
    );
  }

  listRoles(organizationId: string): OrganizationRoleDefinition[] {
    const organization = this.getOrganization(organizationId);
    return organization.roles.map((role) => ({
      key: role.key,
      name: role.name,
      permissions: [...role.permissions],
      system: role.system,
    }));
  }

  listPermissions(): Array<{ moduleKey: string; permissions: string[] }> {
    return MODULE_CATALOG.map((entry) => ({
      moduleKey: entry.key,
      permissions: [
        `${entry.key}.read`,
        `${entry.key}.write`,
        `${entry.key}.configure`,
      ],
    }));
  }

  getOrganization(organizationId: string): OrganizationEntity {
    const organization = this.organizations.find((item) => item.id === organizationId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async listWorkspaces(organizationId: string): Promise<WorkspaceSnapshot[]> {
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
    let totalCompanies = 0;
    let totalBranches = 0;
    let totalWarehouses = 0;

    const workspaceSummaries = workspaces.map((workspace) => {
      const core = workspace.moduleSettings?.core ?? {};
      const companies = Array.isArray(core.companies) ? core.companies.length : 0;
      const branches = Array.isArray(core.branches) ? core.branches.length : 0;
      const warehouses = Array.isArray(core.warehouses) ? core.warehouses.length : 0;

      totalCompanies += companies;
      totalBranches += branches;
      totalWarehouses += warehouses;

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
    this.assertPermission(organization, requesterId, 'organizations.write');

    if (dto.name !== undefined) {
      organization.name = dto.name.trim();
    }

    this.persistState();
    return organization;
  }

  addMember(
    organizationId: string,
    requesterId: string,
    member: { userId: string; role: OrganizationRole },
  ): OrganizationEntity {
    const organization = this.getOrganization(organizationId);
    this.assertRoleForMemberChange(organization, requesterId, member.role, null);
    this.ensureRoleExists(organization, member.role);
    this.usersService.findById(member.userId);

    const existing = organization.members.find((item) => item.userId === member.userId);
    if (existing) {
      if (existing.status === 'active') {
        throw new ConflictException('Organization member already exists');
      }
      if (existing.roleKey === 'owner') {
        throw new ForbiddenException('Owner role cannot be changed');
      }
      existing.status = 'active';
      existing.invitedBy = requesterId;
      existing.invitedAt = new Date();
      existing.activatedAt = new Date();
      existing.requestedBy = existing.requestedBy ?? member.userId;
      existing.requestedAt = existing.requestedAt ?? existing.invitedAt;
      this.persistState();
      return organization;
    }

    organization.members.push({
      userId: member.userId,
      roleKey: member.role,
      status: 'active',
      invitedBy: requesterId,
      invitedAt: new Date(),
      activatedAt: new Date(),
    });
    this.persistState();
    return organization;
  }

  addMemberByEmail(
    organizationId: string,
    requesterId: string,
    email: string,
    role: OrganizationRole,
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
      if (existing.status === 'active') {
        throw new ConflictException('User already member');
      }
      if (existing.roleKey === 'owner') {
        throw new ForbiddenException('Owner role cannot be changed');
      }
      existing.status = 'active';
      existing.invitedBy = requesterId;
      existing.invitedAt = new Date();
      existing.activatedAt = new Date();
      this.persistState();
      return organization;
    }

    organization.members.push({
      userId: user.id,
      roleKey: role,
      status: 'active',
      invitedBy: requesterId,
      invitedAt: new Date(),
      activatedAt: new Date(),
    });
    this.persistState();
    return organization;
  }

  requestJoin(
    organizationId: string,
    requesterId: string,
    roleKey?: OrganizationRole,
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
      if (existing.status === 'active') {
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

    organization.members.push({
      userId: requesterId,
      roleKey: targetRole,
      status: 'pending',
      requestedBy: requesterId,
      requestedAt: new Date(),
    });
    this.persistState();
    return organization;
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

    if (member.status !== 'pending') {
      throw new BadRequestException('Member is not pending');
    }

    member.status = 'active';
    member.activatedAt = new Date();
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
    if (member.status !== 'pending') {
      throw new BadRequestException('Member is not pending');
    }
    if (member.roleKey === 'owner') {
      const ownerCount = organization.members.filter((item) => item.roleKey === 'owner').length;
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
    nextRole: OrganizationRole,
  ): OrganizationEntity {
    const organization = this.getOrganization(organizationId);
    const member = organization.members.find((item) => item.userId === targetUserId);
    if (!member) {
      throw new NotFoundException('Organization member not found');
    }
    if (member.roleKey === 'owner' && nextRole !== 'owner') {
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
    if (member.roleKey === 'owner') {
      throw new ForbiddenException('Owner role cannot be removed');
    }

    organization.members.splice(index, 1);
    this.persistState();
    return organization;
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
    if (key === 'owner') {
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
      system: false,
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
    if (role.key === 'owner') {
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

    if (roleKey === 'owner') {
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

  getMemberRole(organizationId: string, userId?: string): OrganizationRole | null {
    const member = this.getMember(organizationId, userId);
    if (!member || member.status !== 'active') {
      return null;
    }
    return member.roleKey ?? null;
  }

  private assertRoleForMemberChange(
    organization: OrganizationEntity,
    requesterId: string,
    desiredRole: OrganizationRole | null,
    currentRole: OrganizationRole | null,
    targetUserId?: string,
  ): void {
    this.assertPermission(organization, requesterId, 'users.write');

    if (currentRole === 'owner' && desiredRole !== 'owner') {
      const ownerCount = organization.members.filter((member) => member.roleKey === 'owner').length;
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

  private normalizeOrganization(raw: any, existing: OrganizationEntity[]): OrganizationEntity {
    const baseDate = raw?.createdAt ? new Date(raw.createdAt) : new Date();
    const members = Array.isArray(raw.members)
      ? raw.members.map((member: any) => {
          const role: OrganizationRole =
            typeof member?.roleKey === 'string' && member.roleKey.trim()
              ? member.roleKey.trim()
              : typeof member?.role === 'string' && member.role.trim()
                ? member.role.trim()
                : 'member';
          const status = member?.status === 'pending' ? 'pending' : 'active';
          const invitedAt = member?.invitedAt ? new Date(member.invitedAt) : undefined;
          const requestedAt = member?.requestedAt ? new Date(member.requestedAt) : undefined;
          const activatedAt =
            member?.activatedAt
              ? new Date(member.activatedAt)
              : member?.acceptedAt
                ? new Date(member.acceptedAt)
                : status === 'active'
                  ? invitedAt ?? requestedAt ?? baseDate
                  : undefined;
          return {
            userId: member.userId,
            roleKey: role,
            status,
            invitedBy: typeof member?.invitedBy === 'string' ? member.invitedBy : undefined,
            requestedBy: typeof member?.requestedBy === 'string' ? member.requestedBy : undefined,
            invitedAt,
            requestedAt,
            activatedAt,
          };
        })
      : [];

    const ownerUserId =
      raw.ownerUserId ||
      members.find((member) => member.roleKey === 'owner')?.userId ||
      members[0]?.userId ||
      'unknown';
    const createdBy = raw.createdBy || raw.ownerUserId || ownerUserId;

    if (!members.some((member) => member.userId === ownerUserId)) {
      members.push({
        userId: ownerUserId,
        roleKey: 'owner',
        status: 'active',
        invitedAt: baseDate,
        activatedAt: baseDate,
      });
    }

    const roles = this.normalizeRoles(raw.roles, members);

    return {
      id: raw.id || uuid(),
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Organization',
      code: raw.code || this.generateUniqueCode(existing),
      ownerUserId,
      createdBy,
      members,
      roles,
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    };
  }

  private normalizeRoles(rawRoles: any, members: OrganizationMember[]): OrganizationRoleDefinition[] {
    const permissionSet = this.getPermissionSet();
    const mapped = Array.isArray(rawRoles)
      ? rawRoles
          .filter((role: any) => typeof role?.key === 'string' && role.key.trim())
          .map((role: any) => {
            const permissions = Array.isArray(role.permissions)
              ? role.permissions.filter((permission: string) => permission === '*' || permissionSet.has(permission))
              : [];
            return {
              key: role.key.trim(),
              name: typeof role.name === 'string' && role.name.trim() ? role.name.trim() : role.key.trim(),
              permissions,
              system: role.system === true || role.key === 'owner' || role.key === 'admin' || role.key === 'member',
            };
          })
      : [];

    const roleKeys = new Set(mapped.map((role) => role.key));
    if (!roleKeys.has('owner')) {
      mapped.unshift({ key: 'owner', name: 'Owner', permissions: ['*'], system: true });
      roleKeys.add('owner');
    }

    const memberRoles = new Set(members.map((member) => member.roleKey));
    if (memberRoles.has('admin') && !roleKeys.has('admin')) {
      mapped.push({ key: 'admin', name: 'Admin', permissions: [], system: true });
    }
    if (memberRoles.has('member') && !roleKeys.has('member')) {
      mapped.push({ key: 'member', name: 'Member', permissions: [], system: true });
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
    return set;
  }

  private assertOwner(organization: OrganizationEntity, requesterId: string): void {
    this.assertPermission(organization, requesterId, 'roles.write');
  }

  private assertPermission(organization: OrganizationEntity, requesterId: string, permission: string): void {
    const member = this.getMember(organization.id, requesterId);
    if (!member) {
      throw new ForbiddenException('User is not a member of organization');
    }
    if (member.status !== 'active') {
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

  private persistState(): void {
    void this.moduleState
      .saveState<OrganizationsState>(this.stateKey, { organizations: this.organizations })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist organizations: ${message}`);
      });
  }
}
