import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ILike extends Document {
  userId: Types.ObjectId;
  videoId: Types.ObjectId;
  createdAt: Date;
}

const likeSchema = new Schema<ILike>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

likeSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export const Like = mongoose.model<ILike>('Like', likeSchema);

export interface ISave extends Document {
  userId: Types.ObjectId;
  videoId: Types.ObjectId;
  createdAt: Date;
}

const saveSchema = new Schema<ISave>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

saveSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export const Save = mongoose.model<ISave>('Save', saveSchema);

export interface IView extends Document {
  userId: Types.ObjectId;
  videoId: Types.ObjectId;
  createdAt: Date;
}

const viewSchema = new Schema<IView>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

viewSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export const View = mongoose.model<IView>('View', viewSchema);

export interface ICommentLike extends Document {
  userId: Types.ObjectId;
  commentId: Types.ObjectId;
}

const commentLikeSchema = new Schema<ICommentLike>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', required: true },
  },
  { timestamps: true },
);

commentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });

export const CommentLike = mongoose.model<ICommentLike>('CommentLike', commentLikeSchema);
