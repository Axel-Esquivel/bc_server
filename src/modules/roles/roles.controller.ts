import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createRole(@Body() dto: CreateRoleDto) {
    const role = this.rolesService.createRole(dto);
    return {
      message: 'Role created',
      result: role,
    };
  }
}
