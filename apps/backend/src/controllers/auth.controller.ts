import type { Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import {
  validateTelegramInitData,
  signToken,
  verifyToken,
  serializeUser,
} from '../services/auth.service.js';
import { isFallbackMode } from '../store/fallback.js';
import * as fb from '../services/fallback.service.js';
import type { AuthRequest } from '../middleware/auth.js';

const telegramAuthSchema = z.object({
  initData: z.string().min(1),
});

export async function telegramAuth(req: AuthRequest, res: Response): Promise<void> {
  const parsed = telegramAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'initData is required' });
    return;
  }

  const tgUser = validateTelegramInitData(parsed.data.initData);
  if (!tgUser) {
    res.status(401).json({ error: 'Invalid Telegram initData' });
    return;
  }

  if (isFallbackMode()) {
    res.json(fb.fallbackTelegramAuth(parsed.data.initData, tgUser));
    return;
  }

  let user = await User.findOne({ telegramId: tgUser.id });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const username =
      tgUser.username ??
      `user_${tgUser.id}`.slice(0, 32);

    user = await User.create({
      telegramId: tgUser.id,
      username,
      displayName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || username,
      avatarUrl: tgUser.photo_url ?? '',
      onboardingCompleted: false,
    });
  }

  const token = signToken({
    userId: user._id.toString(),
    telegramId: user.telegramId,
    username: user.username,
  });

  res.json({
    token,
    user: serializeUser(user),
    isNewUser,
  });
}

export async function refreshToken(req: AuthRequest, res: Response): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const payload = verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  if (isFallbackMode()) {
    const token = fb.fallbackRefreshToken(header.slice(7));
    if (!token) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ token });
    return;
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const token = signToken({
    userId: user._id.toString(),
    telegramId: user.telegramId,
    username: user.username,
  });

  res.json({ token });
}
