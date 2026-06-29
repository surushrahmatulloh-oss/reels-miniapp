import type { Request, Response } from 'express';
import { isFallbackMode } from '../store/fallback.js';

let seedRunning = false;
let lastSeedResult: Record<string, unknown> | null = null;
let lastSeedError: string | null = null;

export async function fetchVideosHandler(req: Request, res: Response): Promise<void> {
  if (isFallbackMode()) {
    res.status(400).json({
      error: 'MongoDB required',
      message: 'USE_MEMORY_DB=false ва MONGODB_URI зарур аст барои seed.',
    });
    return;
  }

  if (seedRunning) {
    res.status(202).json({
      ok: true,
      running: true,
      message: 'MP4 seed аллакай иҷро мешавад',
      lastResult: lastSeedResult,
    });
    return;
  }

  const wipeAll = req.body?.wipeAll !== false;
  const targetTotal = Number(req.body?.targetTotal ?? 2322);
  const perCategory = Number(req.body?.perCategory ?? Math.ceil(targetTotal / 18));

  seedRunning = true;
  lastSeedError = null;

  res.status(202).json({
    ok: true,
    running: true,
    wipeAll,
    targetTotal,
    perCategory,
    message: `MP4 seed оғоз шуд — wipe=${wipeAll}, target=${targetTotal}`,
  });

  const { seedMp4Videos } = await import('../services/mp4VideoSeed.service.js');
  void seedMp4Videos({ wipeAll, targetTotal, perCategory })
    .then((result) => {
      lastSeedResult = result;
      console.log('[mp4-seed] done', result);
    })
    .catch((err: Error) => {
      lastSeedError = err.message;
      console.error('[mp4-seed] failed', err);
    })
    .finally(() => {
      seedRunning = false;
    });
}

export function seedStatusHandler(_req: Request, res: Response): void {
  res.json({
    running: seedRunning,
    lastResult: lastSeedResult,
    lastError: lastSeedError,
  });
}
