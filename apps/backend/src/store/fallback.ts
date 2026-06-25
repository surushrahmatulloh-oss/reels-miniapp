import type { VideoFormat } from '../types/index.js';

export interface MemoryUser {
  id: string;
  telegramId: number;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  preferences: {
    formats: VideoFormat[];
    categories: string[];
    language: string;
  };
  followersCount: number;
  followingCount: number;
  isPrivate: boolean;
  onboardingCompleted: boolean;
  createdAt: Date;
}

export interface MemoryVideo {
  id: string;
  instagramId: string;
  url: string;
  thumbnailUrl: string;
  format: VideoFormat;
  category: string;
  hashtags: string[];
  caption: string;
  authorName: string;
  authorAvatar: string;
  musicTitle: string;
  likes: number;
  views: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  createdAt: Date;
}

export const users = new Map<string, MemoryUser>();
export const likes = new Set<string>();
export const saves = new Set<string>();
export const views = new Set<string>();
export const comments = new Map<string, Array<{
  id: string;
  videoId: string;
  text: string;
  likes: number;
  createdAt: Date;
  user: { id: string; username: string; avatarUrl: string; displayName: string };
}>>();

/** MP4 — CDN-ҳои коркунанда (403 нест) */
const REEL_SOURCES = [
  {
    url: 'https://download.samplelib.com/mp4/sample-5s.mp4',
    caption: 'Reels #1 🔥',
    music: 'Trending Beat',
  },
  {
    url: 'https://download.samplelib.com/mp4/sample-10s.mp4',
    caption: 'Reels #2 ✨',
    music: 'Viral Sound',
  },
  {
    url: 'https://download.samplelib.com/mp4/sample-15s.mp4',
    caption: 'Reels #3 🎬',
    music: 'Fun Mix',
  },
  {
    url: 'https://download.samplelib.com/mp4/sample-20s.mp4',
    caption: 'Reels #4 🎢',
    music: 'Energy',
  },
  {
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    caption: 'Reels #5 🌸',
    music: 'Nature',
  },
  {
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    caption: 'Reels #6 🎵',
    music: 'Friday',
  },
  {
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    caption: 'Reels #7 🐰',
    music: 'Classic',
  },
  {
    url: 'https://filesamples.com/samples/video/mp4/sample_640x360.mp4',
    caption: 'Reels #8 📱',
    music: 'HD Clip',
  },
];

const CATEGORIES = [
  'music', 'sport', 'nature', 'food', 'travel', 'fashion',
  'technology', 'animation', 'entertainment', 'education', 'business', 'science',
];

export const videos: MemoryVideo[] = REEL_SOURCES.flatMap((source, i) =>
  CATEGORIES.map((category, j) => {
    const idx = i * CATEGORIES.length + j;
    return {
      id: `vid_${idx + 1}`,
      instagramId: `ig_${idx + 1}`,
      url: source.url,
      thumbnailUrl: `https://picsum.photos/seed/reel${idx}/405/720`,
      format: 'reels' as VideoFormat,
      category,
      hashtags: [category, 'reels', 'viral', 'fyp'],
      caption: `${source.caption} #${category}`,
      authorName: `@creator_${(idx % 12) + 1}`,
      authorAvatar: `https://i.pravatar.cc/150?u=creator${idx % 12}`,
      musicTitle: source.music,
      likes: 1200 + idx * 89,
      views: 15000 + idx * 421,
      commentsCount: 40 + idx * 5,
      sharesCount: 15 + idx * 2,
      savesCount: 60 + idx * 3,
      createdAt: new Date(Date.now() - idx * 1800000),
    };
  }),
);

let useFallback = false;

export function enableFallback(): void {
  useFallback = true;
  console.log('Using in-memory storage (no MongoDB needed)');
}

export function isFallbackMode(): boolean {
  return useFallback;
}

export function key(userId: string, videoId: string): string {
  return `${userId}:${videoId}`;
}

export function clearUserViews(userId: string): void {
  for (const k of views) {
    if (k.startsWith(`${userId}:`)) views.delete(k);
  }
}
