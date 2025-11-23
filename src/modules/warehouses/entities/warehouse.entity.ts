import { modelOptions, prop } from '@typegoose/typegoose';

export enum WarehouseType {
  STORE = 'STORE',
  WAREHOUSE = 'WAREHOUSE',
  TRANSIT = 'TRANSIT',
  VIRTUAL = 'VIRTUAL',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class Warehouse {
  @prop({ required: true })
  name!: string;

  @prop({ required: true, unique: true })
  code!: string;

  @prop({ required: true, enum: WarehouseType, default: WarehouseType.WAREHOUSE })
  type!: WarehouseType;

  @prop({ default: false })
  allowNegativeStock!: boolean;

  @prop({ default: true })
  allowCountingLock!: boolean;

  @prop({ required: true, index: true })
  workspaceId!: string;

  @prop({ required: true, index: true })
  companyId!: string;
}
