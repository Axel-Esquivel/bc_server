import { Schema, Document } from 'mongoose';

export interface ProductPackagingDocument extends Document {
  id: string;
  variantId: string;
  name: string;
  unitsPerPack: number;
  barcode?: string;
  internalBarcode?: string;
  price: number;
  isActive: boolean;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductPackagingSchema = new Schema<ProductPackagingDocument>(
  {
    id: { type: String, required: true, index: true, unique: true },
    variantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    unitsPerPack: { type: Number, required: true, min: 1 },
    barcode: { type: String },
    internalBarcode: { type: String, index: true, sparse: true, unique: true },
    price: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    OrganizationId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    enterpriseId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);
