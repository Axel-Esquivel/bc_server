import { Module } from '@nestjs/common';
import { PriceListsModule } from '../price-lists/price-lists.module';
import { VariantsModule } from '../variants/variants.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [VariantsModule, PriceListsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
