import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoriesService } from './product-categories.service';
import type { AuthenticatedRequest } from '../../core/types/authenticated-request.types';

@Controller('product-categories')
export class ProductCategoriesController {
  constructor(private readonly categoriesService: ProductCategoriesService) {}

  @Get('tree')
  async getTree(@Query('organizationId') organizationId?: string, @Req() req?: AuthenticatedRequest) {
    const resolvedOrgId = organizationId ?? req?.user?.organizationId ?? undefined;
    if (!resolvedOrgId) {
      return { message: 'Organization id is required', result: [] };
    }
    const result = await this.categoriesService.buildTree(resolvedOrgId);
    return { message: 'Product categories tree retrieved', result };
  }

  @Get()
  async findAll(@Query('organizationId') organizationId?: string, @Req() req?: AuthenticatedRequest) {
    const resolvedOrgId = organizationId ?? req?.user?.organizationId ?? undefined;
    const result = await this.categoriesService.findAll(resolvedOrgId);
    return { message: 'Product categories retrieved', result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const organizationId = req.user?.organizationId ?? '';
    const result = await this.categoriesService.findOne(id, organizationId);
    return { message: 'Product category retrieved', result };
  }

  @Post()
  async create(@Body() dto: CreateProductCategoryDto) {
    const result = await this.categoriesService.create(dto);
    return { message: 'Product category created', result };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const organizationId = req.user?.organizationId ?? '';
    const result = await this.categoriesService.update(id, dto, organizationId);
    return { message: 'Product category updated', result };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const organizationId = req.user?.organizationId ?? '';
    await this.categoriesService.remove(id, organizationId);
    return { message: 'Product category removed', result: { id } };
  }
}
