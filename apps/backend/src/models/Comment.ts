import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IComment extends Document {
  _id: Types.ObjectId;
  videoId: Types.ObjectId;
  userId: Types.ObjectId;
  text: string;
  likes: number;
  parentId: Types.ObjectId | null;
  createdAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 500 },
    likes: { type: Number, default: 0 },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
