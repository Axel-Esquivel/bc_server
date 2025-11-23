import { Module } from '@nestjs/common';
import { PriceListsModule } from '../price-lists/price-lists.module';
import { ProductsModule } from '../products/products.module';
import { ProvidersModule } from '../providers/providers.module';
import { UomModule } from '../uom/uom.module';
import { VariantsModule } from '../variants/variants.module';

@Module({
  imports: [ProductsModule, VariantsModule, UomModule, ProvidersModule, PriceListsModule],
  exports: [ProductsModule, VariantsModule, UomModule, ProvidersModule, PriceListsModule],
})
export class CatalogsModule {}
