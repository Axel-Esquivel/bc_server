import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { OrganizationMembership, SafeUser, UserDefaults, UserEntity } from './entities/user.entity';
import { User, UserDocument } from './schemas/user.schema';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @Inject(forwardRef(() => CompaniesService))
    private readonly companiesService: CompaniesService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<SafeUser> {
    const normalizedEmail = dto.email.toLowerCase();
    const existing = await this.userModel.findOne({ email: normalizedEmail }).lean().exec();
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const defaults: UserDefaults = {
      organizationId: dto.defaultOrganizationId ?? dto.OrganizationId,
      companyId: dto.defaultCompanyId,
      enterpriseId: dto.defaultEnterpriseId,
      currencyId: dto.defaultCurrencyId,
    };

    const newUser: UserEntity = {
      id: uuid(),
      email: normalizedEmail,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      passwordHash,
      Organizations: dto.OrganizationId ? [{ OrganizationId: dto.OrganizationId, roles: [] }] : [],
      devices: [],
      defaultOrganizationId: defaults.organizationId,
      defaultCompanyId: defaults.companyId,
      defaultEnterpriseId: defaults.enterpriseId,
      defaultCurrencyId: defaults.currencyId,
      defaults,
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
    user.defaults = this.mergeDefaults(user, { organizationId });
    await user.save();
    return this.toSafeUser(user.toObject() as UserEntity);
  }

  async setDefaultCompany(userId: string, companyId: string): Promise<SafeUser> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.defaultCompanyId = companyId;
    user.defaults = this.mergeDefaults(user, { companyId });
    await user.save();
    return this.toSafeUser(user.toObject() as UserEntity);
  }

  async setDefaultEnterprise(userId: string, enterpriseId: string): Promise<SafeUser> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!enterpriseId?.trim()) {
      throw new BadRequestException('Enterprise is required');
    }

    const company = this.resolveUserCompany(userId, user.defaults?.companyId ?? user.defaultCompanyId);
    const enterprise = company.enterprises?.find((item) => item.id === enterpriseId) ?? null;
    if (!enterprise) {
      throw new BadRequestException('Enterprise not found for company');
    }

    user.defaultEnterpriseId = enterpriseId;
    user.defaults = this.mergeDefaults(user, {
      enterpriseId,
      countryId: enterprise.countryId,
    });
    if (user.defaultCurrencyId && !enterprise.currencyIds?.includes(user.defaultCurrencyId)) {
      user.defaultCurrencyId = undefined;
    }
    await user.save();
    return this.toSafeUser(user.toObject() as UserEntity);
  }

  async setDefaultCurrency(userId: string, currencyId: string): Promise<SafeUser> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!currencyId?.trim()) {
      throw new BadRequestException('Currency is required');
    }

    const company = this.resolveUserCompany(userId, user.defaults?.companyId ?? user.defaultCompanyId);
    const enterpriseId =
      (user.defaultEnterpriseId &&
      company.enterprises?.some((item) => item.id === user.defaultEnterpriseId))
        ? user.defaultEnterpriseId
        : company.defaultEnterpriseId ?? company.enterprises?.[0]?.id;
    const enterprise = company.enterprises?.find((item) => item.id === enterpriseId) ?? null;
    if (!enterprise) {
      throw new BadRequestException('Enterprise not found for company');
    }
    const allowedCurrencyIds = new Set<string>();
    (enterprise.currencyIds ?? []).forEach((id) => allowedCurrencyIds.add(id));
    if (enterprise.defaultCurrencyId) {
      allowedCurrencyIds.add(enterprise.defaultCurrencyId);
    }
    (company.currencies ?? []).forEach((id) => allowedCurrencyIds.add(id));
    if (company.baseCurrencyId) {
      allowedCurrencyIds.add(company.baseCurrencyId);
    }
    if (!allowedCurrencyIds.has(currencyId)) {
      throw new BadRequestException('Currency not allowed for company');
    }

    user.defaultCurrencyId = currencyId;
    user.defaults = this.mergeDefaults(user, { currencyId });
    await user.save();
    return this.toSafeUser(user.toObject() as UserEntity);
  }

  async setDefaultCountry(userId: string, countryId: string): Promise<SafeUser> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!countryId?.trim()) {
      throw new BadRequestException('Country is required');
    }

    const company = this.resolveUserCompany(userId, user.defaults?.companyId ?? user.defaultCompanyId);
    if (company.baseCountryId && company.baseCountryId !== countryId) {
      throw new BadRequestException('Country must match company base country');
    }
    if (company.operatingCountryIds?.length) {
      const allowed = company.operatingCountryIds.includes(countryId) || company.baseCountryId === countryId;
      if (!allowed) {
        throw new BadRequestException('Country not allowed for company');
      }
    }

    user.defaults = this.mergeDefaults(user, { countryId });
    await user.save();
    return this.toSafeUser(user.toObject() as UserEntity);
  }

  async setContextDefaults(
    userId: string,
    payload: {
      organizationId?: string;
      companyId?: string;
      enterpriseId?: string;
      countryId?: string;
      currencyId?: string;
    },
  ): Promise<SafeUser> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const nextDefaults = this.mergeDefaults(user, payload);
    if (!nextDefaults.organizationId) {
      throw new BadRequestException('Organization is required');
    }
    const belongs = user.Organizations?.some(
      (membership) => membership.OrganizationId === nextDefaults.organizationId,
    );
    if (!belongs) {
      throw new NotFoundException('Organization membership not found');
    }

    const companyId = nextDefaults.companyId;
    if (!companyId) {
      throw new BadRequestException('Company is required');
    }
    const companies = this.companiesService.listByUser(userId);
    const company = companies.find((item) => item.id === companyId);
    if (!company || company.organizationId !== nextDefaults.organizationId) {
      throw new BadRequestException('Company not found for organization');
    }

    const enterpriseId = nextDefaults.enterpriseId;
    if (!enterpriseId) {
      throw new BadRequestException('Enterprise is required');
    }
    const enterprise = company.enterprises?.find((item) => item.id === enterpriseId) ?? null;
    if (!enterprise) {
      throw new BadRequestException('Enterprise not found for company');
    }

    const countryId = nextDefaults.countryId ?? enterprise.countryId ?? company.baseCountryId ?? null;
    if (!countryId) {
      throw new BadRequestException('Country is required');
    }
    if (company.baseCountryId && company.baseCountryId !== countryId) {
      throw new BadRequestException('Country must match company base country');
    }
    if (company.operatingCountryIds?.length) {
      const allowed = company.operatingCountryIds.includes(countryId) || company.baseCountryId === countryId;
      if (!allowed) {
        throw new BadRequestException('Country not allowed for company');
      }
    }

    const currencyId = nextDefaults.currencyId;
    if (!currencyId) {
      throw new BadRequestException('Currency is required');
    }
    if (!enterprise.currencyIds?.includes(currencyId)) {
      throw new BadRequestException('Currency not allowed for enterprise');
    }

    user.defaultOrganizationId = nextDefaults.organizationId;
    user.defaultCompanyId = nextDefaults.companyId;
    user.defaultEnterpriseId = nextDefaults.enterpriseId;
    user.defaultCurrencyId = nextDefaults.currencyId;
    user.defaults = {
      organizationId: nextDefaults.organizationId,
      companyId: nextDefaults.companyId,
      enterpriseId: nextDefaults.enterpriseId,
      countryId,
      currencyId: nextDefaults.currencyId,
    };
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
    if (user.defaults?.organizationId === organizationId) {
      user.defaults = { ...(user.defaults ?? {}), organizationId: undefined };
    }
    await user.save();
    return this.toSafeUser(user.toObject() as UserEntity);
  }

  private toSafeUser(user: UserEntity): SafeUser {
    const { passwordHash, ...safe } = user;
    const defaults = this.mergeDefaults(user, {});
    return {
      ...safe,
      defaultOrganizationId: defaults.organizationId,
      defaultCompanyId: defaults.companyId,
      defaultEnterpriseId: defaults.enterpriseId,
      defaultCurrencyId: defaults.currencyId,
      defaults,
    };
  }

  private resolveUserCompany(userId: string, companyId?: string | null) {
    if (!companyId) {
      throw new BadRequestException('Default company is not set');
    }
    const companies = this.companiesService.listByUser(userId);
    const company = companies.find((item) => item.id === companyId);
    if (!company) {
      throw new BadRequestException('Default company not found');
    }
    return company;
  }

  private mergeDefaults(
    user: { defaults?: UserDefaults; defaultOrganizationId?: string; defaultCompanyId?: string; defaultEnterpriseId?: string; defaultCurrencyId?: string },
    updates: Partial<UserDefaults>,
  ): UserDefaults {
    const defaults = user.defaults ?? {};
    return {
      organizationId: updates.organizationId ?? defaults.organizationId ?? user.defaultOrganizationId,
      companyId: updates.companyId ?? defaults.companyId ?? user.defaultCompanyId,
      enterpriseId: updates.enterpriseId ?? defaults.enterpriseId ?? user.defaultEnterpriseId,
      countryId: updates.countryId ?? defaults.countryId,
      currencyId: updates.currencyId ?? defaults.currencyId ?? user.defaultCurrencyId,
    };
  }
}
