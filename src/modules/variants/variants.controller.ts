import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { VariantsService } from './variants.service';

@Controller('variants')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post()
  create(@Body() dto: CreateVariantDto) {
    const result = this.variantsService.create(dto);
    return { message: 'Variant created', result };
  }

  @Get()
  findAll() {
    const result = this.variantsService.findAll();
    return { message: 'Variants retrieved', result };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const result = this.variantsService.findOne(id);
    return { message: 'Variant retrieved', result };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    const result = this.variantsService.update(id, dto);
    return { message: 'Variant updated', result };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.variantsService.remove(id);
    return { message: 'Variant deleted', result: { id } };
  }
}
