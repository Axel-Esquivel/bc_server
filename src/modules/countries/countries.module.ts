import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsAdminGuard } from '../../core/guards/settings-admin.guard';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';
import { Country, CountrySchema } from './schemas/country.schema';

@Module({
  imports: [
    forwardRef(() => OrganizationsModule),
    MongooseModule.forFeature([{ name: Country.name, schema: CountrySchema }]),
  ],
  controllers: [CountriesController],
  providers: [CountriesService, SettingsAdminGuard],
  exports: [CountriesService],
})
export class CountriesModule {}
