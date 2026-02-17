import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductByCodeQueryDto } from './dto/product-by-code-query.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { ProductSearchQueryDto } from './dto/product-search-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    const result = this.productsService.create(dto);
    return { message: 'Product created', result };
  }

  @Get()
  findAll(@Query() query: ProductListQueryDto) {
    const result = this.productsService.findAll(query);
    return { message: 'Products retrieved', result };
  }

  @Get('search')
  search(@Query() query: ProductSearchQueryDto) {
    const result = this.productsService.searchForPos(query);
    return { message: 'Products search retrieved', result };
  }

  @Get('by-code')
  findByCode(@Query() query: ProductByCodeQueryDto) {
    const result = this.productsService.findByCodeForPos(query);
    return { message: 'Product lookup retrieved', result };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const result = this.productsService.findOne(id);
    return { message: 'Product retrieved', result };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const result = this.productsService.update(id, dto);
    return { message: 'Product updated', result };
  }

  @Put(':id')
  replace(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const result = this.productsService.update(id, dto);
    return { message: 'Product updated', result };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.productsService.remove(id);
    return { message: 'Product deleted', result: { id } };
  }
}
