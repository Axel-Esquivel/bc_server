import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CreateVariantDto } from './dto/create-variant.dto';
import { GenerateInternalSkuDto } from './dto/generate-internal-sku.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { VariantsService } from './variants.service';
import { VariantByCodeQueryDto } from './dto/variant-by-code-query.dto';
import type { AuthenticatedRequest } from '../../../core/types/authenticated-request.types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('variants')
@UseGuards(JwtAuthGuard)
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post()
  async create(@Body() dto: CreateVariantDto) {
    const result = await this.variantsService.create(dto);
    return { message: 'Variant created', result };
  }

  @Post('internal-sku')
  async generateInternalSku(@Body() dto: GenerateInternalSkuDto, @Req() req: AuthenticatedRequest) {
    const organizationId = dto.organizationId ?? req.user?.organizationId;
    const enterpriseId = dto.enterpriseId ?? req.user?.enterpriseId;
    if (!organizationId || !enterpriseId) {
      throw new BadRequestException('OrganizationId and enterpriseId are required');
    }
    const result = await this.variantsService.generateInternalSkuForVariant(
      organizationId,
      enterpriseId,
      dto.variantId,
    );
    return { message: 'Internal sku generated', result: { sku: result } };
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest, @Query('organizationId') organizationId?: string) {
    const orgId = organizationId ?? req.user?.organizationId ?? undefined;
    const resolvedOrgId = orgId || undefined;
    const result = await this.variantsService.findAll(resolvedOrgId);
    return { message: 'Variants retrieved', result };
  }

  @Get('by-code')
  async findByCode(@Query() query: VariantByCodeQueryDto, @Req() req: AuthenticatedRequest) {
    const orgId = query.OrganizationId ?? req.user?.organizationId ?? undefined;
    const resolvedOrgId = orgId || undefined;
    const result = await this.variantsService.findByCode({ ...query, OrganizationId: resolvedOrgId });
    return { message: 'Variant lookup retrieved', result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Query('organizationId') organizationId?: string) {
    const orgId = organizationId ?? req.user?.organizationId ?? undefined;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.variantsService.findOne(id, orgId);
    return { message: 'Variant retrieved', result };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVariantDto, @Req() req: AuthenticatedRequest) {
    const orgId = dto.OrganizationId ?? req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.variantsService.update(id, dto, orgId);
    return { message: 'Variant updated', result };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Query('organizationId') organizationId?: string) {
    const orgId = organizationId ?? req.user?.organizationId ?? undefined;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    await this.variantsService.remove(id, orgId);
    return { message: 'Variant deleted', result: { id } };
  }
}
