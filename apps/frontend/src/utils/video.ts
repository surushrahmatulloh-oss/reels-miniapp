import type { Video } from '@/types';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/** Prefer direct CDN URL (audio clips) over media proxy */
export function getPlayableUrl(video: Pick<Video, 'id' | 'url'> & { playUrl?: string }): string {
  if (video.url?.startsWith('http')) return video.url;
  const path = video.playUrl ?? `/api/media/${video.id}.mp4`;
  if (path.startsWith('http')) return path;
  return API_URL ? `${API_URL}${path}` : path;
}

export function toVideo(partial: Partial<Video> & { id: string; playUrl?: string; url?: string }): Video {
  const directUrl = partial.url?.startsWith('http') ? partial.url : undefined;
  const playUrl = partial.playUrl ?? (directUrl ? directUrl : `/api/media/${partial.id}.mp4`);
  const url = directUrl ?? playUrl;
  return {
    id: partial.id,
    instagramId: partial.instagramId ?? partial.id,
    url,
    playUrl,
    thumbnailUrl: partial.thumbnailUrl ?? `https://picsum.photos/seed/reel${partial.id}/720/1280`,
    title: partial.title ?? partial.caption ?? '',
    format: partial.format ?? 'reels',
    category: partial.category ?? 'music',
    hashtags: partial.hashtags ?? [],
    caption: partial.caption ?? '',
    authorName: partial.authorName ?? '@user',
    authorAvatar: partial.authorAvatar ?? 'https://i.pravatar.cc/40',
    musicTitle: partial.musicTitle ?? '',
    hasAudio: partial.hasAudio,
    likes: partial.likes ?? 0,
    views: partial.views ?? 0,
    commentsCount: partial.commentsCount ?? 0,
    sharesCount: partial.sharesCount ?? 0,
    savesCount: partial.savesCount ?? 0,
    createdAt: partial.createdAt ?? new Date().toISOString(),
    isLiked: partial.isLiked ?? false,
    isSaved: partial.isSaved ?? false,
  };
}

export function dedupeVideosById(videos: Video[]): Video[] {
  const seen = new Set<string>();
  return videos.filter((v) => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}

export function dedupeVideosByUrl(videos: Video[]): Video[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const out: Video[] = [];

  for (const v of videos) {
    if (seenIds.has(v.id)) continue;
    const mediaUrl = getPlayableUrl(v);
    if (seenUrls.has(mediaUrl)) continue;

    const prev = out[out.length - 1];
    if (prev && getPlayableUrl(prev) === mediaUrl) continue;

    seenIds.add(v.id);
    seenUrls.add(mediaUrl);
    out.push(v);
  }

  return out;
}
