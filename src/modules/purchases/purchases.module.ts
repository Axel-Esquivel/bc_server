import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { CompaniesModule } from '../companies/companies.module';
import { ProvidersModule } from '../providers/providers.module';
import { ProductsModule } from '../products/products.module';
import { StockModule } from '../stock/stock.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [InventoryModule, CompaniesModule, ProvidersModule, ProductsModule, StockModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
