import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { OrgDbService } from '../../../core/database/org-db.service';
import { OrgModelFactory } from '../../../core/database/org-model.factory';
import { ProductCategoryDocument, ProductCategorySchema } from '../schemas/product-category.schema';

@Injectable()
export class ProductCategoriesModelsProvider {
  constructor(private readonly orgDb: OrgDbService, private readonly factory: OrgModelFactory) {}

  categoryModel(organizationId: string): Model<ProductCategoryDocument> {
    const conn = this.orgDb.getConnection(organizationId);
    return this.factory.getModel<ProductCategoryDocument>(
      conn,
      'ProductCategory',
      ProductCategorySchema,
      'product_categories',
    );
  }
}
