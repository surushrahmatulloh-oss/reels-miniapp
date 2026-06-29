import type { Response } from 'express';
import mongoose from 'mongoose';
import type { VideoFormat } from '../types/index.js';
import { buildFeed, enrichVideos, markVideoViewed } from '../services/feed.service.js';
import { User } from '../models/User.js';
import { isFallbackMode } from '../store/fallback.js';
import * as fb from '../services/fallback.service.js';
import type { AuthRequest } from '../middleware/auth.js';
import { getParam } from '../utils/params.js';

export async function getFeed(req: AuthRequest, res: Response): Promise<void> {
  const cursor = req.query.cursor as string | undefined;
  const limit = Number(req.query.limit ?? 10);
  const excludeIdsRaw = req.query.excludeIds as string | undefined;
  const excludeIds = excludeIdsRaw
    ? excludeIdsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  if (isFallbackMode()) {
    res.json(fb.fallbackGetFeed(req.user!.userId, limit, cursor));
    return;
  }

  const format = (req.query.format as VideoFormat | undefined) ?? 'reels';

  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const feed = await buildFeed({
    userId: req.user!.userId,
    categories: user.preferences.categories,
    format,
    cursor,
    limit,
    excludeIds,
  });

  const videos = await enrichVideos(feed.videos, req.user!.userId);

  res.json({
    videos,
    nextCursor: feed.nextCursor,
    hasMore: feed.hasMore,
  });
}

export async function markViewed(req: AuthRequest, res: Response): Promise<void> {
  const videoId = getParam(req, 'id');
  if (!videoId) {
    res.status(400).json({ error: 'Video id is required' });
    return;
  }

  if (isFallbackMode()) {
    fb.fallbackMarkViewed(req.user!.userId, videoId);
    res.json({ success: true });
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    res.status(400).json({ error: 'Invalid video id' });
    return;
  }
  await markVideoViewed(req.user!.userId, new mongoose.Types.ObjectId(videoId));
  res.json({ success: true });
}
