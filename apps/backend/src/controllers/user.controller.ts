import type { Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Follow } from '../models/Follow.js';
import { Like, Save } from '../models/Interaction.js';
import { Video } from '../models/Video.js';
import { serializeUser } from '../services/auth.service.js';
import { enrichVideos } from '../services/feed.service.js';
import { isFallbackMode } from '../store/fallback.js';
import * as fb from '../services/fallback.service.js';
import { resolveCategoryQuery, isFormatQuery, expandCategoryIds } from '../utils/categorySearch.js';
import type { AuthRequest } from '../middleware/auth.js';

const preferencesSchema = z.object({
  formats: z.array(z.enum(['reels', 'igtv', 'stories'])).min(1),
  categories: z.array(z.string()).min(1),
  language: z.string().optional(),
});

const profileUpdateSchema = z.object({
  displayName: z.string().max(64).optional(),
  bio: z.string().max(150).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  username: z.string().min(3).max(32).optional(),
  isPrivate: z.boolean().optional(),
});

const onboardingSchema = z.object({
  username: z.string().min(3).max(32).optional(),
  bio: z.string().max(150).optional(),
  avatarUrl: z.string().optional(),
  formats: z.array(z.enum(['reels', 'igtv', 'stories'])).min(1),
  categories: z.array(z.string()).min(1),
});

export async function updatePreferences(req: AuthRequest, res: Response): Promise<void> {
  const parsed = preferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (isFallbackMode()) {
    const user = fb.fallbackUpdatePreferences(req.user!.userId, parsed.data);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ success: true, updatedAt: new Date(), user });
    return;
  }

  const user = await User.findByIdAndUpdate(
    req.user!.userId,
    {
      $set: {
        'preferences.formats': parsed.data.formats,
        'preferences.categories': parsed.data.categories,
        ...(parsed.data.language ? { 'preferences.language': parsed.data.language } : {}),
        onboardingCompleted: true,
      },
    },
    { new: true },
  );

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ success: true, updatedAt: new Date(), user: serializeUser(user) });
}

export async function completeOnboarding(req: AuthRequest, res: Response): Promise<void> {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (isFallbackMode()) {
    const user = fb.fallbackCompleteOnboarding(req.user!.userId, parsed.data);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ success: true, user });
    return;
  }

  const update: Record<string, unknown> = {
    'preferences.formats': parsed.data.formats,
    'preferences.categories': parsed.data.categories,
    onboardingCompleted: true,
  };

  if (parsed.data.username) update.username = parsed.data.username;
  if (parsed.data.bio !== undefined) update.bio = parsed.data.bio;
  if (parsed.data.avatarUrl !== undefined) update.avatarUrl = parsed.data.avatarUrl;

  const user = await User.findByIdAndUpdate(req.user!.userId, { $set: update }, { new: true });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ success: true, user: serializeUser(user) });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (isFallbackMode()) {
    const user = fb.fallbackGetMe(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
    return;
  }

  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: serializeUser(user) });
}

export async function getUserProfile(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findOne({ username: req.params.username });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const isOwnProfile = req.user!.userId === user._id.toString();
  const isFollowing = await Follow.exists({
    followerId: req.user!.userId,
    followingId: user._id,
  });

  res.json({
    user: serializeUser(user),
    isOwnProfile,
    isFollowing: Boolean(isFollowing),
  });
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (isFallbackMode()) {
    const user = fb.fallbackUpdateProfile(req.user!.userId, parsed.data);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
    return;
  }

  if (parsed.data.username) {
    const existing = await User.findOne({
      username: parsed.data.username,
      _id: { $ne: req.user!.userId },
    });
    if (existing) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }
  }

  const user = await User.findByIdAndUpdate(req.user!.userId, { $set: parsed.data }, { new: true });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user: serializeUser(user) });
}

