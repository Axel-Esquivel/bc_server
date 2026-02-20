import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { CreateUomCategoryDto } from './dto/create-uom-category.dto';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomCategoryDto } from './dto/update-uom-category.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { UomService } from './uom.service';
import type { AuthenticatedRequest } from '../../core/types/authenticated-request.types';

@Controller(['uom', 'uoms'])
export class UomController {
  constructor(private readonly uomService: UomService) {}

  @Post('categories')
  async createCategory(@Body() dto: CreateUomCategoryDto) {
    const result = await this.uomService.createCategory(dto);
    return { message: 'UoM category created', result };
  }

  @Get('categories')
  async findCategories(@Query('organizationId') organizationId?: string) {
    const result = await this.uomService.findAllCategories(organizationId);
    return { message: 'UoM categories retrieved', result };
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateUomCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.uomService.updateCategory(id, dto, orgId);
    return { message: 'UoM category updated', result };
  }

  @Post()
  async create(@Body() dto: CreateUomDto) {
    const result = await this.uomService.create(dto);
    return { message: 'UoM created', result };
  }

  @Get()
  async findAll(@Query('organizationId') organizationId?: string, @Query('categoryId') categoryId?: string) {
    const result = await this.uomService.findAll({ organizationId, categoryId });
    return { message: 'UoMs retrieved', result };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const orgId = organizationId ?? req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.uomService.findOne(id, orgId);
    return { message: 'UoM retrieved', result };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUomDto, @Req() req: AuthenticatedRequest) {
    const orgId = dto.organizationId ?? req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.uomService.update(id, dto, orgId);
    return { message: 'UoM updated', result };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const orgId = organizationId ?? req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    await this.uomService.remove(id, orgId);
    return { message: 'UoM deleted', result: { id } };
  }
}
