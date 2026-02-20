import { Schema, Document } from 'mongoose';

export interface PackagingNameDocument extends Document {
  id: string;
  organizationId: string;
  name: string;
  nameNormalized?: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const PackagingNameSchema = new Schema<PackagingNameDocument>(
  {
    id: { type: String, required: true, index: true, unique: true },
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    nameNormalized: { type: String, index: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number },
  },
  { timestamps: true },
);

PackagingNameSchema.index({ organizationId: 1, nameNormalized: 1 }, { unique: true });
