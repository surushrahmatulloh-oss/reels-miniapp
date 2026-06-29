import mongoose, { type Types } from 'mongoose';
import { Video, type IVideo } from '../models/Video.js';
import { View } from '../models/Interaction.js';
import { Like, Save } from '../models/Interaction.js';
import { cacheGet, cacheSet } from '../redis.js';
import type { VideoFormat } from '../types/index.js';
import { isPlayableMp4Url } from './pexelsVideo.service.js';

const CATEGORIES = [
  'music',
  'travel',
  'food',
  'sport',
  'tech',
  'comedy',
  'fashion',
  'nature',
  'education',
  'dance',
  'cooking',
  'fitness',
  'animals',
  'art',
  'gaming',
  'news',
  'health',
  'business',
];

export { CATEGORIES };

const MP4_URL_FILTER = {
  $not: { $regex: /youtube\.com\/embed|youtu\.be/i },
};

async function getRecentlySeenIds(userId: string, limit = 40): Promise<Set<string>> {
  const views = await View.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('videoId')
    .lean();
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
  const cacheKey = `feed:v2:${params.userId}:${format}:${params.cursor ?? 'start'}:${limit}`;
  const cached = await cacheGet<{ videos: IVideo[]; nextCursor: string | null; hasMore: boolean }>(
    cacheKey,
  );
  if (cached) return cached;

  const preferredCategories =
    params.categories.length > 0 ? params.categories : CATEGORIES.slice(0, 6);

  const recentlySeen = await getRecentlySeenIds(params.userId);
  const seenObjectIds = [...recentlySeen]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const idFilter: Record<string, unknown> = {};
  if (params.cursor && mongoose.Types.ObjectId.isValid(params.cursor)) {
    idFilter.$lt = new mongoose.Types.ObjectId(params.cursor);
  }
  if (seenObjectIds.length > 0) {
    idFilter.$nin = seenObjectIds;
  }

  const baseFilter: Record<string, unknown> = {
    format,
    url: MP4_URL_FILTER,
    ...(Object.keys(idFilter).length > 0 ? { _id: idFilter } : {}),
  };

  let videos = await Video.find({
    ...baseFilter,
    category: { $in: preferredCategories },
  })
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  if (videos.length <= limit) {
    const extraFilter = { ...baseFilter };
    delete (extraFilter as { category?: unknown }).category;

    const extra = await Video.find(extraFilter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const ids = new Set(videos.map((v) => v._id.toString()));
    for (const v of extra) {
      if (!ids.has(v._id.toString())) videos.push(v);
    }
  }

  if (videos.length === 0) {
    const replayFilter: Record<string, unknown> = { format, url: MP4_URL_FILTER };
    if (params.cursor && mongoose.Types.ObjectId.isValid(params.cursor)) {
      replayFilter._id = { $lt: new mongoose.Types.ObjectId(params.cursor) };
    }
    videos = await Video.find(replayFilter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();
  }

  const hasMore = videos.length > limit;
  const page = videos.slice(0, limit);
  const nextCursor =
    hasMore && page.length > 0 ? page[page.length - 1]!._id.toString() : null;

  const totalMp4 = await Video.countDocuments({ format, url: MP4_URL_FILTER });

  const result = {
    videos: page as unknown as IVideo[],
    nextCursor,
    hasMore: hasMore || (totalMp4 > page.length && page.length > 0),
  };

  await cacheSet(cacheKey, result, 30);
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

  return videos.map((video) => {
    const id = video._id.toString();
    const directMp4 = isPlayableMp4Url(video.url) ? video.url : '';
    return {
      id,
      instagramId: video.instagramId,
      url: directMp4,
      playUrl: `/api/media/${id}.mp4`,
      thumbnailUrl: video.thumbnailUrl,
      title: video.title,
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
      isLiked: likedSet.has(id),
      isSaved: savedSet.has(id),
    };
  });
}

export async function markVideoViewed(userId: string, videoId: Types.ObjectId): Promise<void> {
  await View.findOneAndUpdate(
    { userId, videoId },
    { userId, videoId, createdAt: new Date() },
    { upsert: true, new: true },
  );
  await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
}
