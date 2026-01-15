import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SetDefaultWorkspaceDto } from './dto/set-default-workspace.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('default-workspace')
  setDefaultWorkspace(@Req() req: any, @Body() dto: SetDefaultWorkspaceDto) {
    const user = this.usersService.setDefaultWorkspace(req.user.sub, dto.workspaceId);
    return {
      message: 'Default workspace updated',
      result: user,
    };
  }
}
