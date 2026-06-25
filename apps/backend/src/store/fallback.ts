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

const CATEGORIES = [
  'music', 'sport', 'nature', 'food', 'travel', 'fashion',
  'technology', 'animation', 'entertainment', 'education', 'business', 'science',
] as const;

/** Ҳар видё URL-и уникалӣ дорад — такрор намешавад */
const REEL_POOL: Array<{
  url: string;
  caption: string;
  music: string;
  category: (typeof CATEGORIES)[number];
  hashtags: string[];
}> = [
  { url: 'https://download.samplelib.com/mp4/sample-5s.mp4', caption: 'Мусиқии тренд 🔥', music: 'Trending Beat', category: 'music', hashtags: ['music', 'trend', 'reels', 'viral'] },
  { url: 'https://download.samplelib.com/mp4/sample-10s.mp4', caption: 'Варзиш ва энергия ⚽', music: 'Sport Vibes', category: 'sport', hashtags: ['sport', 'fitness', 'reels'] },
  { url: 'https://download.samplelib.com/mp4/sample-15s.mp4', caption: 'Табиати зебо 🌿', music: 'Nature Sounds', category: 'nature', hashtags: ['nature', 'travel', 'fyp'] },
  { url: 'https://download.samplelib.com/mp4/sample-20s.mp4', caption: 'Ошпазии модерн 🍳', music: 'Kitchen Beats', category: 'food', hashtags: ['food', 'cooking', 'reels'] },
  { url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', caption: 'Гулҳои баҳор 🌸', music: 'Soft Piano', category: 'nature', hashtags: ['flowers', 'nature', 'aesthetic'] },
  { url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4', caption: 'Ҷумъа муборак 🎵', music: 'Friday Mood', category: 'music', hashtags: ['music', 'friday', 'vibes'] },
  { url: 'https://www.w3schools.com/html/mov_bbb.mp4', caption: 'Анимацияи зебо 🎬', music: 'Fun Mix', category: 'animation', hashtags: ['animation', 'cute', 'reels'] },
  { url: 'https://filesamples.com/samples/video/mp4/sample_640x360.mp4', caption: 'Технологияи нав 💻', music: 'Tech Wave', category: 'technology', hashtags: ['tech', 'gadgets', 'reels'] },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', caption: 'Сафари ҷолиб ✈️', music: 'Travel Dreams', category: 'travel', hashtags: ['travel', 'adventure', 'explore'] },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', caption: 'Мода ва услуб 👗', music: 'Fashion Week', category: 'fashion', hashtags: ['fashion', 'style', 'ootd'] },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', caption: 'Хушмазагӣ ва кӯҳна 🎭', music: 'Party Mix', category: 'entertainment', hashtags: ['fun', 'party', 'viral'] },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', caption: 'Таълим ва илм 📚', music: 'Study Lo-Fi', category: 'education', hashtags: ['education', 'learn', 'tips'] },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', caption: 'Тиҷорат ва муваффақият 💼', music: 'Hustle Mode', category: 'business', hashtags: ['business', 'money', 'motivation'] },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', caption: 'Reels эстетик 🎥', music: 'Dreamy', category: 'entertainment', hashtags: ['aesthetic', 'reels', 'fyp'] },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', caption: 'Контенти вирусӣ 🐰', music: 'Viral Sound', category: 'animation', hashtags: ['viral', 'fyp', 'reels'] },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', caption: 'Машина ва роҳ 🚗', music: 'Drive', category: 'travel', hashtags: ['cars', 'drive', 'travel'] },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', caption: 'Кино ва эффект 🎞️', music: 'Cinematic', category: 'entertainment', hashtags: ['cinema', 'movie', 'reels'] },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', caption: 'Бозӣ ва варзиш 🏀', music: 'Game On', category: 'sport', hashtags: ['sport', 'game', 'reels'] },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', caption: 'Шаби шаҳр 🌃', music: 'Night City', category: 'travel', hashtags: ['city', 'night', 'vibes'] },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4', caption: 'Лайфхакҳо 💡', music: 'Tips & Tricks', category: 'education', hashtags: ['tips', 'lifehack', 'reels'] },
  { url: 'https://filesamples.com/samples/video/mp4/sample_960x540.mp4', caption: 'Илм ва кашфиёт 🔬', music: 'Discovery', category: 'science', hashtags: ['science', 'facts', 'reels'] },
  { url: 'https://filesamples.com/samples/video/mp4/sample_1280x720.mp4', caption: 'Рақс ва ҳаракат 💃', music: 'Dance Hit', category: 'music', hashtags: ['dance', 'music', 'viral'] },
  { url: 'https://filesamples.com/samples/video/mp4/sample_1920x1080.mp4', caption: 'Китобҳои беҳтарин 📖', music: 'Book Club', category: 'education', hashtags: ['books', 'read', 'education'] },
];

// URL-ҳои такрориро хориҷ мекунем
const seenUrls = new Set<string>();
const uniquePool = REEL_POOL.filter((item) => {
  if (seenUrls.has(item.url)) return false;
  seenUrls.add(item.url);
  return true;
});

export const videos: MemoryVideo[] = uniquePool.map((item, idx) => ({
  id: `vid_${idx + 1}`,
  instagramId: `ig_${idx + 1}`,
  url: item.url,
  thumbnailUrl: `https://picsum.photos/seed/reel${idx + 1}/405/720`,
  format: 'reels' as VideoFormat,
  category: item.category,
  hashtags: item.hashtags,
  caption: `${item.caption} #${item.category}`,
  authorName: `@creator_${(idx % 16) + 1}`,
  authorAvatar: `https://i.pravatar.cc/150?u=creator${idx % 16}`,
  musicTitle: item.music,
  likes: 2400 + idx * 137,
  views: 22000 + idx * 503,
  commentsCount: 55 + idx * 7,
  sharesCount: 22 + idx * 3,
  savesCount: 88 + idx * 5,
  createdAt: new Date(Date.now() - idx * 3600000),
}));

export function getVideoById(videoId: string): MemoryVideo | undefined {
  return videos.find((v) => v.id === videoId);
}

let useFallback = false;

export function enableFallback(): void {
  useFallback = true;
  console.log(`Using in-memory storage — ${videos.length} unique reels`);
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

export function dedupeByUrl(list: MemoryVideo[]): MemoryVideo[] {
  const seen = new Set<string>();
  return list.filter((v) => {
    if (seen.has(v.url)) return false;
    seen.add(v.url);
    return true;
  });
}

export function shuffleVideos<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
