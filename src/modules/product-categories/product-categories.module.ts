import { Module } from '@nestjs/common';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';
import { ProductCategoriesModelsProvider } from './models/product-categories-models.provider';

@Module({
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService, ProductCategoriesModelsProvider],
  exports: [ProductCategoriesService, ProductCategoriesModelsProvider],
})
export class ProductCategoriesModule {}
