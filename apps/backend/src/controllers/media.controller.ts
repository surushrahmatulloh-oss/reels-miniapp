import type { Request, Response } from 'express';
import { Readable } from 'stream';
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

  try {
    const method = req.method === 'HEAD' ? 'HEAD' : 'GET';
    const headers: Record<string, string> = {
      'User-Agent':
        req.headers['user-agent']?.toString() ??
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: req.headers.accept?.toString() ?? 'video/*,*/*;q=0.9',
    };
    if (req.headers.range) headers.Range = String(req.headers.range);

    const upstream = await fetch(sourceUrl, {
      method,
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });

    if (!upstream.ok) {
      res.status(502).end();
      return;
    }

    const status = req.headers.range ? 206 : upstream.status === 206 ? 206 : 200;
    res.status(status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'video/mp4');
    res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') ?? 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Disposition', 'inline');

    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (method === 'HEAD') {
      res.end();
      return;
    }

    if (!upstream.body) {
      res.status(502).end();
      return;
    }

    const stream = Readable.fromWeb(upstream.body as import('stream/web').ReadableStream);
    req.on('close', () => {
      stream.destroy();
    });
    stream.on('error', () => {
      if (!res.headersSent) res.status(502).end();
      else res.destroy();
    });
    stream.pipe(res);
  } catch {
    if (!res.headersSent) res.status(502).end();
  }
}
