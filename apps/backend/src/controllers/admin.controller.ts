import type { Request, Response } from 'express';
import { seedMp4Videos } from '../services/mp4VideoSeed.service.js';
import { isFallbackMode } from '../store/fallback.js';

export async function fetchVideosHandler(_req: Request, res: Response): Promise<void> {
  if (isFallbackMode()) {
    res.status(400).json({
      error: 'MongoDB required',
      message: 'USE_MEMORY_DB=false ва MONGODB_URI зарур аст барои seed.',
    });
    return;
  }

  try {
    const result = await seedMp4Videos({ clearYoutube: false, perCategory: 80 });
    res.json({
      ok: true,
      added: result.added,
      updated: result.updated,
      skipped: result.skipped,
      total: result.total,
      mp4Total: result.mp4Total,
      byCategory: result.byCategory,
      message: `MP4: +${result.added} нав, ${result.updated} навсозӣ шуд (jamī: ${result.mp4Total} mp4)`,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
