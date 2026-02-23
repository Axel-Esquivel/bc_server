import { Schema, Document } from 'mongoose';

export interface PrepaidDepositDocument extends Document {
  id: string;
  providerId: string;
  depositAmount: number;
  creditedAmount: number;
  margin: number;
  reference?: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const PrepaidDepositSchema = new Schema<PrepaidDepositDocument>(
  {
    id: { type: String, required: true, index: true, unique: true },
    providerId: { type: String, required: true, index: true },
    depositAmount: { type: Number, required: true },
    creditedAmount: { type: Number, required: true },
    margin: { type: Number, required: true },
    reference: { type: String },
    OrganizationId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    enterpriseId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);
PrepaidDepositSchema.index({ OrganizationId: 1, enterpriseId: 1, providerId: 1, createdAt: -1 });
