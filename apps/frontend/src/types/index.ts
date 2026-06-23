export type VideoFormat = 'reels' | 'igtv' | 'stories';

export interface UserPreferences {
  formats: VideoFormat[];
  categories: string[];
  language: string;
}

export interface User {
  id: string;
  telegramId: number;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  preferences: UserPreferences;
  followersCount: number;
  followingCount: number;
  isPrivate: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface Video {
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
  createdAt: string;
  isLiked: boolean;
  isSaved: boolean;
}

export interface Comment {
  id: string;
  text: string;
  likes: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string;
    displayName: string;
  } | null;
}

export interface AuthResponse {
  token: string;
  user: User;
  isNewUser: boolean;
}

export interface FeedResponse {
  videos: Video[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const CATEGORIES = [
  { id: 'music', label: 'Мусики', emoji: '🎵' },
  { id: 'sport', label: 'Варзиш', emoji: '⚽' },
  { id: 'nature', label: 'Табиат', emoji: '🌿' },
  { id: 'food', label: 'Ошпази', emoji: '🍳' },
  { id: 'travel', label: 'Сафар', emoji: '✈️' },
  { id: 'fashion', label: 'Мода', emoji: '👗' },
  { id: 'technology', label: 'Технология', emoji: '💻' },
  { id: 'animation', label: 'Анимация', emoji: '🎬' },
  { id: 'entertainment', label: 'Хушмазаги', emoji: '🎭' },
  { id: 'education', label: 'Таълим', emoji: '📚' },
  { id: 'business', label: 'Тиджорат', emoji: '💼' },
  { id: 'science', label: 'Илм', emoji: '🔬' },
] as const;

export const FORMATS = [
  { id: 'reels' as const, label: 'Reels', desc: 'Вертикал, то 90 сония' },
  { id: 'igtv' as const, label: 'IGTV', desc: 'Видёи дароз, то 60 дакика' },
  { id: 'stories' as const, label: 'Stories', desc: '15 сония, ифодаи рузмарра' },
];
