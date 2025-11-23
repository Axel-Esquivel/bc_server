import { Module } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { WarehousesController } from './warehouses.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [WarehousesController],
  providers: [WarehousesService, LocationsService],
  exports: [WarehousesService, LocationsService],
})
export class WarehousesModule {}
