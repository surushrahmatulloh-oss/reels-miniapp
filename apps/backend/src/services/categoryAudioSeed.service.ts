import { Video } from '../models/Video.js';
import { APP_CATEGORIES } from '../data/categories.js';
import { AUDIO_MP4_URLS } from '../data/audioMp4Pool.js';
import { isDatabaseReady } from '../db.js';

const CLIPS_PER_CATEGORY = 8;

/** Ensure each category has multiple DB videos with known audio MP4 URLs */
export async function ensureCategoryAudioClips(): Promise<void> {
  if (!isDatabaseReady()) return;

  let added = 0;

  for (const cat of APP_CATEGORIES) {
    for (let i = 0; i < CLIPS_PER_CATEGORY; i++) {
      const url = AUDIO_MP4_URLS[i % AUDIO_MP4_URLS.length]!;
      const instagramId = `audio_${cat.id}_${i}`;

      const existing = await Video.findOne({ instagramId }).lean();
      if (existing) continue;

      try {
        await Video.create({
          instagramId,
          url,
          thumbnailUrl: `https://picsum.photos/seed/audio_${cat.id}_${i}/720/1280`,
          title: cat.label,
          format: 'reels',
          category: cat.id,
          hashtags: [cat.id, 'reels', 'audio'],
          caption: `${cat.emoji} ${cat.label}`,
          authorName: 'Reels',
          authorAvatar: 'https://i.pravatar.cc/150?u=reels_audio',
          musicTitle: 'Original Sound',
          likes: 200 + i * 47,
          views: 2000 + i * 311,
          commentsCount: 5 + i,
          sharesCount: 3 + i,
          savesCount: 10 + i,
          createdAt: new Date(Date.now() - i * 60_000),
        });
        added++;
      } catch (err: unknown) {
        const e = err as { code?: number };
        if (e.code !== 11000) console.warn(`[audio-seed] ${instagramId}:`, err);
      }
    }
  }

  if (added > 0) console.log(`[audio-seed] created ${added} audio clips`);
}
