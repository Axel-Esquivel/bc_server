import { Module } from '@nestjs/common';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';
import { CountriesAdminGuard } from './guards/countries-admin.guard';

@Module({
  controllers: [CountriesController],
  providers: [CountriesService, CountriesAdminGuard],
  exports: [CountriesService],
})
export class CountriesModule {}
