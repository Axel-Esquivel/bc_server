import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CountriesService } from './countries.service';
import { CountriesAdminGuard } from './guards/countries-admin.guard';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  list(@Query('q') query?: string) {
    const result = this.countriesService.list(query);
    return { message: 'Countries retrieved', result };
  }

  @UseGuards(JwtAuthGuard, CountriesAdminGuard)
  @Post()
  create(@Body() dto: CreateCountryDto) {
    const result = this.countriesService.create(dto);
    return { message: 'Country created', result };
  }

  @UseGuards(JwtAuthGuard, CountriesAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    const result = this.countriesService.update(id, dto);
    return { message: 'Country updated', result };
  }
}
