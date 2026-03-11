import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PosService } from './pos.service';
import { OpenPosSessionDto } from './dto/open-pos-session.dto';
import { ClosePosSessionDto } from './dto/close-pos-session.dto';
import { ActivePosSessionQueryDto } from './dto/active-session-query.dto';
import { CreatePosSaleDto } from './dto/create-pos-sale.dto';
import { PosSaleActionDto } from './dto/pos-sale-action.dto';
import { ProductsService } from '../products/products.service';
import { ProductSearchQueryDto } from '../products/dto/product-search-query.dto';
import { ProductByCodeQueryDto } from '../products/dto/product-by-code-query.dto';
import type { AuthenticatedRequest } from '../../core/types/authenticated-request.types';

@Controller('pos')
@UseGuards(JwtAuthGuard)
export class PosController {
  constructor(
    private readonly posService: PosService,
    private readonly productsService: ProductsService,
  ) {}

  @Post('sessions/open')
  openSession(@Body() dto: OpenPosSessionDto) {
    return { message: 'POS session opened', result: this.posService.openSession(dto) };
  }

  @Get('sessions/active')
  getActiveSession(@Query() query: ActivePosSessionQueryDto) {
    return { message: 'POS active session loaded', result: this.posService.getActiveSession(query) };
  }

  @Post('sessions/close')
  closeSession(@Body() dto: ClosePosSessionDto) {
    return { message: 'POS session closed', result: this.posService.closeSession(dto) };
  }

  @Get('variants/search')
  async searchVariants(@Query() query: ProductSearchQueryDto, @Req() req: AuthenticatedRequest) {
    const orgId = query.OrganizationId ?? req.user?.organizationId ?? undefined;
    const result = await this.productsService.searchForPos(query, orgId);
    return { message: 'POS variants search retrieved', result };
  }

  @Get('variants/by-code')
  async findVariantByCode(@Query() query: ProductByCodeQueryDto, @Req() req: AuthenticatedRequest) {
    const orgId = query.OrganizationId ?? req.user?.organizationId ?? undefined;
    const result = await this.productsService.findByCodeForPos(query, orgId);
    return { message: 'POS variant lookup retrieved', result };
  }

  @Post('sales')
  createSale(@Body() dto: CreatePosSaleDto) {
    return { message: 'POS sale draft created', result: this.posService.createSale(dto) };
  }

  @Post('sales/:id/post')
  async postSale(@Param('id') saleId: string, @Body() dto: PosSaleActionDto) {
    return { message: 'POS sale posted', result: await this.posService.postSale(saleId, dto) };
  }

  @Get('sales')
  listSales(
    @Query('OrganizationId') OrganizationId?: string,
    @Query('companyId') companyId?: string,
    @Query('enterpriseId') enterpriseId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;
    if (from && Number.isNaN(from.getTime())) {
      throw new BadRequestException('Invalid dateFrom');
    }
    if (to && Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid dateTo');
    }
    return {
      message: 'POS sales loaded',
      result: this.posService.listSales({ OrganizationId, companyId, enterpriseId, dateFrom: from, dateTo: to }),
    };
  }
}
