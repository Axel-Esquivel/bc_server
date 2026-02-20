import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { VariantsService } from './variants.service';
import { VariantByCodeQueryDto } from './dto/variant-by-code-query.dto';

@Controller('variants')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post()
  async create(@Body() dto: CreateVariantDto) {
    const result = await this.variantsService.create(dto);
    return { message: 'Variant created', result };
  }

  @Get()
  findAll() {
    const result = this.variantsService.findAll();
    return { message: 'Variants retrieved', result };
  }

  @Get('by-code')
  findByCode(@Query() query: VariantByCodeQueryDto) {
    const result = this.variantsService.findByCode(query);
    return { message: 'Variant lookup retrieved', result };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const result = this.variantsService.findOne(id);
    return { message: 'Variant retrieved', result };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    const result = await this.variantsService.update(id, dto);
    return { message: 'Variant updated', result };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.variantsService.remove(id);
    return { message: 'Variant deleted', result: { id } };
  }
}
