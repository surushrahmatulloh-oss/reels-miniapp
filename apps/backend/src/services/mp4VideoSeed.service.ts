import { Video } from '../models/Video.js';
import { CATEGORY_IDS } from '../data/categories.js';
import {
  fetchVideosForCategory,
  isFakeSeedUrl,
  isPlayableMp4Url,
  videoDedupeKey,
} from './pexelsVideo.service.js';
import { connectDatabase } from '../db.js';

const TARGET_TOTAL = 2322;
const INSERT_BATCH = 40;

function isMp4Only(url: string): boolean {
  return /\.mp4(\?|$)/i.test(url) && !/youtube\.com|youtu\.be/i.test(url);
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
  await connectDatabase();

  const targetTotal = options?.targetTotal ?? TARGET_TOTAL;
  const perCategory =
    options?.perCategory ?? Math.ceil(targetTotal / CATEGORY_IDS.length);

  let deleted = 0;
  if (options?.wipeAll) {
    const result = await Video.deleteMany({});
    deleted = result.deletedCount ?? 0;
    console.log(`[mp4-seed] wiped ${deleted} videos`);
  }

  const existingKeys = new Set<string>();
  let added = 0;
  let skipped = 0;
  let globalIndex = 0;
  const byCategory: Record<string, number> = {};

  for (const category of CATEGORY_IDS) {
    byCategory[category] = 0;
    const pool = await fetchVideosForCategory(category, perCategory, existingKeys);
    const docs = [];

    for (let j = 0; j < pool.length; j++) {
      const entry = pool[j]!;
      if (
        !isPlayableMp4Url(entry.mp4Url) ||
        !isMp4Only(entry.mp4Url) ||
        isFakeSeedUrl(entry.mp4Url)
      ) {
        skipped++;
        continue;
      }

      const dedupeKey = videoDedupeKey(entry.mp4Url, entry.sourceId);

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

      existingKeys.add(dedupeKey);
    }

    let categoryAdded = 0;
    for (let i = 0; i < docs.length; i += INSERT_BATCH) {
      const batch = docs.slice(i, i + INSERT_BATCH);
      try {
        const inserted = await Video.insertMany(batch, { ordered: false });
        categoryAdded += inserted.length;
        added += inserted.length;
      } catch (err: unknown) {
        const bulk = err as { code?: number; insertedDocs?: unknown[]; result?: { insertedCount?: number } };
        if (bulk.code === 11000) {
          const n = bulk.insertedDocs?.length ?? bulk.result?.insertedCount ?? 0;
          categoryAdded += n;
          added += n;
        } else {
          throw err;
        }
      }
    }

    byCategory[category] = categoryAdded;
    console.log(`[mp4-seed] ${category}: +${categoryAdded}`);
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
