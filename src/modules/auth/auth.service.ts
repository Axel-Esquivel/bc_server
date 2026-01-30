import { Inject, Injectable, Logger, OnModuleInit, UnauthorizedException, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ModuleStateService } from '../../core/database/module-state.service';
import { UsersService } from '../users/users.service';
import { DevicesService } from '../devices/devices.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CompaniesService } from '../companies/companies.service';
import { ActiveContext } from '../../core/types/active-context.types';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { OrganizationMemberStatus } from '../organizations/entities/organization.entity';

export interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  activeContext?: ActiveContext;
}

interface AuthState {
  tokens: { key: string; value: string }[];
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
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokens = new Map<string, string>();
  private readonly stateKey = 'module:auth:refresh-tokens';

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly devicesService: DevicesService,
    @Inject(forwardRef(() => OrganizationsService))
    private readonly organizationsService: OrganizationsService,
    @Inject(forwardRef(() => CompaniesService))
    private readonly companiesService: CompaniesService,
    private readonly moduleState: ModuleStateService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<AuthState>(this.stateKey, { tokens: [] });
    state.tokens?.forEach(({ key, value }) => this.refreshTokens.set(key, value));
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.validateCredentials(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const activeContext = this.resolveActiveContext(user.id);
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

    this.storeRefreshToken(user.id, deviceId, tokens.refreshToken);

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

    const activeContext = this.resolveActiveContext(user.id);
    const deviceId = 'untracked-device';
    const tokens = this.issueTokens({
      sub: user.id,
      email: user.email,
      deviceId,
      organizationId: activeContext.organizationId,
      companyId: activeContext.companyId,
      permissions: [],
    });

    this.storeRefreshToken(user.id, deviceId, tokens.refreshToken);
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
    const stored = this.refreshTokens.get(this.refreshKey(payload.sub, dto.deviceId || payload.deviceId));
    if (!stored || stored !== dto.refreshToken) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const activeContext = this.resolveActiveContext(payload.sub);
    const tokens = this.issueTokens({
      sub: payload.sub,
      email: payload.email,
      deviceId: dto.deviceId || payload.deviceId,
      organizationId: activeContext.organizationId,
      companyId: activeContext.companyId,
      permissions: payload.permissions || [],
    });

    this.storeRefreshToken(payload.sub, dto.deviceId || payload.deviceId, tokens.refreshToken);

    return {
      message: 'Token refreshed',
      result: {
        ...tokens,
        activeContext,
      },
    };
  }

  async getProfile(userId: string) {
    const user = this.usersService.findById(userId);
    const isFirstTime = !this.organizationsService.hasActiveMemberships(userId);
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
      const key = this.refreshKey(userId, deviceId);
      this.refreshTokens.delete(key);
      this.persistTokens();
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

  private storeRefreshToken(userId: string, deviceId: string, refreshToken: string) {
    const key = this.refreshKey(userId, deviceId);
    this.refreshTokens.set(key, refreshToken);
    this.persistTokens();
  }

  private refreshKey(userId: string, deviceId?: string) {
    return `${userId}:${deviceId || 'unknown-device'}`;
  }

  private persistTokens() {
    void this.moduleState
      .saveState<AuthState>(this.stateKey, {
        tokens: Array.from(this.refreshTokens.entries()).map(([key, value]) => ({ key, value })),
      })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist refresh tokens: ${message}`);
      });
  }

  private resolveActiveContext(userId: string): ActiveContext {
    const user = this.usersService.findById(userId);
    const memberships = this.organizationsService
      .listMembershipsByUser(userId)
      .filter((member) => member.status === OrganizationMemberStatus.Active);
    const preferredOrgId = user.defaultOrganizationId;
    const resolvedMembership =
      preferredOrgId && memberships.some((member) => member.organizationId === preferredOrgId)
        ? memberships.find((member) => member.organizationId === preferredOrgId) ?? null
        : memberships[0] ?? null;
    const organizationId = resolvedMembership?.organizationId ?? null;
    if (!organizationId) {
      return this.createEmptyContext();
    }

    const companies = this.companiesService
      .listByUser(userId)
      .filter((company) => company.organizationId === organizationId);
    const preferredCompanyId = user.defaultCompanyId ?? user.defaultWorkspaceId;
    const company =
      preferredCompanyId && companies.some((item) => item.id === preferredCompanyId)
        ? companies.find((item) => item.id === preferredCompanyId) ?? null
        : null;
    const enterpriseId = company?.defaultEnterpriseId ?? company?.enterprises?.[0]?.id ?? null;
    const enterprise = company?.enterprises?.find((item) => item.id === enterpriseId) ?? null;
    const currencyId = company ? this.resolveCompanyCurrency(organizationId, company, enterprise) : null;

    return {
      organizationId,
      companyId: company?.id ?? null,
      enterpriseId,
      currencyId,
    };
  }

  private resolveOrganizationCurrency(organizationId: string): string | null {
    const coreSettings = this.organizationsService.getCoreSettings(organizationId);
    return coreSettings.currencies[0]?.id ?? null;
  }

  private resolveCompanyCurrency(
    organizationId: string,
    company: { baseCurrencyId?: string | null; defaultCurrencyId?: string | null } | null,
    enterprise: { currencyIds: string[]; defaultCurrencyId?: string | null } | null,
  ): string | null {
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
    return enterprise?.currencyIds[0] ?? company.baseCurrencyId ?? this.resolveOrganizationCurrency(organizationId);
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
