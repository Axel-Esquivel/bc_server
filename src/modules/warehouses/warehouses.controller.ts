import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateLocationDto } from './dto/create-location.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { WarehousesService } from './warehouses.service';
import { LocationsService } from './locations.service';

@Controller('warehouses')
export class WarehousesController {
  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
  ) {}

  @Get()
  findAll() {
    return this.warehousesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(id);
  }

  @Post(':id/locations')
  createLocation(@Param('id') warehouseId: string, @Body() dto: CreateLocationDto) {
    const warehouse = this.warehousesService.findOne(warehouseId);
    return this.locationsService.createForWarehouse(warehouse, dto);
  }

  @Get(':id/locations')
  listLocations(@Param('id') warehouseId: string) {
    this.warehousesService.findOne(warehouseId);
    return this.locationsService.findByWarehouse(warehouseId);
  }
}
