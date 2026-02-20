import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PriceListsModule } from '../price-lists/price-lists.module';
import { ProductsController } from './products.controller';
import { ProductsOrgController } from './products-org.controller';
import { ProductsService } from './products.service';
import { VariantsController } from './variants/variants.controller';
import { VariantsService } from './variants/variants.service';
import { ProductPackagingController } from './packaging/product-packaging.controller';
import { ProductPackagingService } from './packaging/product-packaging.service';
import { PackagingNamesController } from './packaging-names/packaging-names.controller';
import { PackagingNamesService } from './packaging-names/packaging-names.service';
import { ProductsModelsProvider } from './models/products-models.provider';

@Module({
  imports: [PriceListsModule, OrganizationsModule],
  controllers: [
    ProductsController,
    ProductsOrgController,
    VariantsController,
    ProductPackagingController,
    PackagingNamesController,
  ],
  providers: [
    ProductsService,
    VariantsService,
    ProductPackagingService,
    PackagingNamesService,
    ProductsModelsProvider,
  ],
  exports: [
    ProductsService,
    VariantsService,
    ProductPackagingService,
    PackagingNamesService,
    ProductsModelsProvider,
  ],
})
export class ProductsModule {}
