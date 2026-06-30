/**
 * POST /api/admin/fill-catalog — fill DB with GCS audio clips up to target
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
  console.error('ADMIN_API_KEY not found');
  process.exit(1);
}

const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };
const target = Number(process.argv[2] ?? 2000);

console.log(`POST fill-catalog target=${target}`);
const res = await fetch(`${RENDER_URL}/api/admin/fill-catalog`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ targetTotal: target }),
});
console.log('Status:', res.status, await res.text());

for (let i = 0; i < 180; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const status = await fetch(`${RENDER_URL}/api/admin/seed-status`, { headers }).then((r) => r.json());
  const total = status.lastCatalogResult?.total ?? status.lastResult?.total ?? '?';
  console.log(`[${i}] running=${status.running} total=${total}`);
  if (!status.running && (status.lastCatalogResult || status.lastError)) {
    console.log(JSON.stringify(status, null, 2));
    break;
  }
}

const health = await fetch(`${RENDER_URL}/health`).then((r) => r.json());
console.log('Health:', JSON.stringify(health, null, 2));
