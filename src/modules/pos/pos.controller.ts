import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../core/types/authenticated-request.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductByCodeQueryDto } from '../products/dto/product-by-code-query.dto';
import { ProductSearchQueryDto } from '../products/dto/product-search-query.dto';
import { OpenPosSessionDto } from './dto/open-pos-session.dto';
import { ClosePosSessionDto } from './dto/close-pos-session.dto';
import { CreatePosSaleDto } from './dto/create-pos-sale.dto';
import { PosSaleActionDto } from './dto/pos-sale-action.dto';
import { ActivePosSessionQueryDto } from './dto/active-pos-session.dto';
import { PosService } from './pos.service';

@Controller('pos')
@UseGuards(JwtAuthGuard)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('sessions/open')
  openSession(@Body() dto: OpenPosSessionDto) {
    return { message: 'Sesion POS abierta', result: this.posService.openSession(dto) };
  }

  @Get('sessions/active')
  getActiveSession(@Query() query: ActivePosSessionQueryDto) {
    return { message: 'Sesion activa POS', result: this.posService.getActiveSession(query) };
  }

  @Post('sessions/close')
  closeSession(@Body() dto: ClosePosSessionDto) {
    return { message: 'Sesion POS cerrada', result: this.posService.closeSession(dto) };
  }

  @Get('variants/search')
  async searchVariants(@Query() query: ProductSearchQueryDto, @Req() req: AuthenticatedRequest) {
    const orgId = query.OrganizationId ?? req.user?.organizationId ?? undefined;
    if (!orgId) {
      return { message: 'Busqueda POS sin OrganizationId', result: [] };
    }
    const result = await this.posService.searchVariants({
      OrganizationId: orgId,
      enterpriseId: query.enterpriseId,
      companyId: query.companyId,
      q: query.q,
    });
    return { message: 'Busqueda POS de variantes', result };
  }

  @Get('variants/by-code')
  async findVariantByCode(@Query() query: ProductByCodeQueryDto, @Req() req: AuthenticatedRequest) {
    const orgId = query.OrganizationId ?? req.user?.organizationId ?? undefined;
    if (!orgId) {
      return { message: 'Busqueda POS sin OrganizationId', result: null };
    }
    const result = await this.posService.findVariantByCode({
      OrganizationId: orgId,
      enterpriseId: query.enterpriseId,
      companyId: query.companyId,
      code: query.code,
    });
    return { message: 'Busqueda POS por codigo', result };
  }

  @Post('sales')
  createSale(@Body() dto: CreatePosSaleDto) {
    return { message: 'Venta POS creada', result: this.posService.createSale(dto) };
  }

  @Post('sales/:id/post')
  postSale(@Param('id') saleId: string, @Body() dto: PosSaleActionDto) {
    return { message: 'Venta POS confirmada', result: this.posService.postSale(saleId, dto) };
  }

  @Get('sales/recent')
  listRecent(@Query() query: { OrganizationId?: string; companyId?: string; enterpriseId?: string; limit?: string }) {
    const limit = query.limit ? Number(query.limit) : undefined;
    const result = this.posService.listRecentSales({
      OrganizationId: query.OrganizationId,
      companyId: query.companyId,
      enterpriseId: query.enterpriseId,
      limit: Number.isNaN(limit ?? NaN) ? undefined : limit,
    });
    return { message: 'Ventas recientes POS', result };
  }
}
