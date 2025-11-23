import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { PriceListsService } from './price-lists.service';

@Controller('price-lists')
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Post()
  create(@Body() dto: CreatePriceListDto) {
    const result = this.priceListsService.create(dto);
    return { message: 'Price list created', result };
  }

  @Get()
  findAll() {
    const result = this.priceListsService.findAll();
    return { message: 'Price lists retrieved', result };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const result = this.priceListsService.findOne(id);
    return { message: 'Price list retrieved', result };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePriceListDto) {
    const result = this.priceListsService.update(id, dto);
    return { message: 'Price list updated', result };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.priceListsService.remove(id);
    return { message: 'Price list deleted', result: { id } };
  }
}
