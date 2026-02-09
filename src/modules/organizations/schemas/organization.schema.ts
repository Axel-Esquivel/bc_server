import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { OrganizationMemberStatus } from '../entities/organization.entity';

export type OrganizationDocument = Organization & Document;

@Schema({ _id: false })
class OrganizationMember {
  @Prop({ required: true })
  userId: string;

  @Prop()
  email?: string;

  @Prop({ required: true })
  roleKey: string;

  @Prop({ required: true, enum: OrganizationMemberStatus })
  status: OrganizationMemberStatus;

  @Prop()
  invitedBy?: string;

  @Prop()
  requestedBy?: string;

  @Prop()
  invitedAt?: Date;

  @Prop()
  requestedAt?: Date;

  @Prop()
  activatedAt?: Date;

  @Prop({ required: true })
  createdAt: Date;
}

const OrganizationMemberSchema = SchemaFactory.createForClass(OrganizationMember);

@Schema({ _id: false })
class OrganizationRoleDefinition {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: false })
  isSystem?: boolean;
}

const OrganizationRoleDefinitionSchema = SchemaFactory.createForClass(OrganizationRoleDefinition);

@Schema({ collection: 'organizations', timestamps: true })
export class Organization {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ required: true, index: true })
  ownerUserId: string;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true, enum: ['pending', 'completed'], default: 'pending' })
  setupStatus: 'pending' | 'completed';

  @Prop({ type: [String], default: [] })
  countryIds: string[];

  @Prop({ type: [String], default: [] })
  currencyIds: string[];

  @Prop({ type: [OrganizationMemberSchema], default: [] })
  members: OrganizationMember[];

  @Prop({ type: [OrganizationRoleDefinitionSchema], default: [] })
  roles: OrganizationRoleDefinition[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  coreSettings: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, default: undefined })
  structureSettings?: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  moduleStates: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  moduleSettings: Record<string, unknown>;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
OrganizationSchema.index({ 'members.userId': 1 });
