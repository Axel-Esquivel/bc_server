import { Module } from '@nestjs/common';
import { BranchesModule } from '../branches/branches.module';
import { CompaniesModule } from '../companies/companies.module';
import { WarehousesService } from './warehouses.service';
import { WarehousesController } from './warehouses.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [CompaniesModule, BranchesModule],
  controllers: [WarehousesController],
  providers: [WarehousesService, LocationsService],
  exports: [WarehousesService, LocationsService],
})
export class WarehousesModule {}
