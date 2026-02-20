import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { OrgDbService } from '../../../core/database/org-db.service';
import { OrgModelFactory } from '../../../core/database/org-model.factory';
import { UomCategoryDocument, UomCategorySchema } from '../schemas/uom-category.schema';
import { UomDocument, UomSchema } from '../schemas/uom.schema';

@Injectable()
export class UomModelsProvider {
  constructor(private readonly orgDb: OrgDbService, private readonly factory: OrgModelFactory) {}

  categoryModel(organizationId: string): Model<UomCategoryDocument> {
    const conn = this.orgDb.getConnection(organizationId);
    return this.factory.getModel<UomCategoryDocument>(conn, 'UomCategory', UomCategorySchema, 'uom_categories');
  }

  uomModel(organizationId: string): Model<UomDocument> {
    const conn = this.orgDb.getConnection(organizationId);
    return this.factory.getModel<UomDocument>(conn, 'Uom', UomSchema, 'uoms');
  }
}
