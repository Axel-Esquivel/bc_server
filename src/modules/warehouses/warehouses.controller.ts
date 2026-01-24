import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyPermission } from '../companies/decorators/company-permission.decorator';
import { CompanyPermissionGuard } from '../companies/guards/company-permission.guard';
import { CreateCompanyWarehouseDto } from './dto/create-company-warehouse.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { WarehousesService } from './warehouses.service';
import { LocationsService } from './locations.service';

@Controller()
export class WarehousesController {
  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
  ) {}

  @Get('warehouses')
  findAll() {
    return this.warehousesService.findAll();
  }

  @UseGuards(JwtAuthGuard, CompanyPermissionGuard)
  @CompanyPermission('company.manage')
  @Get('companies/:companyId/warehouses')
  listByCompany(@Param('companyId') companyId: string) {
    const result = this.warehousesService.listByCompany(companyId);
    return { message: 'Warehouses retrieved', result };
  }

  @UseGuards(JwtAuthGuard, CompanyPermissionGuard)
  @CompanyPermission('company.manage')
  @Post('companies/:companyId/warehouses')
  createForCompany(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCompanyWarehouseDto,
  ) {
    const result = this.warehousesService.createForCompany(companyId, dto);
    return { message: 'Warehouse created', result };
  }

  @Post('warehouses')
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(dto);
  }

  @Get('warehouses/:id')
  findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(id);
  }

  @Post('warehouses/:id/locations')
  createLocation(@Param('id') warehouseId: string, @Body() dto: CreateLocationDto) {
    const warehouse = this.warehousesService.findOne(warehouseId);
    return this.locationsService.createForWarehouse(warehouse, dto);
  }

  @Get('warehouses/:id/locations')
  listLocations(@Param('id') warehouseId: string) {
    this.warehousesService.findOne(warehouseId);
    return this.locationsService.findByWarehouse(warehouseId);
  }
}
