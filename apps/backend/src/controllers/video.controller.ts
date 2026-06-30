import type { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Video } from '../models/Video.js';
import { Comment } from '../models/Comment.js';
import { Like, Save, CommentLike } from '../models/Interaction.js';
import { User } from '../models/User.js';
import { isFallbackMode } from '../store/fallback.js';
import * as fb from '../services/fallback.service.js';
import type { AuthRequest } from '../middleware/auth.js';
import { getParam } from '../utils/params.js';
import type { Server } from 'socket.io';

let io: Server | null = null;

export function setVideoSocket(server: Server): void {
  io = server;
}

const commentSchema = z.object({
  text: z.string().min(1).max(500),
  parentId: z.string().optional(),
});

export async function likeVideo(req: AuthRequest, res: Response): Promise<void> {
  const videoId = getParam(req, 'id');
  if (!videoId) {
    res.status(400).json({ error: 'Video id is required' });
    return;
  }

  if (isFallbackMode()) {
    const result = fb.fallbackLike(req.user!.userId, videoId);
    if (!result) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    io?.emit('like_update', { videoId, likeCount: result.likeCount });
    res.json(result);
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    res.status(400).json({ error: 'Invalid video id' });
    return;
  }

  const existing = await Like.findOne({ userId: req.user!.userId, videoId });
  if (existing) {
    const video = await Video.findById(videoId).select('likes').lean();
    res.json({ liked: true, likeCount: video?.likes ?? 0 });
    return;
  }

  await Like.create({ userId: req.user!.userId, videoId });
  const video = await Video.findByIdAndUpdate(videoId, { $inc: { likes: 1 } }, { new: true });

  if (video) {
    io?.emit('like_update', { videoId, likeCount: video.likes });
  }

  res.json({ liked: true, likeCount: video?.likes ?? 0 });
}

export async function unlikeVideo(req: AuthRequest, res: Response): Promise<void> {
  const videoId = getParam(req, 'id');
  if (!videoId) {
    res.status(400).json({ error: 'Video id is required' });
    return;
  }

  if (isFallbackMode()) {
    const result = fb.fallbackUnlike(req.user!.userId, videoId);
    if (result) io?.emit('like_update', { videoId, likeCount: result.likeCount });
    res.json(result ?? { liked: false });
    return;
  }

  const removed = await Like.findOneAndDelete({ userId: req.user!.userId, videoId });
  if (removed) {
    const video = await Video.findByIdAndUpdate(videoId, { $inc: { likes: -1 } }, { new: true });
    if (video) {
      io?.emit('like_update', { videoId, likeCount: video.likes });
    }
    res.json({ liked: false, likeCount: video?.likes ?? 0 });
    return;
  }
  const video = await Video.findById(videoId).select('likes').lean();
  res.json({ liked: false, likeCount: video?.likes ?? 0 });
}

export async function saveVideo(req: AuthRequest, res: Response): Promise<void> {
  const videoId = getParam(req, 'id');
  if (!videoId) {
    res.status(400).json({ error: 'Video id is required' });
    return;
  }
  if (isFallbackMode()) {
    res.json(fb.fallbackSave(req.user!.userId, videoId));
    return;
  }
  const existing = await Save.findOne({ userId: req.user!.userId, videoId });
  if (!existing) {
    await Save.create({ userId: req.user!.userId, videoId });
    await Video.findByIdAndUpdate(videoId, { $inc: { savesCount: 1 } });
  }
  res.json({ saved: true });
}

export async function unsaveVideo(req: AuthRequest, res: Response): Promise<void> {
  const videoId = getParam(req, 'id');
  if (!videoId) {
    res.status(400).json({ error: 'Video id is required' });
    return;
  }
  if (isFallbackMode()) {
    res.json(fb.fallbackUnsave(req.user!.userId, videoId));
    return;
  }
  const removed = await Save.findOneAndDelete({ userId: req.user!.userId, videoId });
  if (removed) {
    await Video.findByIdAndUpdate(videoId, { $inc: { savesCount: -1 } });
  }
  res.json({ saved: false });
}

