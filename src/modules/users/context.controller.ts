import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SetContextDefaultsDto } from './dto/set-context-defaults.dto';
import { UsersService } from './users.service';

@Controller('context')
export class ContextController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('defaults')
  async setDefaults(@Req() req: any, @Body() dto: SetContextDefaultsDto) {
    const user = await this.usersService.setContextDefaults(req.user.sub, dto);
    return {
      message: 'Context defaults updated',
      result: user,
    };
  }
}
