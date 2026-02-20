import { Schema, Document } from 'mongoose';

export interface ProductCategoryDocument extends Document {
  id: string;
  name: string;
  nameNormalized?: string;
  parentId?: string;
  organizationId: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductCategorySchema = new Schema<ProductCategoryDocument>(
  {
    id: { type: String, required: true, index: true, unique: true },
    name: { type: String, required: true },
    nameNormalized: { type: String, index: true },
    parentId: { type: String },
    organizationId: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ProductCategorySchema.index({ organizationId: 1, parentId: 1, nameNormalized: 1 }, { unique: true });
