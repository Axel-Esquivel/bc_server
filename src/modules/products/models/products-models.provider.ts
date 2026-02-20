import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { OrgDbService } from '../../../core/database/org-db.service';
import { OrgModelFactory } from '../../../core/database/org-model.factory';
import { ProductDocument, ProductSchema } from '../schemas/product.schema';
import { ProductVariantDocument, ProductVariantSchema } from '../schemas/product-variant.schema';
import { ProductPackagingDocument, ProductPackagingSchema } from '../schemas/product-packaging.schema';
import { PackagingNameDocument, PackagingNameSchema } from '../schemas/packaging-name.schema';

@Injectable()
export class ProductsModelsProvider {
  constructor(private readonly orgDb: OrgDbService, private readonly factory: OrgModelFactory) {}

  productModel(organizationId: string): Model<ProductDocument> {
    const conn = this.orgDb.getConnection(organizationId);
    return this.factory.getModel<ProductDocument>(conn, 'Product', ProductSchema, 'products');
  }

  variantModel(organizationId: string): Model<ProductVariantDocument> {
    const conn = this.orgDb.getConnection(organizationId);
    return this.factory.getModel<ProductVariantDocument>(conn, 'ProductVariant', ProductVariantSchema, 'product_variants');
  }

  packagingModel(organizationId: string): Model<ProductPackagingDocument> {
    const conn = this.orgDb.getConnection(organizationId);
    return this.factory.getModel<ProductPackagingDocument>(conn, 'ProductPackaging', ProductPackagingSchema, 'product_packaging');
  }

  packagingNameModel(organizationId: string): Model<PackagingNameDocument> {
    const conn = this.orgDb.getConnection(organizationId);
    return this.factory.getModel<PackagingNameDocument>(conn, 'PackagingName', PackagingNameSchema, 'packaging_names');
  }
}
