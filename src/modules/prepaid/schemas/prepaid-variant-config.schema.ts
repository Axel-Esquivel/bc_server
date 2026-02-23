import { Schema, Document } from 'mongoose';

export interface PrepaidVariantConfigDocument extends Document {
  id: string;
  variantId: string;
  providerId: string;
  denomination: number;
  isActive: boolean;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const PrepaidVariantConfigSchema = new Schema<PrepaidVariantConfigDocument>(
  {
    id: { type: String, required: true, index: true, unique: true },
    variantId: { type: String, required: true, index: true },
    providerId: { type: String, required: true, index: true },
    denomination: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    OrganizationId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    enterpriseId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);
PrepaidVariantConfigSchema.index(
  { OrganizationId: 1, enterpriseId: 1, variantId: 1 },
  { unique: true },
);
