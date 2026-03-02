import { Schema, Document } from 'mongoose';

export interface PackagingNameDocument extends Document {
  id: string;
  organizationId: string;
  name: string;
  multiplier: number;
  nameNormalized?: string;
  isActive: boolean;
  isSystem?: boolean;
  variableMultiplier?: boolean;
  sortOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const PackagingNameSchema = new Schema<PackagingNameDocument>(
  {
    id: { type: String, required: true, index: true, unique: true },
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    multiplier: { type: Number, required: true, min: 1, default: 1 },
    nameNormalized: { type: String, index: true },
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
    variableMultiplier: { type: Boolean, default: false },
    sortOrder: { type: Number },
  },
  { timestamps: true },
);

PackagingNameSchema.index({ organizationId: 1, nameNormalized: 1 }, { unique: true });
