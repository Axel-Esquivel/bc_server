import { modelOptions, prop } from '@typegoose/typegoose';

export enum LocationType {
  PICKING = 'PICKING',
  BULK = 'BULK',
  RECEIVING = 'RECEIVING',
  SHIPPING = 'SHIPPING',
  RETURN = 'RETURN',
  QUARANTINE = 'QUARANTINE',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class Location {
  @prop({ required: true, index: true })
  warehouseId!: string;

  @prop({ required: true, unique: true })
  code!: string;

  @prop({ required: true, enum: LocationType, default: LocationType.PICKING })
  type!: LocationType;

  @prop({ default: 0 })
  capacity?: number;

  @prop({ type: () => [String], default: [] })
  restrictions?: string[];

  @prop({ required: true, index: true })
  OrganizationId!: string;

  @prop({ required: true, index: true })
  companyId!: string;
}

// Future: Batch/lot tracking entity would live here alongside Location and Warehouse.
