import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductByCodeQueryDto } from './dto/product-by-code-query.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { ProductSearchQueryDto } from './dto/product-search-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { VariantsService } from '../variants/variants.service';
import { CreateProductVariantDto } from '../variants/dto/create-product-variant.dto';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly variantsService: VariantsService,
  ) {}

  @Post()
  async create(@Body() dto: CreateProductDto) {
    const result = await this.productsService.create(dto);
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

  @Get(':productId/variants')
  listVariants(@Param('productId') productId: string) {
    const product = this.productsService.findOne(productId);
    const variants = this.variantsService
      .findByProduct(productId)
      .filter(
        (variant) =>
          variant.OrganizationId === product.OrganizationId &&
          variant.companyId === product.companyId &&
          variant.enterpriseId === product.enterpriseId,
      );
    return { message: 'Product variants retrieved', result: variants };
  }

  @Post(':productId/variants')
  async createVariant(
    @Param('productId') productId: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    const result = await this.productsService.createVariant(productId, dto);
    return { message: 'Variant created', result };
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
