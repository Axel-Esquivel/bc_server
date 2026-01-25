import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsAdminGuard } from '../../core/guards/settings-admin.guard';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { CurrenciesService } from './currencies.service';

@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  list(@Query('q') query?: string) {
    const result = this.currenciesService.list(query);
    return { message: 'Currencies retrieved', result };
  }

  @UseGuards(JwtAuthGuard, SettingsAdminGuard)
  @Post()
  create(@Body() dto: CreateCurrencyDto) {
    const result = this.currenciesService.create(dto);
    return { message: 'Currency created', result };
  }

  @UseGuards(JwtAuthGuard, SettingsAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCurrencyDto) {
    const result = this.currenciesService.update(id, dto);
    return { message: 'Currency updated', result };
  }

  @UseGuards(JwtAuthGuard, SettingsAdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    const result = this.currenciesService.delete(id);
    return { message: 'Currency removed', result };
  }
}
