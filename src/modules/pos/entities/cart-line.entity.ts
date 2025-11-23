import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class CartLine {
  @prop({ required: true })
  variantId!: string;

  @prop({ required: true })
  quantity!: number;

  @prop({ required: true })
  unitPrice!: number;

  @prop({ default: 0 })
  discountAmount!: number;

  @prop()
  locationId?: string;

  @prop()
  batchId?: string;
}

export interface CartLineRecord extends CartLine {
  id: string;
  total: number;
  reservedOperationId: string;
}
