import type { Request, Response } from 'express';
import { Video } from '../models/Video.js';
import { isFallbackMode, videos as memoryVideos } from '../store/fallback.js';
import { getParam } from '../utils/params.js';
import { isServerPlayableUrl } from '../data/workingMp4Pool.js';

export function mediaUrl(videoId: string): string {
  return `/api/media/${videoId}.mp4`;
}

function resolveSourceUrl(videoId: string): string | null {
  if (isFallbackMode()) {
    const url = memoryVideos.find((v) => v.id === videoId)?.url ?? null;
    return url ?? null;
  }
  return null;
}

export async function streamMedia(req: Request, res: Response): Promise<void> {
  const rawId = getParam(req, 'id') ?? '';
  const videoId = rawId.replace(/\.mp4$/i, '');

  let storedUrl = resolveSourceUrl(videoId);

  if (!storedUrl && !isFallbackMode()) {
    if (!/^[a-f0-9]{24}$/i.test(videoId)) {
      res.status(404).end();
      return;
    }
    const doc = await Video.findById(videoId).select('url').lean();
    storedUrl = doc?.url ?? null;
  }

  if (!storedUrl && !isFallbackMode()) {
    res.status(404).end();
    return;
  }

  const sourceUrl = storedUrl ?? '';
  if (!isServerPlayableUrl(sourceUrl)) {
    console.warn('[media] isServerPlayableUrl=false', {
      videoId,
      sourceUrl,
      mp4Regex: /\.mp4(\?|$)/i.test(sourceUrl),
    });
    res.status(404).json({ error: 'Invalid media url' });
    return;
  }

  // Prefer direct CDN redirect to avoid proxying large media through Render RAM/CPU.
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.redirect(302, sourceUrl);
}
