import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type LocationDocument = Location & Document;

export enum LocationType {
  INTERNAL = 'internal',
  SUPPLIER = 'supplier',
  CUSTOMER = 'customer',
  INVENTORY_LOSS = 'inventory_loss',
  TRANSIT = 'transit',
  PRODUCTION = 'production',
}

export enum LocationUsage {
  STORAGE = 'storage',
  PICKING = 'picking',
  RECEIVING = 'receiving',
  SHIPPING = 'shipping',
  SCRAP = 'scrap',
  TRANSIT = 'transit',
  VIRTUAL = 'virtual',
}

@Schema({ collection: 'warehouse_locations', timestamps: true })
export class Location {
  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  enterpriseId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  warehouseId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  parentLocationId!: MongooseSchema.Types.ObjectId | null;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  code!: string;

  @Prop({ required: true })
  level!: number;

  @Prop({ required: true })
  path!: string;

  @Prop({ required: true, enum: LocationType })
  type!: LocationType;

  @Prop({ required: true, enum: LocationUsage })
  usage!: LocationUsage;

  @Prop({ default: true })
  active!: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
LocationSchema.index({ warehouseId: 1, path: 1 });
LocationSchema.index(
  { organizationId: 1, enterpriseId: 1, warehouseId: 1, code: 1 },
  { unique: true },
);
