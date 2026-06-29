import mongoose from 'mongoose';
import dns from 'dns';
import { config } from '../config.js';
import { isFallbackMode } from '../store/fallback.js';
import { Video } from '../models/Video.js';
import { SEED_CATEGORIES } from '../data/youtubeSamplePool.js';
import { fetchVideosForCategory, isPlayableMp4Url } from './pexelsVideo.service.js';

const TARGET_TOTAL = 2310;

function isMp4Only(url: string): boolean {
  return /\.mp4(\?|$)/i.test(url) && !/youtube\.com|youtu\.be/i.test(url);
}

export async function connectMongoForSeed(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (isFallbackMode() && config.useMemoryDb) {
    throw new Error('USE_MEMORY_DB=true — MongoDB ғайрифаъол.');
  }
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 15_000 });
}

export async function seedMp4Videos(options?: {
  wipeAll?: boolean;
  perCategory?: number;
  targetTotal?: number;
}): Promise<{
  deleted: number;
  added: number;
  skipped: number;
  total: number;
  mp4Total: number;
  youtubeRemaining: number;
  byCategory: Record<string, number>;
}> {
  await connectMongoForSeed();

  const targetTotal = options?.targetTotal ?? TARGET_TOTAL;
  const perCategory =
    options?.perCategory ?? Math.ceil(targetTotal / SEED_CATEGORIES.length);

  let deleted = 0;
  if (options?.wipeAll) {
    const result = await Video.deleteMany({});
    deleted = result.deletedCount ?? 0;
    console.log(`[mp4-seed] wiped ${deleted} videos`);
  }

  const existingUrls = new Set<string>();
  let added = 0;
  let skipped = 0;
  let globalIndex = 0;
  const byCategory: Record<string, number> = {};

  for (const category of SEED_CATEGORIES) {
    byCategory[category] = 0;
    const pool = await fetchVideosForCategory(category, perCategory, existingUrls);
    const docs = [];

    for (let j = 0; j < pool.length; j++) {
      const entry = pool[j]!;
      if (!isPlayableMp4Url(entry.mp4Url) || !isMp4Only(entry.mp4Url)) {
        skipped++;
        continue;
      }

      globalIndex++;
      const hash = Buffer.from(`${globalIndex}_${category}_${entry.mp4Url}`)
        .toString('base64url');

      docs.push({
        instagramId: `mp4_${String(globalIndex).padStart(5, '0')}_${category}_${hash.slice(0, 12)}`,
        url: entry.mp4Url,
        thumbnailUrl: entry.thumbnailUrl || `https://picsum.photos/seed/${hash}/720/1280`,
        title: entry.title,
        format: 'reels' as const,
        category,
        hashtags: [category, 'reels', 'mp4', 'pexels'],
        caption: entry.title,
        authorName: entry.author,
        authorAvatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(entry.author)}`,
        musicTitle: 'Original Sound',
        likes: Math.floor(Math.random() * 5000) + 50,
        views: Math.floor(Math.random() * 50000) + 500,
        commentsCount: Math.floor(Math.random() * 200),
        sharesCount: Math.floor(Math.random() * 100),
        savesCount: Math.floor(Math.random() * 300),
        createdAt: new Date(Date.now() - (added + docs.length) * 30_000),
      });

      existingUrls.add(entry.mp4Url);
    }

    if (docs.length > 0) {
      try {
        const inserted = await Video.insertMany(docs, { ordered: false });
        added += inserted.length;
        byCategory[category] = inserted.length;
      } catch (err: unknown) {
        const bulk = err as { code?: number; insertedDocs?: unknown[]; result?: { insertedCount?: number } };
        if (bulk.code === 11000) {
          const n = bulk.insertedDocs?.length ?? bulk.result?.insertedCount ?? 0;
          added += n;
          byCategory[category] = n;
        } else {
          throw err;
        }
      }
    }

    console.log(`[mp4-seed] ${category}: +${byCategory[category]}`);
  }

  const total = await Video.countDocuments();
  const mp4Total = await Video.countDocuments({
    $and: [
      { url: { $regex: /\.mp4/i } },
      { url: { $not: { $regex: /youtube/i } } },
    ],
  });
  const youtubeRemaining = await Video.countDocuments({
    url: { $regex: /youtube\.com|youtu\.be/i },
  });

  return { deleted, added, skipped, total, mp4Total, youtubeRemaining, byCategory };
}
