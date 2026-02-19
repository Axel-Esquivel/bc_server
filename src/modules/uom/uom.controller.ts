import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateUomCategoryDto } from './dto/create-uom-category.dto';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomCategoryDto } from './dto/update-uom-category.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { UomService } from './uom.service';

@Controller(['uom', 'uoms'])
export class UomController {
  constructor(private readonly uomService: UomService) {}

  @Post('categories')
  createCategory(@Body() dto: CreateUomCategoryDto) {
    const result = this.uomService.createCategory(dto);
    return { message: 'UoM category created', result };
  }

  @Get('categories')
  findCategories(@Query('organizationId') organizationId?: string) {
    const result = this.uomService.findAllCategories(organizationId);
    return { message: 'UoM categories retrieved', result };
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateUomCategoryDto) {
    const result = this.uomService.updateCategory(id, dto);
    return { message: 'UoM category updated', result };
  }

  @Post()
  create(@Body() dto: CreateUomDto) {
    const result = this.uomService.create(dto);
    return { message: 'UoM created', result };
  }

  @Get()
  findAll(@Query('organizationId') organizationId?: string, @Query('categoryId') categoryId?: string) {
    const result = this.uomService.findAll({ organizationId, categoryId });
    return { message: 'UoMs retrieved', result };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const result = this.uomService.findOne(id);
    return { message: 'UoM retrieved', result };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUomDto) {
    const result = this.uomService.update(id, dto);
    return { message: 'UoM updated', result };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.uomService.remove(id);
    return { message: 'UoM deleted', result: { id } };
  }
}
