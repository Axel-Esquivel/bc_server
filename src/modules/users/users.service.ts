import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { OrganizationMembership, SafeUser, UserEntity } from './entities/user.entity';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async createUser(dto: CreateUserDto): Promise<SafeUser> {
    const normalizedEmail = dto.email.toLowerCase();
    const existing = await this.userModel.findOne({ email: normalizedEmail }).lean().exec();
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
      Organizations: dto.OrganizationId ? [{ OrganizationId: dto.OrganizationId, roles: [] }] : [],
      devices: [],
      defaultOrganizationId: dto.defaultOrganizationId ?? dto.OrganizationId,
      defaultCompanyId: dto.defaultCompanyId ?? dto.defaultOrganizationId ?? dto.OrganizationId,
      createdAt: new Date(),
    };

    await this.userModel.create(newUser);
    return this.toSafeUser(newUser);
  }

  async validateCredentials(email: string, password: string): Promise<SafeUser | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    return matches ? this.toSafeUser(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const normalized = email.toLowerCase();
    const user = await this.userModel.findOne({ email: normalized }).lean().exec();
    return user ? (user as UserEntity) : null;
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.userModel.findOne({ id }).lean().exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toSafeUser(user as UserEntity);
  }

  async addOrganizationMembership(
    userId: string,
    membership: OrganizationMembership,
  ): Promise<SafeUser> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = user.Organizations?.find((item) => item.OrganizationId === membership.OrganizationId);
    if (existing) {
      existing.roles = Array.from(new Set([...(existing.roles || []), ...membership.roles]));
    } else {
      user.Organizations = [...(user.Organizations ?? []), { ...membership }];
    }

    await user.save();
    return this.toSafeUser(user.toObject() as UserEntity);
  }

  async registerDevice(userId: string, deviceId: string): Promise<SafeUser> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.devices?.includes(deviceId)) {
      user.devices = [...(user.devices ?? []), deviceId];
    }

    await user.save();
    return this.toSafeUser(user.toObject() as UserEntity);
  }

  async resolveUsers(ids: string[]): Promise<Array<{ id: string; email: string; name?: string }>> {
    if (!ids || ids.length === 0) {
      return [];
    }
    const unique = Array.from(new Set(ids.filter((id) => typeof id === 'string' && id.length > 0)));
    const users = await this.userModel.find({ id: { $in: unique } }).lean().exec();
    return users.map((user) => ({
        id: user.id,
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
      }));
  }

  async setDefaultOrganization(userId: string, organizationId: string): Promise<SafeUser> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const belongs = user.Organizations?.some((membership) => membership.OrganizationId === organizationId);
    if (!belongs) {
      throw new NotFoundException('Organization membership not found');
    }

    user.defaultOrganizationId = organizationId;
    await user.save();
    return this.toSafeUser(user.toObject() as UserEntity);
  }

  async setDefaultCompany(userId: string, companyId: string): Promise<SafeUser> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.defaultCompanyId = companyId;
    await user.save();
    return this.toSafeUser(user.toObject() as UserEntity);
  }

  async clearDefaultOrganization(userId: string, organizationId: string): Promise<SafeUser> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.defaultOrganizationId === organizationId) {
      user.defaultOrganizationId = undefined;
    }
    await user.save();
    return this.toSafeUser(user.toObject() as UserEntity);
  }

  private toSafeUser(user: UserEntity): SafeUser {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
