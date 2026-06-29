import type { Video } from '@/types';

export function getPlayableUrl(video: Pick<Video, 'id' | 'url'> & { playUrl?: string }): string {
  if (video.playUrl) return video.playUrl;
  const url = video.url ?? '';
  if (url.includes('/api/media/')) return url;
  if (/\.mp4(\?|$)/i.test(url) || /videos\.pexels\.com|pixabay|commondatastorage/i.test(url)) {
    return `/api/media/${video.id}.mp4`;
  }
  return `/api/media/${video.id}.mp4`;
}

export function toVideo(partial: Partial<Video> & { id: string; playUrl?: string }): Video {
  const playUrl = partial.playUrl ?? `/api/media/${partial.id}.mp4`;
  const url = partial.url && !/youtube\.com\/embed/i.test(partial.url)
    ? partial.url
    : playUrl;
  return {
    id: partial.id,
    instagramId: partial.instagramId ?? partial.id,
    url,
    playUrl,
    thumbnailUrl: partial.thumbnailUrl ?? `https://picsum.photos/seed/reel${partial.id}/720/1280`,
    format: partial.format ?? 'reels',
    category: partial.category ?? 'entertainment',
    hashtags: partial.hashtags ?? [],
    caption: partial.caption ?? '',
    authorName: partial.authorName ?? '@user',
    authorAvatar: partial.authorAvatar ?? 'https://i.pravatar.cc/40',
    musicTitle: partial.musicTitle ?? '',
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

/** @deprecated use dedupeVideosById */
export function dedupeVideosByUrl(videos: Video[]): Video[] {
  return dedupeVideosById(videos);
}
