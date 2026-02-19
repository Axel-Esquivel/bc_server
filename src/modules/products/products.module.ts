import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PriceListsModule } from '../price-lists/price-lists.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { VariantsController } from './variants/variants.controller';
import { VariantsService } from './variants/variants.service';
import { ProductPackagingController } from './packaging/product-packaging.controller';
import { ProductPackagingService } from './packaging/product-packaging.service';

@Module({
  imports: [PriceListsModule, OrganizationsModule],
  controllers: [ProductsController, VariantsController, ProductPackagingController],
  providers: [ProductsService, VariantsService, ProductPackagingService],
  exports: [ProductsService, VariantsService, ProductPackagingService],
})
export class ProductsModule {}
