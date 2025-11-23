import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { ConfirmPurchaseOrderDto } from './dto/confirm-purchase-order.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseSuggestionQueryDto } from './dto/purchase-suggestion-query.dto';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get('suggestions')
  getSuggestions(@Query() query: PurchaseSuggestionQueryDto) {
    return {
      message: 'Purchase suggestions generated',
      result: this.purchasesService.generateSuggestions(query),
    };
  }

  @Post('orders')
  createOrder(@Body() dto: CreatePurchaseOrderDto) {
    return {
      message: 'Purchase order created',
      result: this.purchasesService.createPurchaseOrder(dto),
    };
  }

  @Post('orders/:id/confirm')
  confirmOrder(@Param('id') id: string, @Body() dto: ConfirmPurchaseOrderDto) {
    return {
      message: 'Purchase order confirmed',
      result: this.purchasesService.confirmPurchaseOrder(id, dto),
    };
  }

  @Post('grn')
  recordGoodsReceipt(@Body() dto: CreateGoodsReceiptDto) {
    return {
      message: 'Goods receipt recorded and stock updated',
      result: this.purchasesService.recordGoodsReceipt(dto),
    };
  }
}
