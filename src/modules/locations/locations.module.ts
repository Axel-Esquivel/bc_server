import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [OrganizationsModule, CompaniesModule],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
