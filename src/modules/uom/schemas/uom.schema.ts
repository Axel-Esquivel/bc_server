import { Schema, Document } from 'mongoose';

export interface UomDocument extends Document {
  id: string;
  name: string;
  nameNormalized?: string;
  symbol: string;
  symbolNormalized?: string;
  categoryId: string;
  factor: number;
  isBase: boolean;
  organizationId: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const UomSchema = new Schema<UomDocument>(
  {
    id: { type: String, required: true, index: true, unique: true },
    name: { type: String, required: true },
    nameNormalized: { type: String, index: true },
    symbol: { type: String, required: true },
    symbolNormalized: { type: String, index: true },
    categoryId: { type: String, required: true, index: true },
    factor: { type: Number, required: true },
    isBase: { type: Boolean, default: false },
    organizationId: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

UomSchema.index({ organizationId: 1, categoryId: 1, symbolNormalized: 1 }, { unique: true });
