import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { VideoFormat } from '../types/index.js';

export interface IUser extends Document {
  _id: Types.ObjectId;
  telegramId: number;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  preferences: {
    formats: VideoFormat[];
    categories: string[];
    language: string;
  };
  followersCount: number;
  followingCount: number;
  isPrivate: boolean;
  onboardingCompleted: boolean;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 150 },
    avatarUrl: { type: String, default: '' },
    preferences: {
      formats: { type: [String], default: ['reels'] },
      categories: { type: [String], default: [] },
      language: { type: String, default: 'tg' },
    },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    isPrivate: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export const User = mongoose.model<IUser>('User', userSchema);
