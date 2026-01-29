import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService, TokenBundle } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../core/types/authenticated-request.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto): Promise<{ message: string; result: TokenBundle }> {
    return this.authService.refresh(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: AuthenticatedRequest) {
    const headerDeviceId = req.headers['x-device-id'];
    const resolvedDeviceId =
      typeof headerDeviceId === 'string'
        ? headerDeviceId
        : Array.isArray(headerDeviceId)
          ? headerDeviceId[0]
          : undefined;
    const deviceId = req.user?.deviceId ?? resolvedDeviceId;
    return this.authService.logout(req.user?.sub, deviceId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    if (!req.user?.sub) {
      throw new UnauthorizedException();
    }
    return this.authService.getProfile(req.user.sub);
  }
}
