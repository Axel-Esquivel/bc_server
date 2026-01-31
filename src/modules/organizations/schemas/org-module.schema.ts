import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { OrganizationModuleStatus } from '../types/module-state.types';

export type OrgModuleDocument = OrgModule & Document;

@Schema({ collection: 'org_modules', timestamps: true })
export class OrgModule {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true, enum: OrganizationModuleStatus })
  status: OrganizationModuleStatus;

  @Prop()
  version?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  config?: Record<string, unknown>;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const OrgModuleSchema = SchemaFactory.createForClass(OrgModule);
OrgModuleSchema.index({ organizationId: 1, key: 1 }, { unique: true });
