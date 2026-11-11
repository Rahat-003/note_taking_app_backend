import type { Types } from 'mongoose';

/** A category or tag document: a unique, lowercase name. */
export interface LabelEntity {
  _id: Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A category or tag as embedded in other responses. */
export interface LabelSummary {
  _id: Types.ObjectId;
  name: string;
}

/** A category or tag of one user, with how many of their notes carry it (user_categories / user_tags). */
export interface UserLabel {
  _id: Types.ObjectId;
  name: string;
  noteCount: number;
}
