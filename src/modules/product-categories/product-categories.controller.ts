import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoriesService } from './product-categories.service';

@Controller('product-categories')
export class ProductCategoriesController {
  constructor(private readonly categoriesService: ProductCategoriesService) {}

  @Get('tree')
  getTree(@Query('organizationId') organizationId?: string) {
    if (!organizationId) {
      return { message: 'Organization id is required', result: [] };
    }
    const result = this.categoriesService.buildTree(organizationId);
    return { message: 'Product categories tree retrieved', result };
  }

  @Get()
  findAll(@Query('organizationId') organizationId?: string) {
    const result = this.categoriesService.findAll(organizationId);
    return { message: 'Product categories retrieved', result };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const result = this.categoriesService.findOne(id);
    return { message: 'Product category retrieved', result };
  }

  @Post()
  create(@Body() dto: CreateProductCategoryDto) {
    const result = this.categoriesService.create(dto);
    return { message: 'Product category created', result };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductCategoryDto) {
    const result = this.categoriesService.update(id, dto);
    return { message: 'Product category updated', result };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.categoriesService.remove(id);
    return { message: 'Product category removed', result: { id } };
  }
}
