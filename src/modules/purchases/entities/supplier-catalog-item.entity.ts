import { modelOptions, prop } from '@typegoose/typegoose';

export enum SupplierCatalogBonusType {
  NONE = 'none',
  DISCOUNT_PERCENT = 'discount_percent',
  BONUS_QTY = 'bonus_qty',
}

export enum SupplierCatalogStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class SupplierCatalogItem {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  supplierId!: string;

  @prop({ required: true })
  variantId!: string;

  @prop({ required: true })
  unitCost!: number;

  @prop()
  currency?: string;

  @prop()
  freightCost?: number;

  @prop({ enum: SupplierCatalogBonusType, default: SupplierCatalogBonusType.NONE })
  bonusType!: SupplierCatalogBonusType;

  @prop()
  bonusValue?: number;

  @prop()
  minQty?: number;

  @prop()
  leadTimeDays?: number;

  @prop()
  validFrom?: Date;

  @prop()
  validTo?: Date;

  @prop({ enum: SupplierCatalogStatus, default: SupplierCatalogStatus.ACTIVE })
  status!: SupplierCatalogStatus;

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}
