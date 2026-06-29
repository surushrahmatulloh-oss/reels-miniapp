import mongoose from 'mongoose';
import dns from 'dns';
import { config } from '../config.js';
import { isFallbackMode } from '../store/fallback.js';
import { Video } from '../models/Video.js';
import { SEED_CATEGORIES } from '../data/youtubeSamplePool.js';
import { fetchVideosForCategory, isPlayableMp4Url } from './pexelsVideo.service.js';

const VIDEOS_PER_CATEGORY = 80;

export async function connectMongoForSeed(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (isFallbackMode() && config.useMemoryDb) {
    throw new Error('USE_MEMORY_DB=true — MongoDB ғайрифаъол.');
  }
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 15_000 });
}

export async function seedMp4Videos(options?: {
  clearYoutube?: boolean;
  perCategory?: number;
}): Promise<{
  added: number;
  updated: number;
  skipped: number;
  total: number;
  mp4Total: number;
  byCategory: Record<string, number>;
}> {
  await connectMongoForSeed();

  const perCategory = options?.perCategory ?? VIDEOS_PER_CATEGORY;

  if (options?.clearYoutube) {
    await Video.deleteMany({ url: { $regex: /youtube\.com\/embed/i } });
  }

  const existingMp4 = await Video.find({ url: { $regex: /\.mp4|videos\.pexels\.com|pixabay/i } })
    .select('url')
    .lean();
  const existingUrls = new Set(existingMp4.map((v) => v.url));

  let added = 0;
  let updated = 0;
  let skipped = 0;
  const byCategory: Record<string, number> = {};

  // Bulk-migrate YouTube rows using category fallback pool (fast, no per-row API calls)
  const youtubeRows = await Video.find({ url: { $regex: /youtube\.com\/embed/i } })
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean();

  const poolByCategory = new Map<string, Awaited<ReturnType<typeof fetchVideosForCategory>>>();
  for (const row of youtubeRows) {
    let pool = poolByCategory.get(row.category);
    if (!pool?.length) {
      pool = await fetchVideosForCategory(row.category, 30);
      poolByCategory.set(row.category, pool);
    }
    const entry = pool[updated % pool.length];
    if (!entry) continue;
    await Video.updateOne(
      { _id: row._id },
      {
        $set: {
          url: entry.mp4Url,
          thumbnailUrl: entry.thumbnailUrl || row.thumbnailUrl,
          caption: entry.title,
          authorName: entry.author,
        },
        $unset: { youtubeId: 1 },
      },
    );
    updated++;
  }

  for (const category of SEED_CATEGORIES) {
    byCategory[category] = 0;
    const pool = await fetchVideosForCategory(category, perCategory);
    const docs = [];

    for (const entry of pool) {
      if (!isPlayableMp4Url(entry.mp4Url)) continue;
      if (existingUrls.has(entry.mp4Url)) {
        skipped++;
        continue;
      }

      const hash = Buffer.from(entry.mp4Url).toString('base64url').slice(0, 16);
      docs.push({
        instagramId: `mp4_${category}_${hash}`,
        url: entry.mp4Url,
        thumbnailUrl: entry.thumbnailUrl || `https://picsum.photos/seed/${hash}/720/1280`,
        title: entry.title,
        format: 'reels' as const,
        category,
        hashtags: [category, 'reels', 'mp4'],
        caption: entry.title,
        authorName: entry.author,
        authorAvatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(entry.author)}`,
        musicTitle: 'Original Sound',
        likes: Math.floor(Math.random() * 5000) + 50,
        views: Math.floor(Math.random() * 50000) + 500,
        commentsCount: Math.floor(Math.random() * 200),
        sharesCount: Math.floor(Math.random() * 100),
        savesCount: Math.floor(Math.random() * 300),
        createdAt: new Date(Date.now() - (added + docs.length) * 60_000),
      });

      existingUrls.add(entry.mp4Url);
      byCategory[category]!++;
    }

    if (docs.length > 0) {
      await Video.insertMany(docs, { ordered: false }).catch((err: { code?: number }) => {
        if (err.code !== 11000) throw err;
      });
      added += docs.length;
    }

    console.log(`[mp4-seed] ${category}: +${docs.length}`);
  }

  const total = await Video.countDocuments();
  const mp4Total = await Video.countDocuments({
    url: { $not: { $regex: /youtube\.com\/embed/i } },
  });

  return { added, updated, skipped, total, mp4Total, byCategory };
}
