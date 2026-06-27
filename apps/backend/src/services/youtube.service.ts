import mongoose from 'mongoose';
import { config } from '../config.js';
import { isFallbackMode } from '../store/fallback.js';
import { Video } from '../models/Video.js';

const SEARCH_CATEGORIES = [
  'music',
  'travel',
  'food',
  'sport',
  'technology',
  'comedy',
  'fashion',
  'nature',
  'education',
  'dance',
  'cooking',
  'fitness',
] as const;

const VIDEOS_PER_CATEGORY = 50;

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

function pickThumbnail(snippet: YouTubeSearchItem['snippet']): string {
  return (
    snippet?.thumbnails?.high?.url ??
    snippet?.thumbnails?.medium?.url ??
    snippet?.thumbnails?.default?.url ??
    'https://picsum.photos/720/1280'
  );
}

async function searchCategory(category: string, apiKey: string): Promise<YouTubeSearchItem[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    q: `${category} shorts`,
    maxResults: String(VIDEOS_PER_CATEGORY),
    videoDuration: 'short',
    relevanceLanguage: 'en',
    key: apiKey,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube API (${category}): ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as YouTubeSearchResponse;
  return data.items ?? [];
}

export async function connectMongoForImport(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  if (isFallbackMode() && config.useMemoryDb) {
    throw new Error(
      'USE_MEMORY_DB=true — MongoDB ғайрифаъол. Барои YouTube import: USE_MEMORY_DB=false ва MONGODB_URI гузоред.',
    );
  }

  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10_000 });
}

export async function fetchYouTubeVideos(): Promise<number> {
  const apiKey = config.youtubeApiKey;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY дар .env ёфт нашуд');
  }

  await connectMongoForImport();

  let added = 0;

  for (const category of SEARCH_CATEGORIES) {
    const items = await searchCategory(category, apiKey);
    const videoIds = items
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id));

    if (videoIds.length === 0) continue;

    const existing = await Video.find({ youtubeId: { $in: videoIds } })
      .select('youtubeId')
      .lean();
    const existingSet = new Set(existing.map((v) => v.youtubeId));

    const docs = [];

    for (const item of items) {
      const youtubeId = item.id?.videoId;
      if (!youtubeId || existingSet.has(youtubeId)) continue;

      const snippet = item.snippet;
      const title = snippet?.title ?? category;
      const channel = snippet?.channelTitle ?? 'YouTube';

      docs.push({
        youtubeId,
        instagramId: `yt_${youtubeId}`,
        url: `https://www.youtube.com/embed/${youtubeId}`,
        thumbnailUrl: pickThumbnail(snippet),
        title,
        format: 'reels' as const,
        category,
        hashtags: [category, 'reels', 'youtube', 'shorts'],
        caption: title,
        authorName: channel,
        authorAvatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(channel)}`,
        musicTitle: 'Original Sound',
        likes: 0,
        views: 0,
        commentsCount: 0,
        sharesCount: 0,
        savesCount: 0,
      });

      existingSet.add(youtubeId);
    }

    if (docs.length > 0) {
      await Video.insertMany(docs, { ordered: false }).catch((err: { code?: number }) => {
        if (err.code !== 11000) throw err;
      });
      added += docs.length;
    }

    console.log(`[youtube] ${category}: +${docs.length} видё`);
  }

  console.log(`Илова шуд: ${added} видё`);
  return added;
}

export { SEARCH_CATEGORIES };
