import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
<<<<<<< ours
<<<<<<< ours
import { AuthService } from './auth.service';
=======
import { AuthService, TokenBundle } from './auth.service';
>>>>>>> theirs
=======
import { AuthService, TokenBundle } from './auth.service';
>>>>>>> theirs
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
<<<<<<< ours
<<<<<<< ours
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
=======
  refresh(@Body() dto: RefreshTokenDto): Promise<{ message: string; result: TokenBundle }> {
    return this.authService.refresh(dto) as any;
>>>>>>> theirs
=======
  async refresh(@Body() dto: RefreshTokenDto): Promise<{ message: string; result: TokenBundle }> {
    return this.authService.refresh(dto);
>>>>>>> theirs
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.authService.getProfile(req.user.sub);
  }
}
