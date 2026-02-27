import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { ConfirmPurchaseOrderDto } from './dto/confirm-purchase-order.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseSuggestionQueryDto } from './dto/purchase-suggestion-query.dto';
import { CreateSupplierCatalogItemDto } from './dto/create-supplier-catalog-item.dto';
import { UpdateSupplierCatalogItemDto } from './dto/update-supplier-catalog-item.dto';
import { ListSupplierCatalogQueryDto } from './dto/list-supplier-catalog-query.dto';
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

  @Post('supplier-catalog')
  createSupplierCatalog(@Body() dto: CreateSupplierCatalogItemDto) {
    const result = this.purchasesService.createSupplierCatalogItem(dto);
    return { message: 'Supplier catalog item created', result };
  }

  @Get('supplier-catalog')
  listSupplierCatalog(@Query() query: ListSupplierCatalogQueryDto) {
    const OrganizationId = query.OrganizationId?.trim();
    const companyId = query.companyId?.trim();
    if (!OrganizationId || !companyId) {
      throw new BadRequestException('OrganizationId and companyId are required');
    }
    const result = this.purchasesService.listSupplierCatalog({ ...query, OrganizationId, companyId });
    return { message: 'Supplier catalog retrieved', result };
  }

  @Get('supplier-catalog/:id')
  getSupplierCatalogItem(
    @Param('id') id: string,
    @Query('OrganizationId') OrganizationId: string | undefined,
    @Query('companyId') companyId: string | undefined,
  ) {
    if (!OrganizationId || !companyId) {
      throw new BadRequestException('OrganizationId and companyId are required');
    }
    const result = this.purchasesService.getSupplierCatalogItem(id, OrganizationId, companyId);
    return { message: 'Supplier catalog item retrieved', result };
  }

  @Patch('supplier-catalog/:id')
  updateSupplierCatalogItem(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierCatalogItemDto,
    @Query('OrganizationId') OrganizationId: string | undefined,
    @Query('companyId') companyId: string | undefined,
  ) {
    if (!OrganizationId || !companyId) {
      throw new BadRequestException('OrganizationId and companyId are required');
    }
    const result = this.purchasesService.updateSupplierCatalogItem(id, dto, OrganizationId, companyId);
    return { message: 'Supplier catalog item updated', result };
  }

  @Delete('supplier-catalog/:id')
  removeSupplierCatalogItem(
    @Param('id') id: string,
    @Query('OrganizationId') OrganizationId: string | undefined,
    @Query('companyId') companyId: string | undefined,
  ) {
    if (!OrganizationId || !companyId) {
      throw new BadRequestException('OrganizationId and companyId are required');
    }
    this.purchasesService.removeSupplierCatalogItem(id, OrganizationId, companyId);
    return { message: 'Supplier catalog item deleted', result: { id } };
  }

  @Get('suppliers/:supplierId/products')
  listSupplierProducts(
    @Param('supplierId') supplierId: string,
    @Query('OrganizationId') OrganizationId: string | undefined,
    @Query('companyId') companyId: string | undefined,
  ) {
    if (!OrganizationId || !companyId) {
      throw new BadRequestException('OrganizationId and companyId are required');
    }
    const result = this.purchasesService.listSupplierCatalogBySupplier(OrganizationId, companyId, supplierId);
    return { message: 'Supplier catalog retrieved', result };
  }
}
