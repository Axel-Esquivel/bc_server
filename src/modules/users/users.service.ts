import { ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SafeUser, UserEntity, WorkspaceMembership } from './entities/user.entity';

interface UsersState {
  users: UserEntity[];
}

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);
  private readonly stateKey = 'module:users';
  private users: UserEntity[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<UsersState>(this.stateKey, { users: [] });
    this.users = state.users ?? [];
  }

  async createUser(dto: CreateUserDto): Promise<SafeUser> {
    const normalizedEmail = dto.email.toLowerCase();
    const existing = this.users.find((user) => user.email === normalizedEmail);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const newUser: UserEntity = {
      id: uuid(),
      email: normalizedEmail,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      passwordHash,
      workspaces: dto.workspaceId ? [{ workspaceId: dto.workspaceId, roles: [] }] : [],
      devices: [],
      defaultWorkspaceId: dto.defaultWorkspaceId ?? dto.workspaceId,
      createdAt: new Date(),
    };

    this.users.push(newUser);
    this.persistState();
    return this.toSafeUser(newUser);
  }

  async validateCredentials(email: string, password: string): Promise<SafeUser | null> {
    const user = this.findByEmail(email);
    if (!user) {
      return null;
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    return matches ? this.toSafeUser(user) : null;
  }

  findByEmail(email: string): UserEntity | undefined {
    const normalized = email.toLowerCase();
    return this.users.find((user) => user.email === normalized);
  }

  findById(id: string): SafeUser {
    const user = this.users.find((candidate) => candidate.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const safeUser = this.toSafeUser(user);
    this.persistState();
    return safeUser;
  }

  addWorkspaceMembership(userId: string, membership: WorkspaceMembership): SafeUser {
    const user = this.users.find((candidate) => candidate.id === userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = user.workspaces.find((item) => item.workspaceId === membership.workspaceId);
    if (existing) {
      existing.roles = Array.from(new Set([...(existing.roles || []), ...membership.roles]));
    } else {
      user.workspaces.push({ ...membership });
    }

    return this.toSafeUser(user);
  }

  registerDevice(userId: string, deviceId: string): SafeUser {
    const user = this.users.find((candidate) => candidate.id === userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.devices.includes(deviceId)) {
      user.devices.push(deviceId);
    }

    const safeUser = this.toSafeUser(user);
    this.persistState();
    return safeUser;
  }

  resolveUsers(ids: string[]): Array<{ id: string; email: string; name?: string }> {
    if (!ids || ids.length === 0) {
      return [];
    }
    const unique = Array.from(new Set(ids.filter((id) => typeof id === 'string' && id.length > 0)));
    return unique
      .map((id) => this.users.find((candidate) => candidate.id === id))
      .filter((user): user is UserEntity => Boolean(user))
      .map((user) => ({
        id: user.id,
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
      }));
  }

  setDefaultWorkspace(userId: string, workspaceId: string): SafeUser {
    const user = this.users.find((candidate) => candidate.id === userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const belongs = user.workspaces.some((membership) => membership.workspaceId === workspaceId);
    if (!belongs) {
      throw new NotFoundException('Workspace membership not found');
    }

    user.defaultWorkspaceId = workspaceId;
    const safeUser = this.toSafeUser(user);
    this.persistState();
    return safeUser;
  }

  private toSafeUser(user: UserEntity): SafeUser {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  private persistState() {
    void this.moduleState
      .saveState<UsersState>(this.stateKey, { users: this.users })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist users: ${message}`);
      });
  }
}
