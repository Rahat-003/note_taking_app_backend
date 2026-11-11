import { Schema, model } from 'mongoose';
import type { LabelEntity } from './Label';

export type TagEntity = LabelEntity;

const tagSchema = new Schema<TagEntity>(
  {
    name: { type: String, required: true, trim: true, lowercase: true, maxlength: 30 },
  },
  { timestamps: true, versionKey: false, collection: 'tags' },
);

// Unique names, upsert by name when a note is saved, and the tag list sorted by name.
tagSchema.index({ name: 1 }, { unique: true });

export const TagModel = model<TagEntity>('Tag', tagSchema);
