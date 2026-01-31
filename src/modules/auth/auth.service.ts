import { Inject, Injectable, Logger, UnauthorizedException, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { DevicesService } from '../devices/devices.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CompaniesService } from '../companies/companies.service';
import { ActiveContext } from '../../core/types/active-context.types';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { OrganizationMemberStatus } from '../organizations/entities/organization.entity';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';

export interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  activeContext?: ActiveContext;
}

interface AuthTokenPayload {
  sub: string;
  email: string;
  deviceId: string;
  permissions: string[];
  organizationId?: string | null;
  companyId?: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly devicesService: DevicesService,
    @Inject(forwardRef(() => OrganizationsService))
    private readonly organizationsService: OrganizationsService,
    @Inject(forwardRef(() => CompaniesService))
    private readonly companiesService: CompaniesService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.validateCredentials(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const activeContext = await this.resolveActiveContext(user.id);
    const deviceId = 'untracked-device';

    this.devicesService.upsertDevice(user.id, deviceId, activeContext.companyId ?? undefined);

    const tokens = this.issueTokens({
      sub: user.id,
      email: user.email,
      deviceId,
      organizationId: activeContext.organizationId,
      companyId: activeContext.companyId,
      permissions: [],
    });

    await this.storeRefreshToken(user.id, deviceId, tokens.refreshToken);

    return {
      message: 'Login successful',
      result: {
        user,
        deviceId,
        activeContext,
        ...tokens,
      },
    };
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.createUser({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      password: dto.password,
    });

    const activeContext = await this.resolveActiveContext(user.id);
    const deviceId = 'untracked-device';
    const tokens = this.issueTokens({
      sub: user.id,
      email: user.email,
      deviceId,
      organizationId: activeContext.organizationId,
      companyId: activeContext.companyId,
      permissions: [],
    });

    await this.storeRefreshToken(user.id, deviceId, tokens.refreshToken);
    return {
      message: 'User registered',
      result: {
        user,
        activeContext,
        deviceId,
        ...tokens,
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const deviceId = dto.deviceId || payload.deviceId;
    const stored = await this.refreshTokenModel
      .findOne({ userId: payload.sub, deviceId })
      .lean()
      .exec();
    if (!stored || stored.token !== dto.refreshToken) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const activeContext = await this.resolveActiveContext(payload.sub);
    const tokens = this.issueTokens({
      sub: payload.sub,
      email: payload.email,
      deviceId,
      organizationId: activeContext.organizationId,
      companyId: activeContext.companyId,
      permissions: payload.permissions || [],
    });

    await this.storeRefreshToken(payload.sub, deviceId, tokens.refreshToken);

    return {
      message: 'Token refreshed',
      result: {
        ...tokens,
        activeContext,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    const isFirstTime = !(await this.organizationsService.hasActiveMemberships(userId));
    return {
      message: 'User profile',
      result: {
        user,
        isFirstTime,
      },
    };
  }

  logout(userId?: string, deviceId?: string) {
    if (userId) {
      void this.refreshTokenModel.deleteOne({
        userId,
        deviceId: deviceId || 'unknown-device',
      }).exec();
    }

    return {
      message: 'Logout successful',
      result: { success: true },
    };
  }

  private issueTokens(payload: AuthTokenPayload): TokenBundle {
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'demo-secret',
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'demo-refresh-secret',
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(token: string): Promise<AuthTokenPayload> {
    try {
      const payload = (await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET || 'demo-refresh-secret',
      })) as AuthTokenPayload;
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async storeRefreshToken(userId: string, deviceId: string, refreshToken: string) {
    await this.refreshTokenModel.updateOne(
      { userId, deviceId },
      { $set: { token: refreshToken } },
      { upsert: true },
    ).exec();
  }

  private async resolveActiveContext(userId: string): Promise<ActiveContext> {
    const user = await this.usersService.findById(userId);
    const memberships = (await this.organizationsService.listMembershipsByUser(userId)).filter(
      (member) => member.status === OrganizationMemberStatus.Active,
    );
    const preferredOrgId = user.defaultOrganizationId;
    const resolvedMembership =
      preferredOrgId && memberships.some((member) => member.organizationId === preferredOrgId)
        ? memberships.find((member) => member.organizationId === preferredOrgId) ?? null
        : memberships[0] ?? null;
    const organizationId = resolvedMembership?.organizationId ?? null;
    if (!organizationId) {
      return this.createEmptyContext();
    }

    const companies = (await this.companiesService.listByUser(userId)).filter(
      (company) => company.organizationId === organizationId,
    );
    const preferredCompanyId = user.defaultCompanyId ?? user.defaultWorkspaceId;
    const company =
      preferredCompanyId && companies.some((item) => item.id === preferredCompanyId)
        ? companies.find((item) => item.id === preferredCompanyId) ?? null
        : null;
    const enterpriseId = company?.defaultEnterpriseId ?? company?.enterprises?.[0]?.id ?? null;
    const enterprise = company?.enterprises?.find((item) => item.id === enterpriseId) ?? null;
    const currencyId = company
      ? await this.resolveCompanyCurrency(organizationId, company, enterprise)
      : null;

    return {
      organizationId,
      companyId: company?.id ?? null,
      enterpriseId,
      currencyId,
    };
  }

  private async resolveOrganizationCurrency(organizationId: string): Promise<string | null> {
    const coreSettings = await this.organizationsService.getCoreSettings(organizationId);
    return coreSettings.currencies[0]?.id ?? null;
  }

  private async resolveCompanyCurrency(
    organizationId: string,
    company: { baseCurrencyId?: string | null; defaultCurrencyId?: string | null } | null,
    enterprise: { currencyIds: string[]; defaultCurrencyId?: string | null } | null,
  ): Promise<string | null> {
    if (!company) {
      return this.resolveOrganizationCurrency(organizationId);
    }
    const enterpriseDefault = enterprise?.defaultCurrencyId ?? null;
    if (enterpriseDefault && enterprise?.currencyIds.includes(enterpriseDefault)) {
      return enterpriseDefault;
    }
    const requested = company.defaultCurrencyId ?? company.baseCurrencyId ?? null;
    if (requested && enterprise?.currencyIds.includes(requested)) {
      return requested;
    }
    return (
      enterprise?.currencyIds[0] ??
      company.baseCurrencyId ??
      (await this.resolveOrganizationCurrency(organizationId))
    );
  }

  private createEmptyContext(): ActiveContext {
    return {
      organizationId: null,
      companyId: null,
      enterpriseId: null,
      currencyId: null,
    };
  }
}
