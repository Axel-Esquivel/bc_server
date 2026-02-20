import { Schema, Document } from 'mongoose';

export interface ProductDocument extends Document {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  isActive: boolean;
  category?: string;
  purchasable: boolean;
  sellable: boolean;
  trackInventory: boolean;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductSchema = new Schema<ProductDocument>(
  {
    id: { type: String, required: true, index: true, unique: true },
    name: { type: String, required: true },
    sku: { type: String },
    barcode: { type: String },
    price: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, required: true, default: true },
    category: { type: String },
    purchasable: { type: Boolean, default: false },
    sellable: { type: Boolean, default: true },
    trackInventory: { type: Boolean, default: false },
    OrganizationId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    enterpriseId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);
