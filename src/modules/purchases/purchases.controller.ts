import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { ConfirmPurchaseOrderDto } from './dto/confirm-purchase-order.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseSuggestionQueryDto } from './dto/purchase-suggestion-query.dto';
import { CreateSupplierCatalogItemDto } from './dto/create-supplier-catalog-item.dto';
import { UpdateSupplierCatalogItemDto } from './dto/update-supplier-catalog-item.dto';
import { ListSupplierCatalogQueryDto } from './dto/list-supplier-catalog-query.dto';
import { PurchasesService } from './purchases.service';
import { PurchaseOrderStatus } from './entities/purchase-order.entity';

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
  async createOrder(@Body() dto: CreatePurchaseOrderDto) {
    return {
      message: 'Purchase order created',
      result: await this.purchasesService.createPurchaseOrder(dto),
    };
  }

  @Patch('orders/:id')
  async updateOrder(@Param('id') id: string, @Body() dto: CreatePurchaseOrderDto) {
    return {
      message: 'Purchase order updated',
      result: await this.purchasesService.updatePurchaseOrder(id, dto),
    };
  }

  @Get('orders')
  listOrders(
    @Query('OrganizationId') OrganizationId: string | undefined,
    @Query('companyId') companyId: string | undefined,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: PurchaseOrderStatus,
  ) {
    if (!OrganizationId || !companyId) {
      throw new BadRequestException('OrganizationId and companyId are required');
    }
    const result = this.purchasesService.listPurchaseOrdersByQuery({
      OrganizationId,
      companyId,
      supplierId,
      status,
    });
    return { message: 'Purchase orders retrieved', result };
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

  @Get('orders/best-price')
  async bestPrice(
    @Query('organizationId') organizationId: string | undefined,
    @Query('productId') productId: string | undefined,
    @Query('variantId') variantId?: string,
    @Query('packagingId') packagingId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!organizationId || !productId) {
      throw new BadRequestException('organizationId and productId are required');
    }
    const result = await this.purchasesService.listBestPrices({
      OrganizationId: organizationId,
      productId,
      variantId,
      packagingId,
      limit: limit ? Number(limit) : undefined,
    });
    return { message: 'Best prices retrieved', result };
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
    const result = this.purchasesService.listSupplierProducts(OrganizationId, companyId, supplierId);
    return { message: 'Supplier products retrieved', result };
  }

  @Get('suppliers/:supplierId/products/:variantId/last-cost')
  getSupplierVariantLastCost(
    @Param('supplierId') supplierId: string,
    @Param('variantId') variantId: string,
    @Query('OrganizationId') OrganizationId: string | undefined,
    @Query('companyId') companyId: string | undefined,
  ) {
    if (!OrganizationId || !companyId) {
      throw new BadRequestException('OrganizationId and companyId are required');
    }
    const result = this.purchasesService.getSupplierVariantLastCost(
      OrganizationId,
      companyId,
      supplierId,
      variantId,
    );
    return { message: 'Supplier product last cost retrieved', result };
  }
}
