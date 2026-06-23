import type { CorsOptions } from 'cors';
import { config } from './config.js';

function isAllowedOrigin(origin: string): boolean {
  const allowed = [
    config.frontendUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  if (allowed.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.loca\.lt$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.ngrok-free\.dev$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.ngrok\.io$/i.test(origin)) return true;

  return config.isDev;
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
};

export function isSocketOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  return isAllowedOrigin(origin);
}
