/**
 * POST /api/admin/fetch-videos on Render (after deploy)
 * Reads ADMIN_API_KEY from .env or .env.deploy
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RENDER_URL = process.env.RENDER_URL ?? 'https://reels-miniapp.onrender.com';

function loadEnvFile(file) {
  const env = {};
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.replace(/^\uFEFF/, '').replace(/\r$/, '').trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = {
  ...loadEnvFile(path.join(root, '.env')),
  ...loadEnvFile(path.join(root, '.env.deploy')),
  ...process.env,
};

const adminKey = env.ADMIN_API_KEY;
if (!adminKey) {
  console.error('ADMIN_API_KEY дар .env ёфт нашуд');
  process.exit(1);
}

console.log(`Calling POST ${RENDER_URL}/api/admin/fetch-videos ...`);

const res = await fetch(`${RENDER_URL}/api/admin/fetch-videos`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-key': adminKey,
  },
});

const text = await res.text();
console.log('Status:', res.status);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}

if (!res.ok) process.exit(1);
