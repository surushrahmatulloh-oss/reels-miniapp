import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { VideoFormat } from '../types/index.js';

export interface IVideo extends Document {
  _id: Types.ObjectId;
  instagramId: string;
  url: string;
  thumbnailUrl: string;
  format: VideoFormat;
  category: string;
  hashtags: string[];
  caption: string;
  authorName: string;
  authorAvatar: string;
  musicTitle: string;
  likes: number;
  views: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  createdAt: Date;
}

const videoSchema = new Schema<IVideo>(
  {
    instagramId: { type: String, required: true, unique: true, index: true },
    url: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    format: {
      type: String,
      enum: ['reels', 'igtv', 'stories'],
      default: 'reels',
      index: true,
    },
    category: { type: String, required: true, index: true },
    hashtags: { type: [String], default: [] },
    caption: { type: String, default: '' },
    authorName: { type: String, default: 'Creator' },
    authorAvatar: { type: String, default: '' },
    musicTitle: { type: String, default: '' },
    likes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    savesCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

videoSchema.index({ category: 1, format: 1, createdAt: -1 });
videoSchema.index({ likes: -1, views: -1 });

export const Video = mongoose.model<IVideo>('Video', videoSchema);
