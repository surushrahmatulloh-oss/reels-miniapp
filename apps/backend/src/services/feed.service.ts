import mongoose, { type Types } from 'mongoose';
import { Video, type IVideo } from '../models/Video.js';
import { View } from '../models/Interaction.js';
import { Like, Save } from '../models/Interaction.js';
import { cacheGet, cacheSet } from '../redis.js';
import type { VideoFormat } from '../types/index.js';
import { normalizePlaybackUrl } from '../data/workingMp4Pool.js';

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

async function getWatchedIds(userId: string, limit = 300): Promise<Set<string>> {
  const views = await View.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('videoId')
    .lean();
  return new Set(views.map((v) => v.videoId.toString()));
}

function dedupeByUrl(videos: IVideo[], limit: number): IVideo[] {
  const seenUrls = new Set<string>();
  const out: IVideo[] = [];
  for (const v of videos) {
    const key = v.url?.trim() || v._id.toString();
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchUniqueFeedPage(
  match: Record<string, unknown>,
  limit: number,
): Promise<IVideo[]> {
  const rows = await Video.aggregate([
    { $match: match },
    { $sort: { _id: -1 } },
    {
      $group: {
        _id: '$url',
        doc: { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { _id: -1 } },
    { $limit: limit + 1 },
  ]);
  return rows as unknown as IVideo[];
}

export async function buildFeed(params: {
  userId: string;
  categories: string[];
  format?: VideoFormat;
  cursor?: string;
  limit?: number;
  excludeIds?: string[];
}): Promise<{ videos: IVideo[]; nextCursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? 10, 20);
  const format = params.format ?? 'reels';
  const excludeKey = (params.excludeIds ?? []).slice(0, 50).join(',');
  const cacheKey = `feed:v4:${params.userId}:${format}:${params.cursor ?? 'start'}:${limit}:${excludeKey}`;
  const cached = await cacheGet<{ videos: IVideo[]; nextCursor: string | null; hasMore: boolean }>(
    cacheKey,
  );
  if (cached) return cached;

  const preferredCategories =
    params.categories.length > 0 ? params.categories : CATEGORIES.slice(0, 6);

  const watched = await getWatchedIds(params.userId);
  for (const id of params.excludeIds ?? []) {
    if (mongoose.Types.ObjectId.isValid(id)) watched.add(id);
  }

  const seenObjectIds = [...watched]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const baseMatch: Record<string, unknown> = {
    format,
    url: MP4_URL_FILTER,
  };

  if (params.cursor && mongoose.Types.ObjectId.isValid(params.cursor)) {
    baseMatch._id = { $lt: new mongoose.Types.ObjectId(params.cursor) };
  }
  if (seenObjectIds.length > 0) {
    const prev = baseMatch._id as Record<string, unknown> | undefined;
    baseMatch._id = { ...prev, $nin: seenObjectIds };
  }

  let page = await fetchUniqueFeedPage(
    { ...baseMatch, category: { $in: preferredCategories } },
    limit,
  );

  if (page.length <= limit) {
    const extra = await fetchUniqueFeedPage(
      { ...baseMatch, category: { $nin: preferredCategories } },
      limit,
    );
    page = dedupeByUrl([...page, ...extra], limit + 1);
  }

  if (page.length === 0) {
    const replayMatch: Record<string, unknown> = { format, url: MP4_URL_FILTER };
    if (params.cursor && mongoose.Types.ObjectId.isValid(params.cursor)) {
      replayMatch._id = { $lt: new mongoose.Types.ObjectId(params.cursor) };
    }
    page = await fetchUniqueFeedPage(replayMatch, limit);
  }

  const hasMore = page.length > limit;
  page = page.slice(0, limit);

  const nextCursor =
    hasMore && page.length > 0 ? page[page.length - 1]!._id.toString() : null;

  const result = {
    videos: page,
    nextCursor,
    hasMore,
  };

  await cacheSet(cacheKey, result, 20);
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
    const playbackUrl = normalizePlaybackUrl(video.url, id);
    return {
      id,
      instagramId: video.instagramId,
      url: playbackUrl,
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
