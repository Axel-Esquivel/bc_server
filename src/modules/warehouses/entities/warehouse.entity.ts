import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WarehouseDocument = Warehouse & Document;

export enum WarehouseType {
  STORE = 'STORE',
  WAREHOUSE = 'WAREHOUSE',
  TRANSIT = 'TRANSIT',
  VIRTUAL = 'VIRTUAL',
}

@Schema({ collection: 'warehouses', timestamps: true })
export class Warehouse {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  code!: string;

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  enterpriseId!: string;

  @Prop({ default: true })
  active!: boolean;

  @Prop({ required: true, enum: WarehouseType, default: WarehouseType.WAREHOUSE })
  type!: WarehouseType;

  @Prop({ default: false })
  allowNegativeStock!: boolean;

  @Prop({ default: true })
  allowCountingLock!: boolean;

  @Prop({ index: true })
  companyId?: string;

  @Prop({ index: true })
  branchId?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);
WarehouseSchema.index({ organizationId: 1, enterpriseId: 1, code: 1 }, { unique: true });
WarehouseSchema.index({ organizationId: 1, enterpriseId: 1, active: 1 });
