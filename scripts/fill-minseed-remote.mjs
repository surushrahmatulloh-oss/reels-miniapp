/**
 * Fill production MongoDB with minseed videos up to target (uses MONGODB_URI from .env.deploy)
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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

if (!env.MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.deploy');
  process.exit(1);
}

process.env.MONGODB_URI = env.MONGODB_URI;
process.env.USE_MEMORY_DB = 'false';
process.env.NODE_ENV = 'production';

const target = Number(process.argv[2] ?? 2000);

const { connectDatabase } = await import('../apps/backend/src/db.js');
const { ensureMinimumVideos, countReelsVideos } = await import(
  '../apps/backend/src/services/ensureMinimumVideos.service.js'
);

await connectDatabase();
const before = await import('../apps/backend/src/services/ensureVideoCatalog.service.js').then((m) =>
  m.countReelsVideos(),
);
console.log(`Before: ${before} videos, target: ${target}`);
await ensureMinimumVideos(target);
const after = await import('../apps/backend/src/services/ensureVideoCatalog.service.js').then((m) =>
  m.countReelsVideos(),
);
console.log(`After: ${after} videos (+${after - before})`);
process.exit(0);
