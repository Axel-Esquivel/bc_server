import { Body, Controller, Param, Post } from '@nestjs/common';
import { AddCartLineDto } from './dto/add-cart-line.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { ConfirmCartDto } from './dto/confirm-cart.dto';
import { CreateCartDto } from './dto/create-cart.dto';
import { PosService } from './pos.service';

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
  confirm(@Param('id') cartId: string, @Body() dto: ConfirmCartDto) {
    return {
      message: 'Sale confirmed from cart',
      result: this.posService.confirmCart(cartId, dto),
    };
  }
}
