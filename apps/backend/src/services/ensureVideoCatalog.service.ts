import { Video } from '../models/Video.js';
import { config } from '../config.js';
import { isDatabaseReady } from '../db.js';
import { CATEGORY_IDS } from '../data/categories.js';
import { ensureMinimumVideos } from './ensureMinimumVideos.service.js';

const MP4_URL_FILTER = {
  $not: { $regex: /youtube\.com\/embed|youtu\.be/i },
};

const TARGET_TOTAL = 2000;
let catalogSeedRunning = false;

export async function countReelsVideos(): Promise<number> {
  if (!isDatabaseReady()) return 0;
  return Video.countDocuments({ format: 'reels', url: MP4_URL_FILTER });
}

/** Fill catalog to at least TARGET_TOTAL videos (background Pexels seed when API key set). */
export async function ensureVideoCatalog(minTotal = TARGET_TOTAL): Promise<void> {
  if (!isDatabaseReady()) {
    console.warn('[catalog] MongoDB not ready — skip seed');
    return;
  }

  const count = await countReelsVideos();
  if (count >= minTotal) {
    console.log(`[catalog] ${count} reels videos — OK`);
    return;
  }

  console.log(`[catalog] only ${count} videos, target ${minTotal}`);

  const hasExternalApi = Boolean(config.pexelsApiKey || config.pixabayApiKey);

  if (hasExternalApi) {
    if (catalogSeedRunning) {
      console.log('[catalog] Pexels/Pixabay seed already running');
      return;
    }
    catalogSeedRunning = true;
    const perCategory = Math.ceil(minTotal / CATEGORY_IDS.length);
    const { seedMp4Videos } = await import('./mp4VideoSeed.service.js');
    void seedMp4Videos({ wipeAll: false, targetTotal: minTotal, perCategory })
      .then((result) => console.log('[catalog] mp4 seed done', result))
      .catch((err) => console.error('[catalog] mp4 seed failed', err))
      .finally(() => {
        catalogSeedRunning = false;
      });
    return;
  }

  console.warn('[catalog] no PEXELS_API_KEY — filling with GCS sample clips (background)');
  void ensureMinimumVideos(minTotal)
    .then(() => console.log('[catalog] minseed done'))
    .catch((err) => console.error('[catalog] minseed failed', err));
}
