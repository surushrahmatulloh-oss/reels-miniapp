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
  playUrl?: string;
  thumbnailUrl: string;
  title?: string;
  format: VideoFormat;
  category: string;
  hashtags: string[];
  caption: string;
  title?: string;
  authorName: string;
  authorAvatar: string;
  musicTitle: string;
  hasAudio?: boolean;
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
  isLiked?: boolean;
  parentId?: string | null;
  replies?: Comment[];
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
  { id: 'cars', label: 'Автомобилҳо', emoji: '🚗' },
  { id: 'sport', label: 'Варзиш', emoji: '🏃' },
  { id: 'football', label: 'Футбол', emoji: '⚽' },
  { id: 'music', label: 'Мусиқӣ', emoji: '🎵' },
  { id: 'cinema', label: 'Кино', emoji: '🎬' },
  { id: 'tech', label: 'Технология', emoji: '💻' },
  { id: 'gaming', label: 'Бозиҳо', emoji: '🎮' },
  { id: 'comedy', label: 'Ҳаҷв', emoji: '😂' },
  { id: 'news', label: 'Хабарҳо', emoji: '📰' },
  { id: 'nature', label: 'Табиат', emoji: '🌿' },
  { id: 'travel', label: 'Сафар', emoji: '✈️' },
  { id: 'cooking', label: 'Ошпазӣ', emoji: '👨‍🍳' },
] as const;

export const FORMATS = [
  { id: 'reels' as const, label: 'Reels', desc: 'Вертикал, то 90 сония' },
  { id: 'igtv' as const, label: 'IGTV', desc: 'Видёи дароз, то 60 дакика' },
  { id: 'stories' as const, label: 'Stories', desc: '15 сония, ифодаи рузмарра' },
];
