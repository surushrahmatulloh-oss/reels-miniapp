import { spawn, execSync } from 'child_process';
import { existsSync } from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const backendDir = path.join(root, 'apps', 'backend');
const frontendDir = path.join(root, 'apps', 'frontend');
const SERVER_PORT = process.env.SERVER_PORT ?? '3001';

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
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitFor(url, label, max = 120) {
  for (let i = 0; i < max; i++) {
    if (await ping(url)) {
      log(label, 'омода ✓');
      return true;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function ensureFrontendBuilt() {
  const indexHtml = path.join(frontendDir, 'dist', 'index.html');
  if (existsSync(indexHtml)) {
    log('Build', 'frontend dist мавҷуд ✓');
    return;
  }
  log('Build', 'frontend бор мешавад (1 маротиба)...');
  execSync('npx vite build', {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_API_URL: '', VITE_WS_URL: '' },
  });
}

function runService(tag, command, cwd, extraEnv = {}, shouldRun) {
  const start = async () => {
    if (shouldRun && !(await shouldRun())) return;
    log(tag, 'оғоз...');
    const proc = spawn(command, [], {
      cwd,
      shell: true,
      stdio: 'inherit',
      windowsHide: false,
      env: { ...process.env, ...extraEnv },
    });
    proc.on('exit', (code) => {
      log(tag, `қатъ шуд (код ${code}) — 5 сония баъд аз нав...`);
      setTimeout(start, 5000);
    });
    proc.on('error', (err) => {
      log(tag, `хато: ${err.message}`);
      setTimeout(start, 5000);
    });
  };
  void start();
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log('  Reels Mini App — режими устувор');
  console.log('  (production — бе хатоҳои ngrok)');
  console.log('  ИН ТЕРМИНАЛРО НАПУШЕД!');
  console.log('========================================');
  console.log('');

  ensureFrontendBuilt();

  const serverEnv = {
    NODE_ENV: 'production',
    USE_MEMORY_DB: 'true',
    PORT: SERVER_PORT,
    TUNNEL_PORT: SERVER_PORT,
  };

  runService(
    'Server',
    'npx tsx src/index.ts',
    backendDir,
    serverEnv,
    async () => {
      if (await ping(`http://127.0.0.1:${SERVER_PORT}/health`)) {
        log('Server', 'аллакай кор мекунад ✓');
        return false;
      }
      return true;
    },
  );

  const ok = await waitFor(`http://127.0.0.1:${SERVER_PORT}/health`, 'Server');
  if (!ok) {
    console.error('Server оғоз нашуд! stop.bat иҷро кунед ва аз нав.');
    process.exit(1);
  }

  await waitFor(`http://127.0.0.1:${SERVER_PORT}/`, 'Frontend');

  runService('Tunnel', 'node scripts/tunnel.mjs', root, { TUNNEL_PORT: SERVER_PORT });

  log('OK', 'Ҳама кор мекунад. Дар Telegram: @miniapprealsBot');
}

main().catch((err) => {
  console.error('ХАТО:', err.message);
  process.exit(1);
});
