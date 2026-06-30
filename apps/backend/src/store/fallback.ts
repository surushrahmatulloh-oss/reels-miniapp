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
  'music', 'sport', 'football', 'nature', 'food', 'travel', 'fashion',
  'technology', 'animation', 'entertainment', 'education', 'business', 'science',
] as const;

const GCS = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';

/** URL-ҳои санҷидашуда — аз Render кор мекунанд */
const VIDEO_SOURCES: Array<{ url: string; category: (typeof CATEGORIES)[number] }> = [
  { url: `${GCS}/ForBiggerBlazes.mp4`, category: 'entertainment' },
  { url: `${GCS}/ForBiggerEscapes.mp4`, category: 'travel' },
  { url: `${GCS}/ForBiggerFun.mp4`, category: 'entertainment' },
  { url: `${GCS}/ForBiggerJoyrides.mp4`, category: 'sport' },
  { url: `${GCS}/ForBiggerJoyrides.mp4`, category: 'football' },
  { url: `${GCS}/ForBiggerMeltdowns.mp4`, category: 'music' },
  { url: `${GCS}/Sintel.mp4`, category: 'animation' },
  { url: `${GCS}/BigBuckBunny.mp4`, category: 'animation' },
  { url: `${GCS}/ElephantsDream.mp4`, category: 'animation' },
  { url: `${GCS}/SubaruOutbackOnStreetAndDirt.mp4`, category: 'travel' },
  { url: `${GCS}/TearsOfSteel.mp4`, category: 'science' },
  { url: `${GCS}/VolkswagenGTIReview.mp4`, category: 'technology' },
  { url: `${GCS}/WeAreGoingOnBullrun.mp4`, category: 'travel' },
  { url: `${GCS}/WhatCarCanYouGetForAGrand.mp4`, category: 'business' },
  { url: `${GCS}/Bears.mp4`, category: 'nature' },
  { url: `${GCS}/ChromebookPrize.mp4`, category: 'technology' },
  { url: 'https://download.samplelib.com/mp4/sample-5s.mp4', category: 'music' },
  { url: 'https://download.samplelib.com/mp4/sample-10s.mp4', category: 'sport' },
  { url: 'https://download.samplelib.com/mp4/sample-15s.mp4', category: 'nature' },
  { url: 'https://download.samplelib.com/mp4/sample-20s.mp4', category: 'food' },
  { url: 'https://download.samplelib.com/mp4/sample-30s.mp4', category: 'fashion' },
  { url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', category: 'nature' },
  { url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4', category: 'music' },
  { url: 'https://filesamples.com/samples/video/mp4/sample_640x360.mp4', category: 'education' },
  { url: 'https://filesamples.com/samples/video/mp4/sample_960x540.mp4', category: 'food' },
  { url: 'https://filesamples.com/samples/video/mp4/sample_1280x720.mp4', category: 'fashion' },
  { url: 'https://filesamples.com/samples/video/mp4/sample_1920x1080.mp4', category: 'entertainment' },
  { url: 'https://filesamples.com/samples/video/mp4/sample_960x400_ocean_with_audio.mp4', category: 'travel' },
];

const CAPTIONS: Record<string, string[]> = {
  music: ['🔥 Trending sound', '🎵 Мусиқии нав', '💿 Хитҳои имрӯза', '🎤 Reels мусиқӣ'],
  sport: ['⚽ Goals only', '💪 Fitness vibes', '🏃 Workout mode', '🔥 Sport energy'],
  football: ['⚽ Футбол', '🥅 Голҳои зебо', '🏆 Match day', '🔥 Football vibes'],
  nature: ['🌿 Табиати зебо', '🌸 Bahor vibes', '🏔️ Travel mood', '🌊 Ocean calm'],
  food: ['🍳 Recipe reel', '😋 Food porn', '👨‍🍳 Quick cook', '🍕 Yummy content'],
  travel: ['✈️ Wanderlust', '🌍 Explore more', '📍 Hidden gems', '🛫 Travel diary'],
  fashion: ['👗 OOTD', '✨ Style inspo', '💄 Beauty reel', '👠 Fashion week'],
  technology: ['📱 Tech review', '💻 Gadget life', '🤖 AI trends', '⚡ New tech'],
  animation: ['🎬 Animation reel', '🐰 Cute vibes', '✨ 3D art', '🎨 Creative'],
  entertainment: ['😂 Viral moment', '🎭 Fun content', '🔥 FYP material', '⭐ Must watch'],
  education: ['📚 Learn fast', '💡 Life hack', '🧠 Smart tips', '📖 Study reel'],
  business: ['💼 Business tips', '📈 Growth hack', '🚀 Startup life', '💰 Money moves'],
  science: ['🔬 Science facts', '🌌 Space vibes', '🧪 Experiment', '⚗️ Discovery'],
};

const MUSIC = [
  'Original Sound', 'Trending Beat', 'Viral Audio', 'Reels Mix',
  'Night Vibes', 'Summer Hit', 'Lo-Fi Study', 'Dance Floor',
];

const CREATOR_NAMES = [
  '@dilnoza_reels', '@tajik_creator', '@reels_tj', '@viral_dushanbe',
  '@music_hub_tj', '@sport_life_tj', '@foodie_tj', '@travel_tj',
  '@fashion_tj', '@tech_tj', '@fun_clips_tj', '@learn_fast_tj',
  '@nature_lover', '@dance_tj', '@comedy_tj', '@aesthetic_tj',
  '@daily_reels', '@trend_watch', '@clip_master', '@reels_pro',
];

function buildCatalog(): MemoryVideo[] {
  const seenKeys = new Set<string>();
  const list: MemoryVideo[] = [];

  for (const src of VIDEO_SOURCES) {
    const dedupeKey = `${src.url}:${src.category}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    const idx = list.length;
    const cat = src.category;
    const captions = CAPTIONS[cat] ?? CAPTIONS.entertainment!;
    const caption = captions[idx % captions.length]!;
    const creator = CREATOR_NAMES[idx % CREATOR_NAMES.length]!;
    const id = `vid_${idx + 1}`;

    list.push({
      id,
      instagramId: `ig_${idx + 1}`,
      url: src.url,
      thumbnailUrl: `https://picsum.photos/seed/reel${id}/720/1280`,
      format: 'reels',
      category: cat,
      hashtags: [cat, 'reels', 'fyp', 'viral', 'tajikistan'],
      caption: `${caption} #${cat} #reels #fyp`,
      authorName: creator,
      authorAvatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(creator)}`,
      musicTitle: MUSIC[idx % MUSIC.length]!,
      likes: 1200 + idx * 89 + ((idx * 17) % 500),
      views: 8000 + idx * 311 + ((idx * 23) % 2000),
      commentsCount: 30 + idx * 4,
      sharesCount: 15 + idx * 2,
      savesCount: 40 + idx * 3,
      createdAt: new Date(Date.now() - idx * 1800000),
    });
  }

  return list;
}

export const videos: MemoryVideo[] = buildCatalog();

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
