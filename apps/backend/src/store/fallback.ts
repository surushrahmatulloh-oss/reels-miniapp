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

/** Vertical MP4 clips with audio (Mixkit CDN — free, reliable). */
const REEL_SOURCES = [
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-running-above-the-camera-32808-large.mp4',
    caption: 'Ҷустуҷӯи шаҳр 🏃‍♀️',
    music: 'City Run — Trending',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-walking-among-the-skyscrapers-43300-large.mp4',
    caption: 'Манхэттен шаб 🌃',
    music: 'Night Walk — Viral',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-1232-large.mp4',
    caption: 'Неон ва музика 💜',
    music: 'Neon Dreams',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-11848-large.mp4',
    caption: 'Табиат ва оромиш 🌿',
    music: 'Nature Calm',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-waves-coming-to-the-beach-5016-large.mp4',
    caption: 'Сохили баҳр 🌊',
    music: 'Ocean Vibes',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-mother-with-her-little-daughter-eating-marshmallows-in-nature-39778-large.mp4',
    caption: 'Оила ва табиат 👨‍👩‍👧',
    music: 'Family Time',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-portrait-of-a-woman-in-a-pool-1259-large.mp4',
    caption: 'Тобистони гарм ☀️',
    music: 'Summer Hit',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-man-dancing-under-changing-lights-1240-large.mp4',
    caption: 'Рақс ва музика 🕺',
    music: 'Dance Floor',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-woman-having-a-video-call-42708-large.mp4',
    caption: 'Tech & lifestyle 📱',
    music: 'Digital Life',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-on-a-mountain-32806-large.mp4',
    caption: 'Йога дар кӯҳ ⛰️',
    music: 'Zen Flow',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-slow-motion-of-a-woman-holding-a-cocktail-42707-large.mp4',
    caption: 'Шаби зебо 🍹',
    music: 'Cocktail Hour',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-woman-typing-on-a-laptop-4472-large.mp4',
    caption: 'Кор ва илҳом 💻',
    music: 'Focus Mode',
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
