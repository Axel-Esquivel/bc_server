import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false })
class UserOrganizationMembership {
  @Prop({ required: true })
  OrganizationId: string;

  @Prop({ type: [String], default: [] })
  roles: string[];
}

const UserOrganizationMembershipSchema = SchemaFactory.createForClass(UserOrganizationMembership);

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: [UserOrganizationMembershipSchema], default: [] })
  Organizations: UserOrganizationMembership[];

  @Prop({ type: [String], default: [] })
  devices: string[];

  @Prop()
  defaultOrganizationId?: string;

  @Prop()
  defaultCompanyId?: string;

  @Prop()
  defaultEnterpriseId?: string;

  @Prop()
  defaultCurrencyId?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
