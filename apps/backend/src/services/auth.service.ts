import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { JwtPayload } from '../types/index.js';

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export function validateTelegramInitData(initData: string): TelegramUser | null {
  if (!initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = config.telegramBotToken
    ? crypto.createHmac('sha256', 'WebAppData').update(config.telegramBotToken).digest()
    : crypto.createHash('sha256').update('dev-telegram-secret').digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== hash) {
    if ((config.isDev || config.allowDevAuth) && hash === 'dev') {
      const userRaw = params.get('user');
      if (userRaw) {
        try {
          return JSON.parse(userRaw) as TelegramUser;
        } catch {
          return null;
        }
      }
      return { id: 123456789, username: 'devuser', first_name: 'Dev', photo_url: '' };
    }
    if (!config.telegramBotToken && config.isDev) {
      const userRaw = params.get('user');
      if (userRaw) {
        try {
          return JSON.parse(userRaw) as TelegramUser;
        } catch {
          return null;
        }
      }
      return { id: 123456789, username: 'devuser', first_name: 'Dev', photo_url: '' };
    }
    return null;
  }

  const userRaw = params.get('user');
  if (!userRaw) {
    if (config.isDev) {
      return { id: 123456789, username: 'devuser', first_name: 'Dev', photo_url: '' };
    }
    return null;
  }

  try {
    return JSON.parse(userRaw) as TelegramUser;
  } catch {
    return null;
  }
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}

export function serializeUser(user: {
  _id: { toString(): string };
  telegramId: number;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  preferences: { formats: string[]; categories: string[]; language: string };
  followersCount: number;
  followingCount: number;
  isPrivate: boolean;
  onboardingCompleted: boolean;
  createdAt: Date;
}) {
  return {
    id: user._id.toString(),
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
