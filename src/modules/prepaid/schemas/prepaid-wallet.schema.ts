import { Schema, Document } from 'mongoose';

export interface PrepaidWalletDocument extends Document {
  id: string;
  providerId: string;
  balance: number;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const PrepaidWalletSchema = new Schema<PrepaidWalletDocument>(
  {
    id: { type: String, required: true, index: true, unique: true },
    providerId: { type: String, required: true, index: true },
    balance: { type: Number, required: true, default: 0 },
    OrganizationId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    enterpriseId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);
PrepaidWalletSchema.index(
  { OrganizationId: 1, enterpriseId: 1, providerId: 1 },
  { unique: true },
);
