import { Schema, Document } from 'mongoose';

export interface ProductVariantDocument extends Document {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcodes: string[];
  internalBarcode?: string;
  minStock: number;
  uomId: string;
  uomCategoryId?: string;
  quantity: number;
  sellable: boolean;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductVariantSchema = new Schema<ProductVariantDocument>(
  {
    id: { type: String, required: true, index: true, unique: true },
    productId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    sku: { type: String, required: true, index: true },
    barcodes: { type: [String], default: [] },
    internalBarcode: { type: String, index: true, sparse: true, unique: true },
    minStock: { type: Number, required: true, default: 0 },
    uomId: { type: String, required: true },
    uomCategoryId: { type: String },
    quantity: { type: Number, required: true, default: 1 },
    sellable: { type: Boolean, default: true },
    OrganizationId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    enterpriseId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);
