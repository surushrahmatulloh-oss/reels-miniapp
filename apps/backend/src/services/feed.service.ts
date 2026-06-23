import type { Types } from 'mongoose';
import { Video, type IVideo } from '../models/Video.js';
import { View } from '../models/Interaction.js';
import { Like, Save } from '../models/Interaction.js';
import { cacheGet, cacheSet } from '../redis.js';
import type { VideoFormat } from '../types/index.js';

const CATEGORIES = [
  'music',
  'sport',
  'nature',
  'food',
  'travel',
  'fashion',
  'technology',
  'animation',
  'entertainment',
  'education',
  'business',
  'science',
];

export { CATEGORIES };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

async function getSeenVideoIds(userId: string): Promise<Set<string>> {
  const views = await View.find({ userId }).select('videoId').lean();
  return new Set(views.map((v) => v.videoId.toString()));
}

export async function buildFeed(params: {
  userId: string;
  categories: string[];
  format?: VideoFormat;
  cursor?: string;
  limit?: number;
}): Promise<{ videos: IVideo[]; nextCursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? 10, 20);
  const format = params.format ?? 'reels';
  const cacheKey = `feed:${params.userId}:${format}:${params.cursor ?? 'start'}:${limit}`;
  const cached = await cacheGet<{ videos: IVideo[]; nextCursor: string | null; hasMore: boolean }>(
    cacheKey,
  );
  if (cached) return cached;

  const seenIds = await getSeenVideoIds(params.userId);
  const preferredCategories =
    params.categories.length > 0 ? params.categories : CATEGORIES.slice(0, 3);

  const preferredLimit = Math.ceil(limit * 0.7);
  const trendingLimit = Math.ceil(limit * 0.2);
  const discoveryLimit = limit - preferredLimit - trendingLimit;

  const baseFilter = {
    format,
    _id: { $nin: [...seenIds].map((id) => id) },
  };

  const [preferred, trending, discovery] = await Promise.all([
    Video.find({ ...baseFilter, category: { $in: preferredCategories } })
      .sort({ createdAt: -1 })
      .limit(preferredLimit * 2)
      .lean(),
    Video.find(baseFilter)
      .sort({ likes: -1, views: -1 })
      .limit(trendingLimit * 2)
      .lean(),
    Video.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(discoveryLimit * 2)
      .lean(),
  ]);

  const merged = shuffle([
    ...preferred.slice(0, preferredLimit),
    ...trending.slice(0, trendingLimit),
    ...discovery.slice(0, discoveryLimit),
  ]);

  const uniqueMap = new Map<string, (typeof merged)[0]>();
  for (const video of merged) {
    uniqueMap.set(video._id.toString(), video);
  }
  let videos = [...uniqueMap.values()].slice(0, limit);

  if (params.cursor) {
    const cursorIndex = videos.findIndex((v) => v._id.toString() === params.cursor);
    if (cursorIndex >= 0) {
      videos = videos.slice(cursorIndex + 1);
    }
  }

  videos = videos.slice(0, limit);

  const nextCursor =
    videos.length > 0 ? videos[videos.length - 1]!._id.toString() : null;
  const totalRemaining = await Video.countDocuments({
    format,
    _id: { $nin: [...seenIds, ...videos.map((v) => v._id)] },
  });

  const result = {
    videos: videos as unknown as IVideo[],
    nextCursor,
    hasMore: totalRemaining > 0,
  };

  await cacheSet(cacheKey, result, 60);
  return result;
}

export async function enrichVideos(
  videos: IVideo[],
  userId: string,
): Promise<Record<string, unknown>[]> {
  const videoIds = videos.map((v) => v._id);

  const [likes, saves] = await Promise.all([
    Like.find({ userId, videoId: { $in: videoIds } }).lean(),
    Save.find({ userId, videoId: { $in: videoIds } }).lean(),
  ]);

  const likedSet = new Set(likes.map((l) => l.videoId.toString()));
  const savedSet = new Set(saves.map((s) => s.videoId.toString()));

  return videos.map((video) => ({
    id: video._id.toString(),
    instagramId: video.instagramId,
    url: video.url,
    thumbnailUrl: video.thumbnailUrl,
    format: video.format,
    category: video.category,
    hashtags: video.hashtags,
    caption: video.caption,
    authorName: video.authorName,
    authorAvatar: video.authorAvatar,
    musicTitle: video.musicTitle,
    likes: video.likes,
    views: video.views,
    commentsCount: video.commentsCount,
    sharesCount: video.sharesCount,
    savesCount: video.savesCount,
    createdAt: video.createdAt,
    isLiked: likedSet.has(video._id.toString()),
    isSaved: savedSet.has(video._id.toString()),
  }));
}

export async function markVideoViewed(userId: string, videoId: Types.ObjectId): Promise<void> {
  await View.findOneAndUpdate(
    { userId, videoId },
    { userId, videoId },
    { upsert: true, new: true },
  );
  await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
}
