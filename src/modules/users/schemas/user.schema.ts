import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false })
class UserWorkspaceMembership {
  @Prop({ required: true })
  workspaceId: string;

  @Prop({ type: [String], default: [] })
  roles: string[];
}

const UserWorkspaceMembershipSchema = SchemaFactory.createForClass(UserWorkspaceMembership);

@Schema({ _id: false })
class UserOrganizationMembership {
  @Prop({ required: true })
  organizationId: string;

  @Prop({ required: true })
  role: 'owner' | 'member';

  @Prop({ required: true })
  status: 'active' | 'pending' | 'rejected';
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

  @Prop({ type: [UserWorkspaceMembershipSchema], default: [] })
  workspaces: UserWorkspaceMembership[];

  @Prop({ type: [UserOrganizationMembershipSchema], default: [] })
  organizations: UserOrganizationMembership[];

  @Prop({ type: [String], default: [] })
  devices: string[];

  @Prop()
  defaultWorkspaceId?: string;

  @Prop()
  defaultOrganizationId?: string;

  @Prop()
  defaultCompanyId?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
