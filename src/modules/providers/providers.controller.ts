import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProvidersService } from './providers.service';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  create(@Body() dto: CreateProviderDto) {
    const result = this.providersService.create(dto);
    return { message: 'Provider created', result };
  }

  @Get()
  findAll() {
    const result = this.providersService.findAll();
    return { message: 'Providers retrieved', result };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const result = this.providersService.findOne(id);
    return { message: 'Provider retrieved', result };
  }

  @Get(':id/variants')
  findVariants(@Param('id') id: string) {
    const result = this.providersService.listVariants(id);
    return { message: 'Provider variants retrieved', result };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProviderDto) {
    const result = this.providersService.update(id, dto);
    return { message: 'Provider updated', result };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.providersService.remove(id);
    return { message: 'Provider deleted', result: { id } };
  }
}
