import { spawn, execSync } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const backendDir = path.join(root, 'apps', 'backend');
const frontendDir = path.join(root, 'apps', 'frontend');

function log(tag, msg) {
  const t = new Date().toLocaleTimeString('tg-TJ');
  console.log(`[${t}] [${tag}] ${msg}`);
}

function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitFor(url, label, max = 90) {
  for (let i = 0; i < max; i++) {
    if (await ping(url)) {
      log(label, 'омода ✓');
      return true;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function runService(tag, command, cwd, shouldRun) {
  const start = async () => {
    if (shouldRun && !(await shouldRun())) return;
    log(tag, 'оғоз...');
    const proc = spawn(command, [], {
      cwd,
      shell: true,
      stdio: 'inherit',
      windowsHide: false,
    });
    proc.on('exit', (code) => {
      log(tag, `қатъ шуд (код ${code}) — 3 сония баъд аз нав...`);
      setTimeout(start, 3000);
    });
    proc.on('error', (err) => {
      log(tag, `хато: ${err.message}`);
      setTimeout(start, 3000);
    });
  };
  void start();
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log('  Reels Mini App — ҳама дар як терминал');
  console.log('  ИН ТЕРМИНАЛРО НАПУШЕД!');
  console.log('========================================');
  console.log('');

  runService(
    'Backend',
    'npx tsx watch src/index.ts',
    backendDir,
    async () => !(await ping('http://127.0.0.1:3001/health')),
  );

  runService(
    'Frontend',
    'npx vite --port 5173 --strictPort',
    frontendDir,
    async () => !(await ping('http://127.0.0.1:5173/')),
  );

  await waitFor('http://127.0.0.1:5173/', 'Frontend');
  await waitFor('http://127.0.0.1:3001/health', 'Backend');

  runService('Tunnel', 'node scripts/tunnel.mjs', root);

  log('OK', 'Ҳама кор мекунад. Дар Telegram: @miniapprealsBot');
}

main().catch((err) => {
  console.error('ХАТО:', err.message);
  process.exit(1);
});
