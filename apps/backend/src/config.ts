import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });
dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  frontendUrl:
    process.env.RENDER_EXTERNAL_URL ??
    process.env.FRONTEND_URL ??
    'http://localhost:5173',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  jwtSecret: requireEnv('JWT_SECRET', 'dev-secret-change-in-production'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/reels-miniapp',
  useMemoryDb: process.env.USE_MEMORY_DB === 'true',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  isDev: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
};
