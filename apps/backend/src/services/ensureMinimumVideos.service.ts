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

/** Ensure at least `minCount` reels MP4 videos exist (with audio URLs when possible). */
export async function ensureMinimumVideos(minCount = 2000): Promise<void> {
  if (!isDatabaseReady()) return;

  const existing = await Video.countDocuments({
    format: 'reels',
    url: MP4_URL_FILTER,
  });
  if (existing >= minCount) return;

  let added = 0;
  let seq = existing;

  while (existing + added < minCount) {
    const cat = APP_CATEGORIES[seq % APP_CATEGORIES.length]!;
    const baseUrl = AUDIO_MP4_URLS[seq % AUDIO_MP4_URLS.length]!;
    const instagramId = `minseed_${cat.id}_${seq}`;
    const url = `${baseUrl.split('#')[0]}#v=${instagramId}`;
    seq++;

    const found = await Video.findOne({ instagramId }).lean();
    if (found) continue;

    try {
      await Video.create({
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
      added++;
    } catch (err: unknown) {
      const e = err as { code?: number };
      if (e.code !== 11000) console.warn(`[min-seed] ${instagramId}:`, err);
    }
  }

  if (added > 0) {
    console.log(`[min-seed] created ${added} videos (target ${minCount})`);
  }
}
