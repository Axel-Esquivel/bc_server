import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { CreateUserDto } from './dto/create-user.dto';
import { SafeUser, UserEntity, WorkspaceMembership } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly users: UserEntity[] = [];

  async createUser(dto: CreateUserDto): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const newUser: UserEntity = {
      id: uuid(),
      email: dto.email.toLowerCase(),
      username: dto.username,
      passwordHash,
      workspaces: dto.workspaceId ? [{ workspaceId: dto.workspaceId, roles: [] }] : [],
      devices: [],
      createdAt: new Date(),
    };

    this.users.push(newUser);
    return this.toSafeUser(newUser);
  }

  async validateCredentials(identifier: string, password: string): Promise<SafeUser | null> {
    const user = this.findByIdentifier(identifier);
    if (!user) {
      return null;
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    return matches ? this.toSafeUser(user) : null;
  }

  findByIdentifier(identifier: string): UserEntity | undefined {
    const normalized = identifier.toLowerCase();
    return this.users.find(
      (user) => user.email === normalized || user.username.toLowerCase() === normalized,
    );
  }

  findById(id: string): SafeUser {
    const user = this.users.find((candidate) => candidate.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toSafeUser(user);
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

    return this.toSafeUser(user);
  }

  private toSafeUser(user: UserEntity): SafeUser {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
