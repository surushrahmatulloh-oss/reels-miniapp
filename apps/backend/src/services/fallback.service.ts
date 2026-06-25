import type { VideoFormat } from '../types/index.js';
import type { TelegramUser } from './auth.service.js';
import { signToken, verifyToken } from './auth.service.js';
import {
  users,
  videos,
  likes,
  saves,
  views,
  comments,
  key,
  clearUserViews,
  dedupeByUrl,
  shuffleVideos,
  getVideoById,
  type MemoryUser,
  type MemoryVideo,
} from '../store/fallback.js';
import { savePersistedStore } from '../persist.js';

function serializeMemoryUser(user: MemoryUser) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    preferences: user.preferences,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    isPrivate: user.isPrivate,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt,
  };
}

export function fallbackTelegramAuth(initData: string, tgUser: TelegramUser) {
  let user = [...users.values()].find((u) => u.telegramId === tgUser.id);
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const username = tgUser.username ?? `user_${tgUser.id}`.slice(0, 32);
    const id = `user_${tgUser.id}`;
    user = {
      id,
      telegramId: tgUser.id,
      username,
      displayName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || username,
      bio: '',
      avatarUrl: tgUser.photo_url ?? '',
      preferences: { formats: ['reels'], categories: [], language: 'tg' },
      followersCount: 0,
      followingCount: 0,
      isPrivate: false,
      onboardingCompleted: false,
      createdAt: new Date(),
    };
    users.set(id, user);
    savePersistedStore();
  }

  const token = signToken({
    userId: user.id,
    telegramId: user.telegramId,
    username: user.username,
  });

  return { token, user: serializeMemoryUser(user), isNewUser };
}

export function fallbackRefreshToken(token: string) {
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = users.get(payload.userId);
  if (!user) return null;
  return signToken({
    userId: user.id,
    telegramId: user.telegramId,
    username: user.username,
  });
}

export function fallbackGetMe(userId: string) {
  const user = users.get(userId);
  return user ? serializeMemoryUser(user) : null;
}

export function fallbackCompleteOnboarding(
  userId: string,
  data: {
    username?: string;
    bio?: string;
    avatarUrl?: string;
    formats: VideoFormat[];
    categories: string[];
  },
) {
  const user = users.get(userId);
  if (!user) return null;
  if (data.username) user.username = data.username;
  if (data.bio !== undefined) user.bio = data.bio;
  if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
  user.preferences.formats = data.formats;
  user.preferences.categories = data.categories;
  user.onboardingCompleted = true;
  users.set(userId, user);
  savePersistedStore();
  return serializeMemoryUser(user);
}

export function fallbackUpdateProfile(
  userId: string,
  data: Partial<{ displayName: string; bio: string; isPrivate: boolean; username: string }>,
) {
  const user = users.get(userId);
  if (!user) return null;
  Object.assign(user, data);
  users.set(userId, user);
  savePersistedStore();
  return serializeMemoryUser(user);
}

export function fallbackUpdatePreferences(
  userId: string,
  data: { formats: VideoFormat[]; categories: string[]; language?: string },
) {
  const user = users.get(userId);
  if (!user) return null;
  user.preferences.formats = data.formats;
  user.preferences.categories = data.categories;
  if (data.language) user.preferences.language = data.language;
  user.onboardingCompleted = true;
  users.set(userId, user);
  savePersistedStore();
  return serializeMemoryUser(user);
}

function enrichVideo(v: MemoryVideo, userId: string) {
  return {
    id: v.id,
    instagramId: v.instagramId,
    url: v.url,
    thumbnailUrl: v.thumbnailUrl,
    format: v.format,
    category: v.category,
    hashtags: v.hashtags,
    caption: v.caption,
    authorName: v.authorName,
    authorAvatar: v.authorAvatar,
    musicTitle: v.musicTitle,
    likes: v.likes,
    views: v.views,
    commentsCount: v.commentsCount,
    sharesCount: v.sharesCount,
    savesCount: v.savesCount,
    createdAt: v.createdAt.toISOString(),
    isLiked: likes.has(key(userId, v.id)),
    isSaved: saves.has(key(userId, v.id)),
  };
}

function matchesQuery(v: MemoryVideo, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    v.caption.toLowerCase().includes(lower) ||
    v.category.toLowerCase().includes(lower) ||
    v.authorName.toLowerCase().includes(lower) ||
    v.musicTitle.toLowerCase().includes(lower) ||
    v.hashtags.some((h) => h.toLowerCase().includes(lower))
  );
}

