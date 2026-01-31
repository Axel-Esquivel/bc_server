import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationPermission } from '../organizations/decorators/organization-permission.decorator';
import { OrganizationAdminGuard } from '../organizations/guards/organization-admin.guard';
import { CreateInventoryLocationDto } from './dto/create-inventory-location.dto';
import { LocationsService } from './locations.service';

@Controller('organizations/:id/companies/:companyId/locations')
@UseGuards(JwtAuthGuard, OrganizationAdminGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @OrganizationPermission('locations.read')
  async list(@Param('id') organizationId: string, @Param('companyId') companyId: string) {
    const result = await this.locationsService.listByCompany(organizationId, companyId);
    return { message: 'Locations retrieved', result };
  }

  @Post()
  @OrganizationPermission('locations.write')
  async create(
    @Param('id') organizationId: string,
    @Param('companyId') companyId: string,
    @Body() dto: CreateInventoryLocationDto,
  ) {
    const result = await this.locationsService.create(organizationId, companyId, dto);
    return { message: 'Location created', result };
  }
}
