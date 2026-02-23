import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../core/types/authenticated-request.types';
import { LocationsService } from '../locations/locations.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseListQueryDto } from './dto/warehouse-list-query.dto';
import { WarehousesService } from './warehouses.service';

@Controller()
export class WarehousesController {
  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
  ) {}

  @Get('warehouses')
  async findAll(@Query() query: WarehouseListQueryDto, @Req() req: AuthenticatedRequest) {
    const organizationId = query.organizationId ?? query.OrganizationId ?? req.user?.organizationId ?? undefined;
    const enterpriseId = query.enterpriseId ?? req.user?.enterpriseId ?? undefined;
    const result = await this.warehousesService.findAll({
      ...query,
      organizationId,
      enterpriseId,
    });
    return { message: 'Warehouses retrieved', result };
  }

  @Post('warehouses')
  async create(@Body() dto: CreateWarehouseDto, @Req() req: AuthenticatedRequest) {
    const organizationId = dto.organizationId ?? dto.OrganizationId ?? req.user?.organizationId ?? undefined;
    const enterpriseId = dto.enterpriseId ?? req.user?.enterpriseId ?? undefined;
    const result = await this.warehousesService.create({
      ...dto,
      organizationId,
      enterpriseId,
    });
    return { message: 'Warehouse created', result };
  }

  @Get('warehouses/:id')
  async findOne(@Param('id') id: string) {
    const result = await this.warehousesService.findOne(id);
    return { message: 'Warehouse retrieved', result };
  }

  @Patch('warehouses/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const organizationId = dto.organizationId ?? dto.OrganizationId ?? req.user?.organizationId ?? undefined;
    const enterpriseId = dto.enterpriseId ?? req.user?.enterpriseId ?? undefined;
    const result = await this.warehousesService.update(id, {
      ...dto,
      organizationId,
      enterpriseId,
    });
    return { message: 'Warehouse updated', result };
  }

  @Delete('warehouses/:id')
  async remove(@Param('id') id: string) {
    await this.warehousesService.remove(id);
    return { message: 'Warehouse deleted', result: { id } };
  }

  @Get('warehouses/:id/locations/tree')
  async getLocationTree(@Param('id') warehouseId: string) {
    const result = await this.locationsService.getTree(warehouseId);
    return { message: 'Warehouse locations tree retrieved', result };
  }
}
