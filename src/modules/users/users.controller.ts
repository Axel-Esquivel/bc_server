import { Body, Controller, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResolveUsersDto } from './dto/resolve-users.dto';
import { SetDefaultCompanyDto } from './dto/set-default-company.dto';
import { SetDefaultWorkspaceDto } from './dto/set-default-workspace.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('me/default-workspace')
  async setDefaultWorkspace(@Req() req: any, @Body() dto: SetDefaultWorkspaceDto) {
    const user = await this.usersService.setDefaultWorkspace(req.user.sub, dto.workspaceId);
    return {
      message: 'Default workspace updated',
      result: user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/default-company')
  async setDefaultCompany(@Req() req: any, @Body() dto: SetDefaultCompanyDto) {
    const user = await this.usersService.setDefaultCompany(req.user.sub, dto.companyId);
    return {
      message: 'Default company updated',
      result: user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('resolve')
  async resolveUsers(@Body() dto: ResolveUsersDto) {
    const users = await this.usersService.resolveUsers(dto.ids ?? []);
    return {
      message: 'Users resolved',
      result: users,
    };
  }
}
