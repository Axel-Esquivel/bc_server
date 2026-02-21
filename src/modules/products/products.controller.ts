import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductByCodeQueryDto } from './dto/product-by-code-query.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { ProductSearchQueryDto } from './dto/product-search-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { VariantsService } from './variants/variants.service';
import { CreateProductVariantDto } from './variants/dto/create-product-variant.dto';
import type { AuthenticatedRequest } from '../../core/types/authenticated-request.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
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
  async findAll(@Query() query: ProductListQueryDto, @Req() req: AuthenticatedRequest) {
    const orgId = query.OrganizationId ?? req.user?.organizationId ?? undefined;
    const result = await this.productsService.findAll(query, orgId);
    return { message: 'Products retrieved', result };
  }

  @Get('search')
  async search(@Query() query: ProductSearchQueryDto, @Req() req: AuthenticatedRequest) {
    const orgId = query.OrganizationId ?? req.user?.organizationId ?? undefined;
    const result = await this.productsService.searchForPos(query, orgId);
    return { message: 'Products search retrieved', result };
  }

  @Get('by-code')
  async findByCode(@Query() query: ProductByCodeQueryDto, @Req() req: AuthenticatedRequest) {
    const orgId = query.OrganizationId ?? req.user?.organizationId ?? undefined;
    const result = await this.productsService.findByCodeForPos(query, orgId);
    return { message: 'Product lookup retrieved', result };
  }

  @Get(':productId/variants')
  async listVariants(@Param('productId') productId: string, @Req() req: AuthenticatedRequest) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const product = await this.productsService.findOne(productId, orgId);
    const variants = (await this.variantsService.findByProduct(productId, orgId)).filter(
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
    @Req() req: AuthenticatedRequest,
  ) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.productsService.createVariant(productId, dto, orgId);
    return { message: 'Variant created', result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.productsService.findOne(id, orgId);
    return { message: 'Product retrieved', result };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req: AuthenticatedRequest) {
    const orgId = dto.OrganizationId ?? req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.productsService.update(id, dto, orgId);
    return { message: 'Product updated', result };
  }

  @Put(':id')
  async replace(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req: AuthenticatedRequest) {
    const orgId = dto.OrganizationId ?? req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.productsService.update(id, dto, orgId);
    return { message: 'Product updated', result };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    await this.productsService.remove(id, orgId);
    return { message: 'Product deleted', result: { id } };
  }
}
