import mongoose, { type Types } from 'mongoose';
import { Video, type IVideo } from '../models/Video.js';
import { View } from '../models/Interaction.js';
import { Like, Save } from '../models/Interaction.js';
import { cacheGet, cacheSet } from '../redis.js';
import type { VideoFormat } from '../types/index.js';
import { normalizePlaybackUrl } from '../data/workingMp4Pool.js';
import { urlHasAudio, getAudioUrlForCategory } from '../data/audioMp4Pool.js';
import { CATEGORY_IDS, expandCategoryIds } from '../data/categories.js';

const CATEGORIES = CATEGORY_IDS;

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
  const seenIds = new Set<string>();
  const out: IVideo[] = [];
  for (const v of videos) {
    const id = v._id.toString();
    if (seenIds.has(id)) continue;
    const key = v.url?.trim() || id;
    if (seenUrls.has(key)) continue;
    seenIds.add(id);
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
  const rows = await Video.find(match)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();
  return rows as unknown as IVideo[];
}

/** Seeded audio clips per category — not filtered by watch history */
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

function filterAudioOnly(videos: IVideo[]): IVideo[] {
  return videos.filter((v) => urlHasAudio(v.url ?? ''));
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
  const cacheKey = `feed:v6:${params.userId}:${format}:${catKey}:${params.cursor ?? 'start'}:${limit}:${excludeKey}`;
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

  const fetchSize = Math.max(limit * 3, 120);
  const categoryMatch = { ...baseMatch, category: { $in: preferredCategories } };

  let page: IVideo[] = [];

  if (strictCategories) {
    const audioClips = await fetchCategoryAudioClips(preferredCategories, limit);
    const pexelsPage = filterAudioOnly(await fetchUniqueFeedPage(categoryMatch, fetchSize));
    page = dedupeByUrl([...audioClips, ...pexelsPage], limit + 5);

    if (page.length === 0) {
      const replayMatch: Record<string, unknown> = {
        format,
        url: MP4_URL_FILTER,
        category: { $in: preferredCategories },
      };
      if (params.cursor && mongoose.Types.ObjectId.isValid(params.cursor)) {
        replayMatch._id = { $lt: new mongoose.Types.ObjectId(params.cursor) };
      }
      const replayAudio = await fetchCategoryAudioClips(preferredCategories, limit);
      const replayPexels = filterAudioOnly(await fetchUniqueFeedPage(replayMatch, fetchSize));
      page = dedupeByUrl([...replayAudio, ...replayPexels], limit + 5);
    }
  } else {
    page = await fetchUniqueFeedPage(categoryMatch, fetchSize);

    if (page.length === 0) {
      const replayMatch: Record<string, unknown> = { format, url: MP4_URL_FILTER };
      if (params.cursor && mongoose.Types.ObjectId.isValid(params.cursor)) {
        replayMatch._id = { $lt: new mongoose.Types.ObjectId(params.cursor) };
      }
      page = await fetchUniqueFeedPage(replayMatch, fetchSize);
    }

    if (page.length <= limit) {
      const extra = await fetchUniqueFeedPage(
        { ...baseMatch, category: { $nin: preferredCategories } },
        fetchSize,
      );
      page = dedupeByUrl([...page, ...extra], limit + 25);
    }

    page.sort((a, b) => Number(urlHasAudio(b.url ?? '')) - Number(urlHasAudio(a.url ?? '')));
  }

  if (strictCategories) {
    page = page.filter((v) => {
      const cat = v.category?.toLowerCase() ?? '';
      return preferredCategories.includes(cat);
    });
    page = filterAudioOnly(page);
  }

  const hasMore = page.length >= limit;
  page = page.slice(0, limit);

  const nextCursor =
    hasMore && page.length > 0 ? page[page.length - 1]!._id.toString() : null;

  const result = {
    videos: page,
    nextCursor,
    hasMore,
  };

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
    let playbackUrl = normalizePlaybackUrl(video.url);
    let hasAudio = urlHasAudio(playbackUrl);

    if (!hasAudio) {
      const fallback = getAudioUrlForCategory(video.category);
      if (fallback) {
        playbackUrl = fallback;
        hasAudio = true;
      }
    }

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
