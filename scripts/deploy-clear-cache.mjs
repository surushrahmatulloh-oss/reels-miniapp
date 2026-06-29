/**
 * Manual deploy on Render with clear build cache.
 * Requires RENDER_API_KEY in .env.deploy
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RENDER_URL = process.env.RENDER_URL ?? 'https://reels-miniapp.onrender.com';
const SERVICE_NAME = process.env.RENDER_SERVICE_NAME ?? 'reels-miniapp';
const TARGET_VERSION = process.env.TARGET_VERSION ?? '4.3.3';

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
  throw new Error(`Service "${SERVICE_NAME}" not found`);
}

async function waitForVersion(timeoutMs = 900_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${RENDER_URL}/health`, { signal: AbortSignal.timeout(60_000) });
      if (res.ok) {
        const data = await res.json();
        console.log('Health:', JSON.stringify(data));
        if (data.version === TARGET_VERSION) return data;
      }
    } catch {
      /* deploy in progress */
    }
    console.log('Waiting for deploy... (20s)');
    await new Promise((r) => setTimeout(r, 20_000));
  }
  throw new Error(`Timeout — version ${TARGET_VERSION} not live`);
}

async function main() {
  if (!RENDER_API_KEY) {
    console.error('RENDER_API_KEY not in .env.deploy');
    console.error('→ https://dashboard.render.com/u/settings#api-keys');
    process.exit(1);
  }

  const service = await findService();
  console.log(`Service: ${service.name} (${service.id})`);
  console.log('Triggering Clear build cache & deploy...');

  const deploy = await renderApi('POST', `/services/${service.id}/deploys`, {
    clearCache: 'clear',
  });
  console.log('Deploy started:', JSON.stringify(deploy, null, 2));

  console.log('\nWaiting for health...');
  const health = await waitForVersion();
  console.log('\nDeploy complete:', JSON.stringify(health, null, 2));
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
