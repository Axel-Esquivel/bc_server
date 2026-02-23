import { Schema, Document } from 'mongoose';

export interface PrepaidConsumptionDocument extends Document {
  id: string;
  providerId: string;
  amount: number;
  saleId?: string;
  saleLineId?: string;
  variantId?: string;
  denomination?: number;
  quantity?: number;
  phoneNumber?: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const PrepaidConsumptionSchema = new Schema<PrepaidConsumptionDocument>(
  {
    id: { type: String, required: true, index: true, unique: true },
    providerId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    saleId: { type: String, index: true },
    saleLineId: { type: String, index: true },
    variantId: { type: String, index: true },
    denomination: { type: Number },
    quantity: { type: Number },
    phoneNumber: { type: String },
    OrganizationId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    enterpriseId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);
PrepaidConsumptionSchema.index({ OrganizationId: 1, enterpriseId: 1, providerId: 1, createdAt: -1 });
