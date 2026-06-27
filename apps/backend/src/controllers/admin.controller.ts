import type { Request, Response } from 'express';
import { fetchYouTubeVideos } from '../services/youtube.service.js';
import { isFallbackMode } from '../store/fallback.js';

export async function fetchVideosHandler(_req: Request, res: Response): Promise<void> {
  if (isFallbackMode()) {
    res.status(400).json({
      error: 'MongoDB required',
      message: 'USE_MEMORY_DB=false ва MONGODB_URI зарур аст барои import.',
    });
    return;
  }

  try {
    const added = await fetchYouTubeVideos();
    res.json({ ok: true, added, message: `Илова шуд: ${added} видё` });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
