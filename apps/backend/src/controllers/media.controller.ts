import type { Request, Response } from 'express';
import { Readable } from 'stream';
import { Video } from '../models/Video.js';
import { isFallbackMode, videos as memoryVideos } from '../store/fallback.js';
import { getParam } from '../utils/params.js';
import { isPlayableMp4Url } from '../services/pexelsVideo.service.js';

export function mediaUrl(videoId: string): string {
  return `/api/media/${videoId}.mp4`;
}

function resolveSourceUrl(videoId: string): string | null {
  if (isFallbackMode()) {
    return memoryVideos.find((v) => v.id === videoId)?.url ?? null;
  }
  return null;
}

export async function streamMedia(req: Request, res: Response): Promise<void> {
  const rawId = getParam(req, 'id') ?? '';
  const videoId = rawId.replace(/\.mp4$/i, '');

  let sourceUrl = resolveSourceUrl(videoId);

  if (!sourceUrl && !isFallbackMode()) {
    if (!/^[a-f0-9]{24}$/i.test(videoId)) {
      res.status(404).end();
      return;
    }
    const doc = await Video.findById(videoId).select('url').lean();
    sourceUrl = doc?.url ?? null;
  }

  if (!sourceUrl) {
    res.status(404).end();
    return;
  }

  if (/youtube\.com\/embed|youtu\.be/i.test(sourceUrl)) {
    res.status(410).json({ error: 'YouTube embed not supported — use MP4' });
    return;
  }

  if (!isPlayableMp4Url(sourceUrl)) {
    res.status(415).json({ error: 'Not a playable MP4 URL' });
    return;
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; ReelsMiniApp/1.0)',
    };
    if (req.headers.range) headers.Range = String(req.headers.range);

    const upstream = await fetch(sourceUrl, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });

    if (!upstream.ok || !upstream.body) {
      res.status(502).end();
      return;
    }

    res.status(upstream.status === 206 ? 206 : 200);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    Readable.fromWeb(upstream.body as import('stream/web').ReadableStream).pipe(res);
  } catch {
    if (!res.headersSent) res.status(502).end();
  }
}
