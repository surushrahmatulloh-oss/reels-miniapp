import { Video } from '../models/Video.js';
import { APP_CATEGORIES } from '../data/categories.js';
import { AUDIO_MP4_URLS } from '../data/audioMp4Pool.js';
import { isDatabaseReady } from '../db.js';

const MP4_URL_FILTER = {
  $not: { $regex: /youtube\.com\/embed|youtu\.be/i },
};

const CAPTIONS = [
  'Amazing vibes #reels #viral',
  'Must watch today #trending',
  'Best moment captured #fyp',
  'Incredible content #explore',
];

const BATCH_SIZE = 100;

/** Ensure at least `minCount` reels MP4 videos exist (with audio URLs when possible). */
export async function ensureMinimumVideos(
  minCount = 2000,
): Promise<{ added: number; total: number; skipped: boolean }> {
  if (!isDatabaseReady()) return { added: 0, total: 0, skipped: true };

  const existing = await Video.countDocuments({
    format: 'reels',
    url: MP4_URL_FILTER,
  });
  if (existing >= minCount) {
    return { added: 0, total: existing, skipped: true };
  }

  const need = minCount - existing;
  let added = 0;
  let seq = existing;
  const pending: Record<string, unknown>[] = [];

  const flush = async () => {
    if (pending.length === 0) return;
    const batch = pending.splice(0, pending.length);
    try {
      const inserted = await Video.insertMany(batch, { ordered: false });
      added += inserted.length;
    } catch (err: unknown) {
      const bulk = err as { insertedDocs?: unknown[]; result?: { insertedCount?: number } };
      added += bulk.insertedDocs?.length ?? bulk.result?.insertedCount ?? 0;
    }
  };

  for (let i = 0; i < need; i++) {
    const cat = APP_CATEGORIES[seq % APP_CATEGORIES.length]!;
    const baseUrl = AUDIO_MP4_URLS[seq % AUDIO_MP4_URLS.length]!;
    const instagramId = `minseed_${cat.id}_${seq}`;
    const url = `${baseUrl.split('#')[0]}#v=${instagramId}`;
    seq++;

    pending.push({
      instagramId,
      url,
      thumbnailUrl: `https://picsum.photos/seed/${instagramId}/720/1280`,
      title: cat.label,
      format: 'reels',
      category: cat.id,
      hashtags: [cat.id, 'reels', 'viral'],
      caption: `${cat.emoji} ${cat.label} — ${CAPTIONS[seq % CAPTIONS.length]}`,
      authorName: `${cat.label}Daily`,
      authorAvatar: `https://i.pravatar.cc/150?u=${cat.id}_${seq}`,
      musicTitle: 'Original Sound',
      likes: 120 + (seq % 900),
      views: 1500 + (seq % 5000),
      commentsCount: 3 + (seq % 40),
      sharesCount: 2 + (seq % 20),
      savesCount: 5 + (seq % 30),
      createdAt: new Date(Date.now() - seq * 120_000),
    });

    if (pending.length >= BATCH_SIZE) await flush();
  }

  await flush();

  const total = await Video.countDocuments({ format: 'reels', url: MP4_URL_FILTER });
  if (added > 0) console.log(`[min-seed] created ${added} videos (total ${total})`);
  return { added, total, skipped: false };
}
