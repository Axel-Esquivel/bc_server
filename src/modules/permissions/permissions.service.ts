import { Injectable } from '@nestjs/common';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly rolesService: RolesService) {}

  assignToRole(roleId: string, permissions: string[]) {
    return this.rolesService.assignPermissions(roleId, permissions);
  }
}
