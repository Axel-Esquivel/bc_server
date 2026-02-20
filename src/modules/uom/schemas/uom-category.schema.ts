import { Schema, Document } from 'mongoose';

export interface UomCategoryDocument extends Document {
  id: string;
  name: string;
  nameNormalized?: string;
  organizationId: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const UomCategorySchema = new Schema<UomCategoryDocument>(
  {
    id: { type: String, required: true, index: true, unique: true },
    name: { type: String, required: true },
    nameNormalized: { type: String, index: true },
    organizationId: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

UomCategorySchema.index({ organizationId: 1, nameNormalized: 1 }, { unique: true });
