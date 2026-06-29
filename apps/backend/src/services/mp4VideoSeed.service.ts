import mongoose from 'mongoose';
import dns from 'dns';
import { config } from '../config.js';
import { isFallbackMode } from '../store/fallback.js';
import { Video } from '../models/Video.js';
import { SEED_CATEGORIES } from '../data/youtubeSamplePool.js';
import { fetchVideosForCategory, isPlayableMp4Url } from './pexelsVideo.service.js';
import { WORKING_MP4_POOL, normalizePlaybackUrl, isServerPlayableUrl } from '../data/workingMp4Pool.js';

const VIDEOS_PER_CATEGORY = 80;

async function fixBrokenUrls(): Promise<number> {
  const broken = await Video.find({
    $or: [
      { url: { $regex: /youtube\.com|youtu\.be|videos\.pexels\.com|commondatastorage\.googleapis/i } },
      { url: { $not: { $regex: /\.mp4/i } } },
    ],
  })
    .select('_id url')
    .limit(500)
    .lean();

  let fixed = 0;
  for (const row of broken) {
    const newUrl = normalizePlaybackUrl(row.url, row._id.toString());
    if (newUrl !== row.url) {
      await Video.updateOne({ _id: row._id }, { $set: { url: newUrl } });
      fixed++;
    }
  }
  return fixed;
}

async function fixDuplicateUrls(): Promise<number> {
  const groups = await Video.aggregate<{ _id: string; ids: mongoose.Types.ObjectId[] }>([
    { $match: { url: { $not: { $regex: /youtube/i } } } },
    { $group: { _id: '$url', ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 500 },
  ]);

  if (!groups.length) return 0;

  const usedUrls = new Set(
    (await Video.find({ url: { $not: { $regex: /youtube/i } } }).select('url').lean()).map(
      (v) => v.url,
    ),
  );

  let fixed = 0;
  let poolIdx = 0;

  for (const group of groups) {
    for (const id of group.ids.slice(1)) {
      let newUrl = '';
      let attempts = 0;
      const maxAttempts = WORKING_MP4_POOL.length * 2 + 5;

      while (attempts < maxAttempts) {
        const base = WORKING_MP4_POOL[poolIdx % WORKING_MP4_POOL.length]!;
        const candidate =
          attempts < WORKING_MP4_POOL.length ? base : `${base.split('?')[0]}?v=${id.toString()}`;
        poolIdx++;
        attempts++;
        if (!usedUrls.has(candidate)) {
          newUrl = candidate;
          break;
        }
      }

      if (!newUrl) continue;

      await Video.updateOne({ _id: id }, { $set: { url: newUrl } });
      usedUrls.add(newUrl);
      fixed++;
    }
  }
  return fixed;
}

export { fixDuplicateUrls };

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

  const broken = await fixBrokenUrls();
  if (broken > 0) console.log(`[mp4-seed] fixed broken URLs: ${broken}`);

  const deduped = await fixDuplicateUrls();
  if (deduped > 0) console.log(`[mp4-seed] fixed duplicate URLs: ${deduped}`);

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
      if (!isPlayableMp4Url(entry.mp4Url) && !isServerPlayableUrl(entry.mp4Url)) continue;
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
