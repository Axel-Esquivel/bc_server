import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CountriesService } from './countries.service';
import { SettingsAdminGuard } from '../../core/guards/settings-admin.guard';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  list(@Query('q') query?: string) {
    const result = this.countriesService.list(query);
    return { message: 'Countries retrieved', result };
  }

  @UseGuards(JwtAuthGuard, SettingsAdminGuard)
  @Post()
  create(@Body() dto: CreateCountryDto) {
    const result = this.countriesService.create(dto);
    return { message: 'Country created', result };
  }

  @UseGuards(JwtAuthGuard, SettingsAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    const result = this.countriesService.update(id, dto);
    return { message: 'Country updated', result };
  }

  @UseGuards(JwtAuthGuard, SettingsAdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    const result = this.countriesService.delete(id);
    return { message: 'Country removed', result };
  }
}
