import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class SaleLine {
  @prop({ required: true })
  variantId!: string;

  @prop({ required: true })
  quantity!: number;

  @prop({ required: true })
  unitPrice!: number;

  @prop({ default: 0 })
  discountAmount!: number;
}

export interface SaleLineRecord extends SaleLine {
  id: string;
  total: number;
}
