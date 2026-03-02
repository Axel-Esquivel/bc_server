import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { CompaniesModule } from '../companies/companies.module';
import { ProvidersModule } from '../providers/providers.module';
import { ProductsModule } from '../products/products.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [InventoryModule, CompaniesModule, ProvidersModule, ProductsModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
