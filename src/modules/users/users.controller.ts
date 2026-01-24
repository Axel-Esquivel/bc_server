import { Body, Controller, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResolveUsersDto } from './dto/resolve-users.dto';
import { SetDefaultWorkspaceDto } from './dto/set-default-workspace.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('me/default-workspace')
  setDefaultWorkspace(@Req() req: any, @Body() dto: SetDefaultWorkspaceDto) {
    const user = this.usersService.setDefaultWorkspace(req.user.sub, dto.workspaceId);
    return {
      message: 'Default workspace updated',
      result: user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('resolve')
  resolveUsers(@Body() dto: ResolveUsersDto) {
    const users = this.usersService.resolveUsers(dto.ids ?? []);
    return {
      message: 'Users resolved',
      result: users,
    };
  }
}
