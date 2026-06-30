import mongoose, { type Types } from 'mongoose';
import { Video, type IVideo } from '../models/Video.js';
import { View } from '../models/Interaction.js';
import { Like, Save } from '../models/Interaction.js';
import { cacheGet, cacheSet } from '../redis.js';
import type { VideoFormat } from '../types/index.js';
import { normalizePlaybackUrl } from '../data/workingMp4Pool.js';
import { urlHasAudio } from '../data/audioMp4Pool.js';
import { CATEGORY_IDS, expandCategoryIds } from '../data/categories.js';

const CATEGORIES = CATEGORY_IDS;

export { CATEGORIES };

const MP4_URL_FILTER = {
  $not: { $regex: /youtube\.com\/embed|youtu\.be/i },
};

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

async function getWatchedIds(userId: string, limit = 300): Promise<Set<string>> {
  const views = await View.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('videoId')
    .lean();
  return new Set(views.map((v) => v.videoId.toString()));
}

function dedupeByUrl(videos: IVideo[], limit: number): IVideo[] {
  const seenIds = new Set<string>();
  const out: IVideo[] = [];
  for (const v of videos) {
    const id = v._id.toString();
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

function sortAudioFirst(videos: IVideo[]): IVideo[] {
  return [...videos].sort(
    (a, b) => Number(urlHasAudio(b.url ?? '')) - Number(urlHasAudio(a.url ?? '')),
  );
}

function matchesCategories(video: IVideo, preferred: string[]): boolean {
  const cat = video.category?.toLowerCase() ?? '';
  return preferred.includes(cat);
}

async function fetchUniqueFeedPage(
  match: Record<string, unknown>,
  limit: number,
): Promise<IVideo[]> {
  const rows = await Video.find(match)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();
  return rows as unknown as IVideo[];
}

async function fetchCategoryAudioClips(
  categories: string[],
  max: number,
): Promise<IVideo[]> {
  const rows = await Video.find({
    format: 'reels',
    url: MP4_URL_FILTER,
    category: { $in: categories },
    instagramId: { $regex: /^audio_/i },
  })
    .sort({ _id: -1 })
    .limit(max * 2)
    .lean();
  return (rows as unknown as IVideo[])
    .filter((v) => urlHasAudio(v.url ?? ''))
    .slice(0, max);
}

export async function buildFeed(params: {
  userId: string;
  categories: string[];
  format?: VideoFormat;
  cursor?: string;
  limit?: number;
  excludeIds?: string[];
}): Promise<{ videos: IVideo[]; nextCursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? 20, 60);
  const format = params.format ?? 'reels';
  const strictCategories = params.categories.length > 0;
  const catKey = [...params.categories].sort().join('|') || 'default';
  const excludeKey = (params.excludeIds ?? []).slice(0, 50).join(',');
  const cacheKey = `feed:v8:${params.userId}:${format}:${catKey}:${params.cursor ?? 'start'}:${limit}:${excludeKey}`;
  const cached = await cacheGet<{ videos: IVideo[]; nextCursor: string | null; hasMore: boolean }>(
    cacheKey,
  );
  if (cached) return cached;

  const preferredCategories = expandCategoryIds(
    strictCategories ? params.categories : CATEGORIES.slice(0, 6),
  );

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

  const fetchSize = Math.max(limit * 2, 60);
  const categoryMatch = { ...baseMatch, category: { $in: preferredCategories } };

  let page: IVideo[] = [];
  let isReplay = false;

  if (strictCategories) {
    const audioClips = await fetchCategoryAudioClips(preferredCategories, 5);
    const pexelsPage = await fetchUniqueFeedPage(categoryMatch, fetchSize);
    page = dedupeByUrl([...audioClips, ...pexelsPage], limit + 10);
    page = page.filter((v) => matchesCategories(v, preferredCategories));

    if (page.length === 0) {
      isReplay = true;
      const replayMatch: Record<string, unknown> = {
        format,
        url: MP4_URL_FILTER,
        category: { $in: preferredCategories },
      };
      if (params.cursor && mongoose.Types.ObjectId.isValid(params.cursor)) {
        replayMatch._id = { $lt: new mongoose.Types.ObjectId(params.cursor) };
      }
      const replayAudio = await fetchCategoryAudioClips(preferredCategories, 5);
      const replayPexels = await fetchUniqueFeedPage(replayMatch, fetchSize);
      page = dedupeByUrl([...replayAudio, ...replayPexels], limit + 10);
      page = page.filter((v) => matchesCategories(v, preferredCategories));
    }
  } else {
    page = await fetchUniqueFeedPage(categoryMatch, fetchSize);
    if (page.length === 0) {
      page = await fetchUniqueFeedPage({ format, url: MP4_URL_FILTER }, fetchSize);
    }
  }

  page = sortAudioFirst(page);
  if (isReplay) page = shuffleArray(page);

  const hasMore = page.length > limit;
  page = page.slice(0, limit);

  const nextCursor =
    hasMore && page.length > 0 ? page[page.length - 1]!._id.toString() : null;

  const result = { videos: page, nextCursor, hasMore };

  await cacheSet(cacheKey, result, 15);
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
    const playbackUrl = normalizePlaybackUrl(video.url);
    const hasAudio = urlHasAudio(playbackUrl);
    const useDirect = playbackUrl.startsWith('http');

    return {
      id,
      instagramId: video.instagramId,
      url: playbackUrl,
      playUrl: useDirect ? playbackUrl : `/api/media/${id}.mp4`,
      thumbnailUrl: video.thumbnailUrl,
      title: video.title,
      format: video.format,
      category: video.category,
      hashtags: video.hashtags,
      caption: video.caption,
      authorName: video.authorName,
      authorAvatar: video.authorAvatar,
      musicTitle: video.musicTitle,
      hasAudio,
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
