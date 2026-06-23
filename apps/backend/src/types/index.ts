export type VideoFormat = 'reels' | 'igtv' | 'stories';

export interface JwtPayload {
  userId: string;
  telegramId: number;
  username: string;
  iat?: number;
  exp?: number;
}

export interface UserPreferences {
  formats: VideoFormat[];
  categories: string[];
  language?: string;
}

export interface AuthResponse {
  token: string;
  user: Record<string, unknown>;
  isNewUser: boolean;
}

export interface FeedResponse {
  videos: Record<string, unknown>[];
  nextCursor: string | null;
  hasMore: boolean;
}