export function fallbackGetFeed(userId: string, limit = 10, cursor?: string) {
  const user = users.get(userId);
  const preferred = user?.preferences.categories ?? [];
  let list = dedupeByUrl([...videos]);

  if (preferred.length > 0) {
    const preferredVideos = list.filter((v) => preferred.includes(v.category));
    const otherVideos = list.filter((v) => !preferred.includes(v.category));
    list = [...preferredVideos, ...otherVideos];
  }

  list = list.filter((v) => !views.has(key(userId, v.id)));

  if (list.length < limit) {
    clearUserViews(userId);
    list = dedupeByUrl([...videos]);
    if (preferred.length > 0) {
      const preferredVideos = list.filter((v) => preferred.includes(v.category));
      const otherVideos = list.filter((v) => !preferred.includes(v.category));
      list = [...preferredVideos, ...otherVideos];
    }
  }

  list = shuffleVideos(list);

  if (cursor) {
    const idx = list.findIndex((v) => v.id === cursor);
    if (idx >= 0) list = list.slice(idx + 1);
  }

  const page = list.slice(0, limit);
  const enriched = page.map((v) => enrichVideo(v, userId));

  return {
    videos: enriched,
    nextCursor: page.length > 0 ? page[page.length - 1]!.id : null,
    hasMore: list.length > limit,
  };
}

export function fallbackMarkViewed(userId: string, videoId: string) {
  views.add(key(userId, videoId));
}

export function fallbackLike(userId: string, videoId: string) {
  const k = key(userId, videoId);
  const video = videos.find((v) => v.id === videoId);
  if (!video) return null;
  if (!likes.has(k)) {
    likes.add(k);
    video.likes += 1;
    savePersistedStore();
  }
  return { liked: true, likeCount: video.likes };
}

export function fallbackUnlike(userId: string, videoId: string) {
  const k = key(userId, videoId);
  const video = videos.find((v) => v.id === videoId);
  if (!video) return null;
  if (likes.has(k)) {
    likes.delete(k);
    video.likes -= 1;
    savePersistedStore();
  }
  return { liked: false, likeCount: video.likes };
}

export function fallbackSave(userId: string, videoId: string) {
  saves.add(key(userId, videoId));
  const video = videos.find((v) => v.id === videoId);
  if (video) video.savesCount += 1;
  savePersistedStore();
  return { saved: true };
}

export function fallbackUnsave(userId: string, videoId: string) {
  saves.delete(key(userId, videoId));
  savePersistedStore();
  return { saved: false };
}

export function fallbackShare(videoId: string) {
  const video = videos.find((v) => v.id === videoId);
  if (!video) return null;
  video.sharesCount += 1;
  return {
    shareUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/video/${videoId}`,
    sharesCount: video.sharesCount,
  };
}

export function fallbackGetComments(videoId: string) {
  return comments.get(videoId) ?? [];
}

export function fallbackAddComment(userId: string, videoId: string, text: string) {
  const user = users.get(userId);
  const video = videos.find((v) => v.id === videoId);
  if (!video || !user) return null;

  const comment = {
    id: `c_${Date.now()}`,
    videoId,
    text,
    likes: 0,
    createdAt: new Date(),
    user: {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      displayName: user.displayName,
    },
  };

  const list = comments.get(videoId) ?? [];
  list.unshift(comment);
  comments.set(videoId, list);
  video.commentsCount += 1;
  return comment;
}

export function fallbackGetSaved(userId: string) {
  return videos
    .filter((v) => saves.has(key(userId, v.id)))
    .map((v) => enrichVideo(v, userId));
}

export function fallbackGetLiked(userId: string) {
  return videos
    .filter((v) => likes.has(key(userId, v.id)))
    .map((v) => enrichVideo(v, userId));
}

export function fallbackSearchUsers(q: string) {
  return [...users.values()]
    .filter(
      (u) =>
        u.username.toLowerCase().includes(q.toLowerCase()) ||
        u.displayName.toLowerCase().includes(q.toLowerCase()),
    )
    .slice(0, 20)
    .map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      followersCount: u.followersCount,
    }));
}

export function fallbackSearchVideos(q: string, userId?: string) {
  return dedupeByUrl(videos.filter((v) => matchesQuery(v, q)))
    .slice(0, 24)
    .map((v) => enrichVideo(v, userId ?? 'guest'));
}

export function fallbackGetVideosByIds(ids: string[], userId: string) {
  return ids
    .map((id) => getVideoById(id))
    .filter((v): v is MemoryVideo => Boolean(v))
    .map((v) => enrichVideo(v, userId));
}
