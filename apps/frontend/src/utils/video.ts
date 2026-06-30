import type { Video } from '@/types';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/** Always same-origin proxy — reliable in Telegram WebView */
export function getPlayableUrl(video: Pick<Video, 'id' | 'url'> & { playUrl?: string }): string {
  const path = video.playUrl ?? `/api/media/${video.id}.mp4`;
  if (path.startsWith('http')) return path;
  return API_URL ? `${API_URL}${path}` : path;
}

export function toVideo(partial: Partial<Video> & { id: string; playUrl?: string }): Video {
  const playUrl = partial.playUrl ?? `/api/media/${partial.id}.mp4`;
  return {
    id: partial.id,
    instagramId: partial.instagramId ?? partial.id,
    url: playUrl,
    playUrl,
    thumbnailUrl: partial.thumbnailUrl ?? `https://picsum.photos/seed/reel${partial.id}/720/1280`,
    format: partial.format ?? 'reels',
    category: partial.category ?? 'entertainment',
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
  return videos.filter((v) => {
    if (seenIds.has(v.id)) return false;
    const mediaUrl = v.id;
    if (seenUrls.has(mediaUrl)) return false;
    seenIds.add(v.id);
    seenUrls.add(mediaUrl);
    return true;
  });
}
