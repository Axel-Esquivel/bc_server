import { Schema, Document } from 'mongoose';

export interface PrepaidProviderDocument extends Document {
  id: string;
  name: string;
  pin?: string;
  isActive: boolean;
  minimumBalance: number;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const PrepaidProviderSchema = new Schema<PrepaidProviderDocument>(
  {
    id: { type: String, required: true, index: true, unique: true },
    name: { type: String, required: true },
    pin: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    minimumBalance: { type: Number, default: 0 },
    OrganizationId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    enterpriseId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);
PrepaidProviderSchema.index({ OrganizationId: 1, enterpriseId: 1, name: 1 }, { unique: true });
