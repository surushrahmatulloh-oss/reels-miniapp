/**
 * Watch project files and auto-push on save (debounced).
 * Windows + Mac + Linux — no extra dependencies.
 */
import { watch } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const IGNORE = [
  'node_modules',
  '.git',
  'dist',
  '.vite',
  'coverage',
  'tools/gh',
  '.env',
  '.env.deploy',
];

let timer = null;
let running = false;

function shouldIgnore(relative) {
  return IGNORE.some((part) => relative.includes(part));
}

function trigger() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    if (running) return;
    running = true;
    console.log(`\n[watch] ${new Date().toLocaleTimeString()} — auto-push...`);
    try {
      execSync('node scripts/auto-push.mjs', { cwd: root, stdio: 'inherit', shell: true });
    } catch {
      console.warn('[watch] auto-push failed (VPN/GitHub?)');
    } finally {
      running = false;
    }
  }, 3000);
}

console.log('[watch] Watching for file changes (3s debounce)...');
console.log('[watch] Ctrl+C to stop\n');

function walkWatch(dir) {
  watch(dir, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    const rel = filename.replace(/\\/g, '/');
    if (shouldIgnore(rel)) return;
    trigger();
  });
}

walkWatch(root);