export async function followUser(req: AuthRequest, res: Response): Promise<void> {
  const targetId = req.params.id;
  if (targetId === req.user!.userId) {
    res.status(400).json({ error: 'Cannot follow yourself' });
    return;
  }

  const target = await User.findById(targetId);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const existing = await Follow.findOne({
    followerId: req.user!.userId,
    followingId: targetId,
  });

  if (existing) {
    res.json({ following: true });
    return;
  }

  await Follow.create({ followerId: req.user!.userId, followingId: targetId });
  await User.findByIdAndUpdate(req.user!.userId, { $inc: { followingCount: 1 } });
  await User.findByIdAndUpdate(targetId, { $inc: { followersCount: 1 } });

  res.json({ following: true });
}

export async function unfollowUser(req: AuthRequest, res: Response): Promise<void> {
  const targetId = req.params.id;
  const removed = await Follow.findOneAndDelete({
    followerId: req.user!.userId,
    followingId: targetId,
  });

  if (removed) {
    await User.findByIdAndUpdate(req.user!.userId, { $inc: { followingCount: -1 } });
    await User.findByIdAndUpdate(targetId, { $inc: { followersCount: -1 } });
  }

  res.json({ following: false });
}

export async function getUserVideos(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findOne({ username: req.params.username });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const liked = await Like.find({ userId: user._id }).populate('videoId').limit(30).lean();
  const saved = await Save.find({ userId: user._id }).populate('videoId').limit(30).lean();

  res.json({
    liked: liked.map((l) => l.videoId).filter(Boolean),
    saved: saved.map((s) => s.videoId).filter(Boolean),
    videos: [],
  });
}

export async function searchUsers(req: AuthRequest, res: Response): Promise<void> {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) {
    res.json({ users: [] });
    return;
  }

  if (isFallbackMode()) {
    res.json({ users: fb.fallbackSearchUsers(q) });
    return;
  }

  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { displayName: { $regex: q, $options: 'i' } },
    ],
  })
    .limit(20)
    .lean();

  res.json({
    users: users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      followersCount: u.followersCount,
    })),
  });
}

export async function searchVideos(req: AuthRequest, res: Response): Promise<void> {
  const q = (req.query.q as string | undefined)?.trim() ?? '';
  const categoryParam = (req.query.category as string | undefined)?.trim();

  if (!q && !categoryParam) {
    res.json({ videos: [] });
    return;
  }

  if (isFallbackMode()) {
    res.json({
      videos: fb.fallbackSearchVideos(q || categoryParam || '', req.user!.userId, categoryParam),
    });
    return;
  }

  const MP4_FILTER = { $not: { $regex: /youtube\.com\/embed|youtu\.be/i } };
  const baseFilter = { format: 'reels', url: MP4_FILTER };

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const categoryId = categoryParam
    ? resolveCategoryQuery(categoryParam) ?? categoryParam
    : resolveCategoryQuery(q);
  const formatFilter = q && isFormatQuery(q) ? q.toLowerCase() : null;

  const textFilter = q
    ? {
        $or: [
          { title: { $regex: escaped, $options: 'i' } },
          { caption: { $regex: escaped, $options: 'i' } },
          { hashtags: { $regex: escaped, $options: 'i' } },
          { category: { $regex: escaped, $options: 'i' } },
          { authorName: { $regex: escaped, $options: 'i' } },
          { musicTitle: { $regex: escaped, $options: 'i' } },
        ],
      }
    : null;

  const qIsCategoryOnly = Boolean(categoryId && (!q || q.toLowerCase() === categoryId || resolveCategoryQuery(q) === categoryId));

  let filter: Record<string, unknown>;
  if (categoryId) {
    const cats = expandCategoryIds([categoryId]);
    const catFilter = { category: { $in: cats } };
    if (textFilter && !qIsCategoryOnly) {
      filter = { $and: [baseFilter, catFilter, textFilter] };
    } else {
      filter = { $and: [baseFilter, catFilter] };
    }
  } else if (formatFilter) {
    filter = { ...baseFilter, format: formatFilter };
  } else if (textFilter) {
    filter = { $and: [baseFilter, textFilter] };
  } else {
    res.json({ videos: [] });
    return;
  }

  const videos = await Video.find(filter).sort({ _id: -1 }).limit(48).lean();

  const enriched = await enrichVideos(videos as unknown as import('../models/Video.js').IVideo[], req.user!.userId);
  res.json({ videos: enriched });
}
