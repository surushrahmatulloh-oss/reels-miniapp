import mongoose from 'mongoose';
import dns from 'dns';
import { config } from '../config.js';
import { isFallbackMode } from '../store/fallback.js';
import { Video } from '../models/Video.js';
import { SAMPLE_YOUTUBE_POOL, SEED_CATEGORIES, VIDEOS_PER_CATEGORY } from '../data/youtubeSamplePool.js';

export async function connectMongoForSeed(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  if (isFallbackMode() && config.useMemoryDb) {
    throw new Error('USE_MEMORY_DB=true — MongoDB ғайрифаъол. USE_MEMORY_DB=false ва MONGODB_URI гузоред.');
  }

  dns.setServers(['8.8.8.8', '1.1.1.1']);
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 15_000 });
}

function thumbnailUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export async function seedSampleVideos(options?: { clear?: boolean }): Promise<{
  added: number;
  skipped: number;
  total: number;
  byCategory: Record<string, number>;
}> {
  await connectMongoForSeed();

  if (options?.clear) {
    await Video.deleteMany({ youtubeId: { $exists: true, $ne: null } });
  }

  const existing = await Video.find({ youtubeId: { $exists: true } })
    .select('youtubeId')
    .lean();
  const existingSet = new Set(existing.map((v) => v.youtubeId).filter(Boolean));

  let added = 0;
  let skipped = 0;
  const byCategory: Record<string, number> = {};

  for (const category of SEED_CATEGORIES) {
    byCategory[category] = 0;
    const pool = SAMPLE_YOUTUBE_POOL[category] ?? [];
    const docs = [];

    for (let i = 0; i < pool.length && byCategory[category]! < VIDEOS_PER_CATEGORY; i++) {
      const entry = pool[i]!;
      if (existingSet.has(entry.id)) {
        skipped++;
        continue;
      }

      docs.push({
        youtubeId: entry.id,
        instagramId: `yt_${category}_${entry.id}`,
        url: `https://www.youtube.com/embed/${entry.id}`,
        thumbnailUrl: thumbnailUrl(entry.id),
        title: entry.title,
        format: 'reels' as const,
        category,
        hashtags: [category, 'reels', 'youtube', 'shorts'],
        caption: entry.title,
        authorName: entry.author,
        authorAvatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(entry.author)}`,
        musicTitle: 'Original Sound',
        likes: Math.floor(Math.random() * 5000) + 50,
        views: Math.floor(Math.random() * 50000) + 500,
        commentsCount: Math.floor(Math.random() * 200),
        sharesCount: Math.floor(Math.random() * 100),
        savesCount: Math.floor(Math.random() * 300),
        createdAt: new Date(Date.now() - (added + i) * 60_000),
      });

      existingSet.add(entry.id);
      byCategory[category]!++;
    }

    if (docs.length > 0) {
      await Video.insertMany(docs, { ordered: false }).catch((err: { code?: number }) => {
        if (err.code !== 11000) throw err;
      });
      added += docs.length;
    }

    console.log(`[seed] ${category}: +${docs.length} видё`);
  }

  const total = await Video.countDocuments();
  console.log(`Илова шуд: ${added} видё (skipped duplicates: ${skipped})`);

  return { added, skipped, total, byCategory };
}
