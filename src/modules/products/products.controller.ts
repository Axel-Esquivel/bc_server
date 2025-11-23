import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
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
  findAll() {
    const result = this.productsService.findAll();
    return { message: 'Products retrieved', result };
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.productsService.remove(id);
    return { message: 'Product deleted', result: { id } };
  }
}
