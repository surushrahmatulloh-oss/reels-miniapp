/**
 * POST /api/admin/fetch-videos — wipe DB + seed 1000 MP4 videos
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

const headers = {
  'Content-Type': 'application/json',
  'x-admin-key': adminKey,
};

console.log(`POST ${RENDER_URL}/api/admin/fetch-videos (wipeAll + 1000 MP4)...`);

const res = await fetch(`${RENDER_URL}/api/admin/fetch-videos`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ wipeAll: true, targetTotal: 1000, perCategory: 56 }),
});

const text = await res.text();
console.log('Status:', res.status);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}

if (!res.ok && res.status !== 202) process.exit(1);

for (let i = 0; i < 90; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const statusRes = await fetch(`${RENDER_URL}/api/admin/seed-status`, { headers });
  const raw = await statusRes.text();
  let status;
  try {
    status = JSON.parse(raw);
  } catch {
    console.log('[seed-status] invalid JSON', statusRes.status);
    continue;
  }
  console.log(`[seed-status] running=${status.running}`);
  if (!status.running && (status.lastResult || status.lastError)) {
    console.log('\n=== SEED RESULT ===');
    console.log(JSON.stringify(status, null, 2));
    if (status.lastError) process.exit(1);
    break;
  }
}

const health = await fetch(`${RENDER_URL}/health`).then((r) => r.json());
console.log('\nHealth:', JSON.stringify(health, null, 2));

const initData =
  'user=' +
  encodeURIComponent(JSON.stringify({ id: 333333, username: 'seedcheck', first_name: 'S' })) +
  '&hash=dev';
const auth = await fetch(`${RENDER_URL}/api/auth/telegram`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ initData }),
}).then((r) => r.json());

const feed = await fetch(`${RENDER_URL}/api/feed?limit=3&format=reels`, {
  headers: { Authorization: `Bearer ${auth.token}` },
}).then((r) => r.json());

console.log('\nFeed sample:');
for (const v of feed.videos ?? []) {
  const isMp4 = /\.mp4/i.test(v.url ?? '');
  const isYt = /youtube/i.test(v.url ?? '');
  console.log(`  ${v.id.slice(-6)} mp4=${isMp4} youtube=${isYt} ${(v.url ?? '').slice(0, 70)}`);
}
