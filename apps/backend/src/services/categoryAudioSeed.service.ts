import { Video } from '../models/Video.js';
import { APP_CATEGORIES } from '../data/categories.js';
import { getAudioUrlForCategory } from '../data/audioMp4Pool.js';
import { isDatabaseReady } from '../db.js';

/** Ensure each app category has at least one DB video with a known audio MP4 URL */
export async function ensureCategoryAudioClips(): Promise<void> {
  if (!isDatabaseReady()) return;

  for (const cat of APP_CATEGORIES) {
    const url = getAudioUrlForCategory(cat.id);
    if (!url) continue;

    const existing = await Video.findOne({
      url,
      category: cat.id,
      format: 'reels',
    }).lean();

    if (existing) continue;

    try {
      await Video.create({
        instagramId: `audio_${cat.id}_boost`,
        url,
        thumbnailUrl: `https://picsum.photos/seed/audio_${cat.id}/720/1280`,
        title: cat.label,
        format: 'reels',
        category: cat.id,
        hashtags: [cat.id, 'reels', 'audio'],
        caption: `${cat.emoji} ${cat.label} — бо садо`,
        authorName: 'Reels Audio',
        authorAvatar: 'https://i.pravatar.cc/150?u=reels_audio',
        musicTitle: 'Original Sound',
        likes: Math.floor(Math.random() * 500) + 50,
        views: Math.floor(Math.random() * 5000) + 100,
        commentsCount: 0,
        sharesCount: 0,
        savesCount: 0,
        createdAt: new Date(),
      });
      console.log(`[audio-seed] +${cat.id}`);
    } catch (err: unknown) {
      const e = err as { code?: number };
      if (e.code !== 11000) console.warn(`[audio-seed] ${cat.id}:`, err);
    }
  }
}
