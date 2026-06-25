import type { Video } from '@/types';

export function getPlayableUrl(video: Pick<Video, 'id' | 'url'>): string {
  if (video.url.includes('/api/media/')) return video.url;
  return `/api/media/${video.id}.mp4`;
}

export function toVideo(partial: Partial<Video> & { id: string; url: string }): Video {
  return {
    id: partial.id,
    instagramId: partial.instagramId ?? partial.id,
    url: partial.url,
    thumbnailUrl: partial.thumbnailUrl ?? '',
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

export function dedupeVideosByUrl(videos: Video[]): Video[] {
  const seen = new Set<string>();
  return videos.filter((v) => {
    if (seen.has(v.url)) return false;
    seen.add(v.url);
    return true;
  });
}
