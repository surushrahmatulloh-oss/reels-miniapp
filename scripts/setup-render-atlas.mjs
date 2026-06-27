/**
 * Render: env vars (MongoDB Atlas) + deploy + fetch-videos
 *
 * Дар .env.deploy гузоред:
 *   RENDER_API_KEY=rnd_...
 *   MONGODB_URI=mongodb+srv://...
 *   ADMIN_API_KEY=...
 *   USE_MEMORY_DB=false
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RENDER_URL = process.env.RENDER_URL ?? 'https://reels-miniapp.onrender.com';
const SERVICE_NAME = process.env.RENDER_SERVICE_NAME ?? 'reels-miniapp';

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

const RENDER_API_KEY = env.RENDER_API_KEY;
const ADMIN_API_KEY = env.ADMIN_API_KEY;

const ENV_TO_SET = {
  MONGODB_URI: env.MONGODB_URI,
  USE_MEMORY_DB: env.USE_MEMORY_DB ?? 'false',
  ADMIN_API_KEY: env.ADMIN_API_KEY,
};

async function renderApi(method, apiPath, body) {
  const res = await fetch(`https://api.render.com/v1${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${RENDER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(`Render ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function findService() {
  let cursor;
  do {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const page = await renderApi('GET', `/services${q}`);
    for (const row of page) {
      const svc = row.service ?? row;
      if (svc.name === SERVICE_NAME) return svc;
    }
    cursor = page.length ? page[page.length - 1]?.cursor : null;
  } while (cursor);
  throw new Error(`Service "${SERVICE_NAME}" ёфт нашуд`);
}

async function upsertEnvVar(serviceId, key, value) {
  if (!value) {
    console.warn(`  skip ${key} — value нест`);
    return;
  }
  const existing = await renderApi('GET', `/services/${serviceId}/env-vars`);
  const found = existing.find((row) => (row.envVar ?? row).key === key);
  if (found) {
    const id = (found.envVar ?? found).id;
    await renderApi('PUT', `/services/${serviceId}/env-vars/${id}`, { value });
    console.log(`  updated ${key}`);
  } else {
    await renderApi('POST', `/services/${serviceId}/env-vars`, { key, value });
    console.log(`  created ${key}`);
  }
}

async function triggerDeploy(serviceId) {
  if (env.RENDER_DEPLOY_HOOK) {
    console.log('Deploy hook...');
    const res = await fetch(env.RENDER_DEPLOY_HOOK, { method: 'POST' });
    console.log('Deploy hook status:', res.status);
    return;
  }
  await renderApi('POST', `/services/${serviceId}/deploys`, { clearCache: 'clear' });
  console.log('Deploy оғоз шуд (clear cache)');
}

async function waitForHealth(timeoutMs = 600_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${RENDER_URL}/health`, {
        signal: AbortSignal.timeout(90_000),
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Health:', JSON.stringify(data));
        if (data.version >= '2.4.0' || data.admin === true) return data;
      }
    } catch {
      /* Render waking up */
    }
    console.log('Интизор... (30s)');
    await new Promise((r) => setTimeout(r, 30_000));
  }
  throw new Error('Timeout — health наомад');
}

async function fetchVideos() {
  if (!ADMIN_API_KEY) throw new Error('ADMIN_API_KEY нест');
  console.log(`POST ${RENDER_URL}/api/admin/fetch-videos`);
  const res = await fetch(`${RENDER_URL}/api/admin/fetch-videos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_API_KEY,
    },
    signal: AbortSignal.timeout(600_000),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
  if (!res.ok) process.exit(1);
}

async function main() {
  console.log('========================================');
  console.log('  Render Atlas Setup');
  console.log('========================================\n');

  if (!RENDER_API_KEY) {
    console.error('RENDER_API_KEY дар .env.deploy нест.');
    console.error('→ https://dashboard.render.com/u/settings#api-keys');
    console.error('\nДастӣ: Dashboard → reels-miniapp → Environment');
    console.error('  MONGODB_URI, USE_MEMORY_DB=false, ADMIN_API_KEY');
    console.error('→ Save → Manual Deploy → node scripts/trigger-fetch-videos.mjs');
    process.exit(1);
  }

  const missing = ['MONGODB_URI', 'ADMIN_API_KEY'].filter((k) => !ENV_TO_SET[k]);
  if (missing.length) {
    console.error('Дар .env.deploy нест:', missing.join(', '));
    process.exit(1);
  }

  const service = await findService();
  console.log(`Service: ${service.name} (${service.id})\nEnv vars:`);

  for (const [key, value] of Object.entries(ENV_TO_SET)) {
    await upsertEnvVar(service.id, key, value);
  }

  console.log('\nDeploy...');
  await triggerDeploy(service.id);

  console.log('\nИнтизори deploy...');
  await waitForHealth();

  console.log('\nYouTube import...');
  await fetchVideos();

  console.log('\n✓ Тамом');
}

main().catch((err) => {
  console.error('ХАТО:', err.message);
  process.exit(1);
});
