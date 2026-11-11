import { Schema, model } from 'mongoose';
import type { LabelEntity } from './Label';

export type CategoryEntity = LabelEntity;

const categorySchema = new Schema<CategoryEntity>(
  {
    name: { type: String, required: true, trim: true, lowercase: true, maxlength: 50 },
  },
  { timestamps: true, versionKey: false, collection: 'categories' },
);

// Unique names, upsert by name, and the category list sorted by name.
categorySchema.index({ name: 1 }, { unique: true });

export const CategoryModel = model<CategoryEntity>('Category', categorySchema);
