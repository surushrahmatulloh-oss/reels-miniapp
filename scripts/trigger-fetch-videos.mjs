/**
 * POST /api/admin/fetch-videos on Render — seeds MP4 videos (async, check GET /api/admin/seed-status)
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

if (!res.ok && res.status !== 202) process.exit(1);

const headers = { 'x-admin-key': adminKey };
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const statusRes = await fetch(`${RENDER_URL}/api/admin/seed-status`, { headers });
  const status = await statusRes.json();
  console.log(`[seed-status] running=${status.running}`);
  if (!status.running && (status.lastResult || status.lastError)) {
    console.log(JSON.stringify(status, null, 2));
    if (status.lastError) process.exit(1);
    break;
  }
}
