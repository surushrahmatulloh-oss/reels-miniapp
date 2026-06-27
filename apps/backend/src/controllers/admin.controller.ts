import type { Request, Response } from 'express';
import { seedSampleVideos } from '../services/sampleVideoSeed.service.js';
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
    const result = await seedSampleVideos();
    res.json({
      ok: true,
      added: result.added,
      total: result.total,
      byCategory: result.byCategory,
      message: `Илова шуд: ${result.added} видё (jamī: ${result.total})`,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
