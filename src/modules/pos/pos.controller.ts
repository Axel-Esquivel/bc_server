import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AddCartLineDto } from './dto/add-cart-line.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { ClosePosSessionDto } from './dto/close-pos-session.dto';
import { ConfirmCartDto } from './dto/confirm-cart.dto';
import { CreateCartDto } from './dto/create-cart.dto';
import { CreatePosSaleDto } from './dto/create-pos-sale.dto';
import { OpenPosSessionDto } from './dto/open-pos-session.dto';
import { PosSaleActionDto } from './dto/pos-sale-action.dto';
import { PosService } from './pos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('carts')
  createCart(@Body() dto: CreateCartDto) {
    return {
      message: 'POS cart created',
      result: this.posService.createCart(dto),
    };
  }

  @Post('sessions/open')
  @UseGuards(JwtAuthGuard)
  openSession(@Body() dto: OpenPosSessionDto) {
    return {
      message: 'POS session opened',
      result: this.posService.openSession(dto),
    };
  }

  @Post('sessions/close')
  @UseGuards(JwtAuthGuard)
  closeSession(@Body() dto: ClosePosSessionDto) {
    return {
      message: 'POS session closed',
      result: this.posService.closeSession(dto),
    };
  }

  @Post('carts/:id/lines')
  addLine(@Param('id') cartId: string, @Body() dto: AddCartLineDto) {
    return {
      message: 'Cart line added and stock reserved',
      result: this.posService.addLine(cartId, dto),
    };
  }

  @Post('carts/:id/payments')
  addPayment(@Param('id') cartId: string, @Body() dto: AddPaymentDto) {
    return {
      message: 'Payment registered for cart',
      result: this.posService.addPayment(cartId, dto),
    };
  }

  @Post('carts/:id/confirm')
  @UseGuards(JwtAuthGuard)
  async confirm(@Param('id') cartId: string, @Body() dto: ConfirmCartDto, @Req() req: any) {
    return {
      message: 'Sale confirmed from cart',
      result: await this.posService.confirmCart(cartId, dto, req.userId ?? req.user?.sub ?? req.user?.id),
    };
  }

  @Post('sales')
  @UseGuards(JwtAuthGuard)
  createSale(@Body() dto: CreatePosSaleDto) {
    return {
      message: 'POS sale draft created',
      result: this.posService.createSale(dto),
    };
  }

  @Post('sales/:id/post')
  @UseGuards(JwtAuthGuard)
  async postSale(@Param('id') saleId: string, @Body() dto: PosSaleActionDto) {
    return {
      message: 'POS sale posted',
      result: await this.posService.postSale(saleId, dto),
    };
  }

  @Post('sales/:id/void')
  @UseGuards(JwtAuthGuard)
  voidSale(@Param('id') saleId: string, @Body() dto: PosSaleActionDto) {
    return {
      message: 'POS sale voided',
      result: this.posService.voidSale(saleId, dto),
    };
  }

  @Get('sales')
  @UseGuards(JwtAuthGuard)
  listSales(
    @Query('OrganizationId') OrganizationId?: string,
    @Query('companyId') companyId?: string,
    @Query('terminalId') terminalId?: string,
    @Query('cashierUserId') cashierUserId?: string,
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
      result: this.posService.listSales({
        OrganizationId,
        companyId,
        terminalId,
        cashierUserId,
        dateFrom: from,
        dateTo: to,
      }),
    };
  }
}