export async function shareVideo(req: AuthRequest, res: Response): Promise<void> {
  const videoId = getParam(req, 'id');
  if (!videoId) {
    res.status(400).json({ error: 'Video id is required' });
    return;
  }

  if (isFallbackMode()) {
    const result = fb.fallbackShare(videoId);
    if (!result) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    res.json({ success: true, ...result });
    return;
  }

  const video = await Video.findByIdAndUpdate(videoId, { $inc: { sharesCount: 1 } }, { new: true });
  if (!video) {
    res.status(404).json({ error: 'Video not found' });
    return;
  }

  const shareUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/video/${videoId}`;
  res.json({ success: true, shareUrl, sharesCount: video.sharesCount });
}

export async function getComments(req: AuthRequest, res: Response): Promise<void> {
  const videoId = getParam(req, 'id');
  if (!videoId) {
    res.status(400).json({ error: 'Video id is required' });
    return;
  }

  if (isFallbackMode()) {
    res.json({ comments: fb.fallbackGetComments(videoId) });
    return;
  }

  const comments = await Comment.find({ videoId, parentId: null })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const commentIds = comments.map((c) => c._id);
  const replies = await Comment.find({ videoId, parentId: { $in: commentIds } })
    .sort({ createdAt: 1 })
    .lean();

  const userIds = [
    ...new Set([
      ...comments.map((c) => c.userId.toString()),
      ...replies.map((c) => c.userId.toString()),
    ]),
  ];
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const likedComments = await CommentLike.find({
    userId: req.user!.userId,
    commentId: { $in: [...commentIds, ...replies.map((r) => r._id)] },
  }).lean();
  const likedSet = new Set(likedComments.map((l) => l.commentId.toString()));

  const mapComment = (c: (typeof comments)[0]) => {
    const user = userMap.get(c.userId.toString());
    return {
      id: c._id.toString(),
      text: c.text,
      likes: c.likes,
      createdAt: c.createdAt,
      parentId: c.parentId?.toString() ?? null,
      isLiked: likedSet.has(c._id.toString()),
      user: user
        ? {
            id: user._id.toString(),
            username: user.username,
            avatarUrl: user.avatarUrl,
            displayName: user.displayName,
          }
        : null,
    };
  };

  const repliesByParent = new Map<string, ReturnType<typeof mapComment>[]>();
  for (const r of replies) {
    const pid = r.parentId?.toString() ?? '';
    const list = repliesByParent.get(pid) ?? [];
    list.push(mapComment(r));
    repliesByParent.set(pid, list);
  }

  res.json({
    comments: comments.map((c) => ({
      ...mapComment(c),
      replies: repliesByParent.get(c._id.toString()) ?? [],
    })),
  });
}

export async function addComment(req: AuthRequest, res: Response): Promise<void> {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const videoId = getParam(req, 'id');
  if (!videoId) {
    res.status(400).json({ error: 'Video id is required' });
    return;
  }

  if (isFallbackMode()) {
    const comment = fb.fallbackAddComment(req.user!.userId, videoId, parsed.data.text);
    if (!comment) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    io?.emit('new_comment', { videoId, comment });
    res.status(201).json({ comment });
    return;
  }

  const video = await Video.findById(videoId);
  if (!video) {
    res.status(404).json({ error: 'Video not found' });
    return;
  }

  const comment = await Comment.create({
    videoId,
    userId: req.user!.userId,
    text: parsed.data.text,
    parentId: parsed.data.parentId
      ? new mongoose.Types.ObjectId(parsed.data.parentId)
      : null,
  });

  await Video.findByIdAndUpdate(videoId, { $inc: { commentsCount: 1 } });

  const user = await User.findById(req.user!.userId);
  const payload = {
    id: comment._id.toString(),
    videoId,
    text: comment.text,
    likes: 0,
    createdAt: comment.createdAt,
    parentId: comment.parentId?.toString() ?? null,
    isLiked: false,
    user: user
      ? {
          id: user._id.toString(),
          username: user.username,
          avatarUrl: user.avatarUrl,
          displayName: user.displayName,
        }
      : null,
  };

  io?.emit('new_comment', { videoId, comment: payload });
  res.status(201).json({ comment: payload });
}

export async function likeComment(req: AuthRequest, res: Response): Promise<void> {
  const commentId = getParam(req, 'commentId');
  if (!commentId) {
    res.status(400).json({ error: 'Comment id is required' });
    return;
  }
  const existing = await CommentLike.findOne({ userId: req.user!.userId, commentId });
  if (existing) {
    res.json({ liked: true });
    return;
  }

  await CommentLike.create({ userId: req.user!.userId, commentId });
  const comment = await Comment.findByIdAndUpdate(commentId, { $inc: { likes: 1 } }, { new: true });
  res.json({ liked: true, likes: comment?.likes ?? 0 });
}

export async function getSavedVideos(req: AuthRequest, res: Response): Promise<void> {
  if (isFallbackMode()) {
    res.json({ videos: fb.fallbackGetSaved(req.user!.userId) });
    return;
  }

  const saves = await Save.find({ userId: req.user!.userId })
    .sort({ createdAt: -1 })
    .populate('videoId')
    .limit(50)
    .lean();

  res.json({
    videos: saves
      .map((s) => s.videoId)
      .filter(Boolean)
      .map((v) => {
        const video = v as unknown as {
          _id: { toString(): string };
          thumbnailUrl: string;
          url: string;
          caption: string;
          likes: number;
        };
        return {
          id: video._id.toString(),
          thumbnailUrl: video.thumbnailUrl,
          url: video.url,
          caption: video.caption,
          likes: video.likes,
        };
      }),
  });
}

export async function getLikedVideos(req: AuthRequest, res: Response): Promise<void> {
  if (isFallbackMode()) {
    res.json({ videos: fb.fallbackGetLiked(req.user!.userId) });
    return;
  }

  const likes = await Like.find({ userId: req.user!.userId })
    .sort({ createdAt: -1 })
    .populate('videoId')
    .limit(50)
    .lean();

  res.json({
    videos: likes
      .map((l) => l.videoId)
      .filter(Boolean)
      .map((v) => {
        const video = v as unknown as {
          _id: { toString(): string };
          thumbnailUrl: string;
          url: string;
          caption: string;
          likes: number;
        };
        return {
          id: video._id.toString(),
          thumbnailUrl: video.thumbnailUrl,
          url: video.url,
          caption: video.caption,
          likes: video.likes,
        };
      }),
  });
}
