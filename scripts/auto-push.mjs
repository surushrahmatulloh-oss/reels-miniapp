/**
 * Auto add + commit + push (Windows / cross-platform)
 * Usage: node scripts/auto-push.mjs [commit message]
 */
import { execSync, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME ?? 'Auto Push',
  GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL ?? 'autopush@local',
  GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME ?? 'Auto Push',
  GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL ?? 'autopush@local',
};

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: 'inherit', shell: true, env: gitEnv });
}

function runQuiet(cmd) {
  try {
    execSync(cmd, { cwd: root, stdio: 'pipe', shell: true, env: gitEnv });
    return true;
  } catch {
    return false;
  }
}

const msg =
  process.argv.slice(2).join(' ') ||
  `auto: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`;

run('git add -A');

if (!runQuiet('git diff --cached --quiet')) {
  run(`git commit -m "${msg.replace(/"/g, '\\"')}"`);
  console.log('[auto-push] committed:', msg);
  console.log('[auto-push] push → GitHub → Render...');
  const push = spawnSync(process.execPath, [path.join(__dirname, 'push-github.mjs')], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (push.status !== 0) {
    console.warn('[auto-push] push failed — VPN/GitHub? Боз кӯшиш: node scripts/push-github.mjs');
    process.exit(push.status ?? 1);
  }
} else {
  console.log('[auto-push] nothing to commit');
  process.exit(0);
}
