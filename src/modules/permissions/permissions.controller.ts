import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('assign')
  assignPermissions(@Body() dto: AssignPermissionsDto) {
    const role = this.permissionsService.assignToRole(dto.roleId, dto.permissions);
    return {
      message: 'Permissions assigned',
      result: role,
    };
  }
}
