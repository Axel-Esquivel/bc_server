import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ModuleStateService } from '../../core/database/module-state.service';
import { UsersService } from '../users/users.service';
import { DevicesService } from '../devices/devices.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

export interface TokenBundle {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  tokens: { key: string; value: string }[];
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
    private readonly workspacesService: WorkspacesService,
    private readonly organizationsService: OrganizationsService,
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

    const workspaceId = user.defaultWorkspaceId || user.workspaces?.[0]?.workspaceId;
    if (workspaceId) {
      this.workspacesService.getWorkspace(workspaceId);
    }
    const deviceId = 'untracked-device';

    this.devicesService.upsertDevice(user.id, deviceId, workspaceId);

    const tokens = this.issueTokens({
      sub: user.id,
      email: user.email,
      workspaceId,
      deviceId,
      workspaces: user.workspaces,
      permissions: [],
    });

    this.storeRefreshToken(user.id, deviceId, tokens.refreshToken);

    return {
      message: 'Login successful',
      result: {
        user,
        workspaceId,
        deviceId,
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

    const workspaceId = user.defaultWorkspaceId || user.workspaces?.[0]?.workspaceId;
    const deviceId = 'untracked-device';
    const tokens = this.issueTokens({
      sub: user.id,
      email: user.email,
      workspaceId,
      deviceId,
      workspaces: user.workspaces,
      permissions: [],
    });

    this.storeRefreshToken(user.id, deviceId, tokens.refreshToken);
    return {
      message: 'User registered',
      result: {
        user,
        workspaceId,
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

    const tokens = this.issueTokens({
      sub: payload.sub,
      email: payload.email,
      workspaceId: payload.workspaceId,
      deviceId: dto.deviceId || payload.deviceId,
      workspaces: payload.workspaces,
      permissions: payload.permissions || [],
    });

    this.storeRefreshToken(payload.sub, dto.deviceId || payload.deviceId, tokens.refreshToken);

    return {
      message: 'Token refreshed',
      result: tokens,
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

  private issueTokens(payload: any): TokenBundle {
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

  private async verifyRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET || 'demo-refresh-secret',
      });
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
}
