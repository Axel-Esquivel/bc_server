import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { CreatePackagingDto } from './dto/create-packaging.dto';
import { GenerateInternalBarcodeDto } from './dto/generate-internal-barcode.dto';
import { UpdatePackagingDto } from './dto/update-packaging.dto';
import { ProductPackagingService } from './product-packaging.service';
import type { AuthenticatedRequest } from '../../../core/types/authenticated-request.types';

@Controller('products')
export class ProductPackagingController {
  constructor(private readonly packagingService: ProductPackagingService) {}

  @Get(':variantId/packaging')
  async list(
    @Param('variantId') variantId: string,
    @Query('organizationId') organizationId: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const orgId = organizationId ?? req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.packagingService.listByVariant(variantId, orgId);
    return { message: 'Packaging retrieved', result };
  }

  @Post(':variantId/packaging')
  async create(@Param('variantId') variantId: string, @Body() dto: CreatePackagingDto) {
    const payload: CreatePackagingDto = { ...dto, variantId };
    const result = await this.packagingService.create(payload);
    return { message: 'Packaging created', result };
  }

  @Patch('packaging/:id')
  async update(@Param('id') id: string, @Body() dto: UpdatePackagingDto, @Req() req: AuthenticatedRequest) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.packagingService.update(id, dto, orgId);
    return { message: 'Packaging updated', result };
  }

  @Post('packaging/internal-barcode')
  async generateInternalBarcode(@Body() dto: GenerateInternalBarcodeDto, @Req() req: AuthenticatedRequest) {
    const organizationId = dto.organizationId ?? req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.packagingService.generateInternalBarcode(organizationId, '02');
    return { message: 'Internal barcode generated', result: { internalBarcode: result } };
  }

  @Delete('packaging/:id')
  async remove(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const orgId = organizationId ?? req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.packagingService.softDelete(id, orgId);
    return { message: 'Packaging removed', result };
  }
}
