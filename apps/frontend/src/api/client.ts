import axios from 'axios';
import type {
  AuthResponse,
  Comment,
  FeedResponse,
  User,
  Video,
  VideoFormat,
} from '@/types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export async function authTelegram(initData: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/telegram', { initData });
  return data;
}

export async function refreshAuthToken(): Promise<string> {
  const { data } = await api.post<{ token: string }>('/auth/refresh');
  return data.token;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<{ user: User }>('/users/me');
  return data.user;
}

export async function completeOnboarding(payload: {
  username?: string;
  bio?: string;
  avatarUrl?: string;
  formats: VideoFormat[];
  categories: string[];
}): Promise<User> {
  const { data } = await api.post<{ user: User }>('/users/onboarding', payload);
  return data.user;
}

export async function updatePreferences(payload: {
  formats: VideoFormat[];
  categories: string[];
  language?: string;
}): Promise<User> {
  const { data } = await api.put<{ success: boolean; user: User }>('/users/preferences', payload);
  return data.user;
}

export async function updateProfile(payload: Partial<User>): Promise<User> {
  const { data } = await api.put<{ user: User }>('/users/profile', payload);
  return data.user;
}

export async function getFeed(params: {
  cursor?: string;
  limit?: number;
  format?: VideoFormat;
}): Promise<FeedResponse> {
  const { data } = await api.get<FeedResponse>('/feed', { params });
  return data;
}

export async function markVideoViewed(videoId: string): Promise<void> {
  await api.post(`/feed/view/${videoId}`);
}

export async function likeVideo(videoId: string): Promise<{ liked: boolean; likeCount: number }> {
  const { data } = await api.post(`/videos/${videoId}/like`);
  return data;
}

export async function unlikeVideo(videoId: string): Promise<{ liked: boolean; likeCount: number }> {
  const { data } = await api.delete(`/videos/${videoId}/like`);
  return data;
}

export async function saveVideo(videoId: string): Promise<void> {
  await api.post(`/videos/${videoId}/save`);
}

export async function unsaveVideo(videoId: string): Promise<void> {
  await api.delete(`/videos/${videoId}/save`);
}

export async function shareVideo(videoId: string): Promise<{ shareUrl: string }> {
  const { data } = await api.post(`/videos/${videoId}/share`);
  return data;
}

export async function getComments(videoId: string): Promise<Comment[]> {
  const { data } = await api.get<{ comments: Comment[] }>(`/videos/${videoId}/comments`);
  return data.comments;
}

export async function addComment(videoId: string, text: string): Promise<Comment> {
  const { data } = await api.post<{ comment: Comment }>(`/videos/${videoId}/comments`, { text });
  return data.comment;
}

export async function getProfile(username: string): Promise<{
  user: User;
  isOwnProfile: boolean;
  isFollowing: boolean;
}> {
  const { data } = await api.get(`/users/${username}/profile`);
  return data;
}

export async function followUser(userId: string): Promise<void> {
  await api.post(`/users/${userId}/follow`);
}

export async function unfollowUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}/follow`);
}

export async function getSavedVideos(): Promise<Video[]> {
  const { data } = await api.get<{ videos: Video[] }>('/videos/saved/list');
  return data.videos;
}

export async function getLikedVideos(): Promise<Video[]> {
  const { data } = await api.get<{ videos: Video[] }>('/videos/liked/list');
  return data.videos;
}

export async function searchUsers(q: string) {
  const { data } = await api.get('/users/search', { params: { q } });
  return data.users as Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    followersCount: number;
  }>;
}

export async function searchVideos(q: string) {
  const { data } = await api.get('/search/videos', { params: { q } });
  return data.videos as Array<{
    id: string;
    thumbnailUrl: string;
    caption: string;
    category: string;
    likes: number;
  }>;
}
