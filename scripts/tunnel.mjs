import { spawn, execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, statSync, readdirSync } from 'fs';
import { mkdir } from 'fs/promises';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const toolsDir = path.join(root, 'tools');
const cfLocal = path.join(toolsDir, 'cloudflared.exe');
const cfTemp = path.join(process.env.TEMP || '', 'cloudflared.exe');
const urlFile = path.join(root, 'tunnel-url.txt');
const envFile = path.join(root, '.env');
const TUNNEL_PORT = Number(process.env.TUNNEL_PORT ?? 5173);
const TUNNEL_HOST = `http://127.0.0.1:${TUNNEL_PORT}`;

const CF_URL =
  'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';

function loadEnvToken() {
  if (!existsSync(envFile)) return '';
  const env = readFileSync(envFile, 'utf8');
  const match = env.match(/^TELEGRAM_BOT_TOKEN=(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

function loadNgrokToken() {
  if (!existsSync(envFile)) return '';
  const env = readFileSync(envFile, 'utf8');
  const match = env.match(/^NGROK_AUTHTOKEN=(.+)$/m);
  const token = match?.[1]?.trim() ?? '';
  return token && token !== 'your_token_here' ? token : '';
}

function isValidCloudflared(exe) {
  return new Promise((resolve) => {
    if (!existsSync(exe) || statSync(exe).size < 1_000_000) {
      resolve(false);
      return;
    }
    const proc = spawn(`"${exe}"`, ['--version'], { shell: true, windowsHide: true });
    proc.on('exit', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

async function findCloudflared() {
  const candidates = [
    cfLocal,
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'cloudflared.exe'),
  ];

  try {
    const out = execSync('where cloudflared', { encoding: 'utf8', windowsHide: true }).trim();
    for (const line of out.split(/\r?\n/)) {
      if (line.trim()) candidates.unshift(line.trim());
    }
  } catch {
    /* not in PATH */
  }

  const wingetDir = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  if (existsSync(wingetDir)) {
    try {
      for (const pkg of readdirSync(wingetDir)) {
        if (!pkg.toLowerCase().includes('cloudflared')) continue;
        const exe = path.join(wingetDir, pkg, 'cloudflared.exe');
        if (existsSync(exe)) candidates.push(exe);
      }
    } catch {
      /* ignore */
    }
  }

  for (const p of [...new Set(candidates)]) {
    if (await isValidCloudflared(p)) return p;
  }
  return null;
}

async function downloadCloudflared(target) {
  await mkdir(path.dirname(target), { recursive: true });
  console.log('cloudflared бор мешавад (30 сония)...');

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 30_000);
    const download = (url) => {
      https
        .get(url, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            download(res.headers.location);
            return;
          }
          const file = createWriteStream(target);
          res.pipe(file);
          file.on('finish', () => {
            clearTimeout(timer);
            file.close();
            resolve();
          });
          file.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
          });
        })
        .on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
    };
    download(CF_URL);
  });
  console.log('cloudflared тайёр.');
}

async function waitForFrontend(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`${TUNNEL_HOST}/`, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve();
          else reject();
        });
        req.on('error', reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      console.log(`Сервер омода аст (порт ${TUNNEL_PORT}).`);
      return;
    } catch {
      console.log(`Интизори сервер... (${i + 1}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error(`Сервер дар порти ${TUNNEL_PORT} кор намекунад. start.bat-ро иҷро кунед.`);
}

async function updateBotUrl(url) {
  const token = loadEnvToken();
  if (!token) {
    console.log('TELEGRAM_BOT_TOKEN ёфт нашуд — URL-ро дастӣ дар BotFather гузоред.');
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: { type: 'web_app', text: 'Reels', web_app: { url } },
      }),
    });
    const data = await res.json();
    console.log('Telegram тугма:', data.ok ? 'танзим шуд ✓' : JSON.stringify(data));
  } catch (err) {
    console.log('Telegram API:', err.message);
  }
}

function saveUrl(url) {
  writeFileSync(urlFile, url + '\n', 'utf8');
  if (existsSync(envFile)) {
    let env = readFileSync(envFile, 'utf8');
    env = /^FRONTEND_URL=.*/m.test(env)
      ? env.replace(/^FRONTEND_URL=.*/m, `FRONTEND_URL=${url}`)
      : env + `\nFRONTEND_URL=${url}`;
    writeFileSync(envFile, env, 'utf8');
  }
  console.log('');
  console.log('========================================');
  console.log('  URL барои Telegram:');
  console.log('  ' + url);
  console.log('========================================');
  console.log('Ин URL-ро дар BotFather (Web App URL) низ гузоред');
  console.log('Ин терминалро напӯшед!');
}

function runProcess(command, urlPattern, cwd = root, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, [], {
      cwd,
      stdio: [opts.stdin ?? 'ignore', 'pipe', 'pipe'],
      shell: true,
      windowsHide: false,
    });
    let urlSet = false;

    const onLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const match = trimmed.match(urlPattern);
      if (match && !urlSet) {
        urlSet = true;
        const url = match[0].startsWith('http') ? match[0] : match[1];
        saveUrl(url);
        void updateBotUrl(url);
      }

      if (
        trimmed.includes('url is') ||
        trimmed.includes('ngrok-url') ||
        trimmed.includes('trycloudflare.com') ||
        trimmed.includes('loca.lt') ||
        trimmed.includes('ngrok-free.app')
      ) {
        console.log(trimmed);
      }
    };

    proc.stdout.on('data', (buf) => buf.toString().split('\n').forEach(onLine));
    proc.stderr.on('data', (buf) => buf.toString().split('\n').forEach(onLine));
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (!urlSet) reject(new Error(`Tunnel қатъ шуд (код ${code})`));
      else resolve();
    });
  });
}

async function startNgrok(token) {
  console.log(`Tunnel: ngrok → порт ${TUNNEL_PORT}`);
  const ngrokPath = path.join(root, 'tools', 'ngrok-sdk', 'node_modules', '@ngrok', 'ngrok', 'index.js');
  const ngrok = await import(`file:///${ngrokPath.replace(/\\/g, '/')}`);

  const listener = await ngrok.forward({
    addr: TUNNEL_PORT,
    authtoken: token,
    on_status_change: (_addr, err) => {
      if (err) console.error('ngrok disconnected:', err);
    },
  });

  const url = listener.url();
  if (!url) throw new Error('ngrok URL гирифта нашуд');

  saveUrl(url);
  await updateBotUrl(url);
  console.log(`ngrok-url: ${url}`);

  setInterval(() => {}, 60_000);
  await new Promise(() => {});
}

async function startCloudflared(exe) {
  console.log('Tunnel: cloudflared');
  await runProcess(`"${exe}" tunnel --url ${TUNNEL_HOST}`, /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
}

async function fetchTunnelIp(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10) Telegram' },
      redirect: 'follow',
    });
    const html = await res.text();
    const match = html.match(/id="endpoint-ip-text">([0-9.]+)</);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function printLocaltunnelHelp(url) {
  const ip = await fetchTunnelIp(url);
  console.log('');
  console.log('⚠️  localtunnel дар Telegram саҳифаи IP нишон медиҳад!');
  if (ip) {
    console.log('   Дар майдони IP инро нависед: ' + ip);
    console.log('   Баъд тугмаи Continue-ро пахш кунед.');
  } else {
    console.log('   IP-ро аз болои экран (hosted by) хонед ва Continue пахш кунед.');
  }
  console.log('   Барои гузаштан аз ин — cloudflared насб кунед (устувортар).');
  console.log('');
}

async function startLocaltunnel() {
  console.log('Tunnel: localtunnel (бо огоҳӣ барои Telegram)');
  let url = '';
  await new Promise((resolve, reject) => {
    const proc = spawn('npx --yes localtunnel --port 5173 --local-host 127.0.0.1', [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      windowsHide: false,
    });
    let urlSet = false;

    const onLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(/https:\/\/[a-z0-9-]+\.loca\.lt/i);
      if (match && !urlSet) {
        urlSet = true;
        url = match[0];
        saveUrl(url);
        void updateBotUrl(url);
        void printLocaltunnelHelp(url);
      }
      if (trimmed.includes('url is') || trimmed.includes('loca.lt')) console.log(trimmed);
    };

    proc.stdout.on('data', (buf) => buf.toString().split('\n').forEach(onLine));
    proc.stderr.on('data', (buf) => buf.toString().split('\n').forEach(onLine));
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (!urlSet) reject(new Error(`Tunnel қатъ шуд (код ${code})`));
      else resolve();
    });
  });
}

async function main() {
  await waitForFrontend();

  while (true) {
    const ngrokToken = loadNgrokToken();

    if (ngrokToken) {
      try {
        await startNgrok(ngrokToken);
        console.log('ngrok қатъ шуд — аз нав оғоз...');
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      } catch (err) {
        console.log('ngrok хато:', err.message);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
    }

    const cf = await findCloudflared();
    if (cf) {
      try {
        console.log('Tunnel: cloudflared (бе саҳифаи IP)');
        await startCloudflared(cf);
        console.log('cloudflared қатъ шуд — аз нав оғоз...');
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      } catch (err) {
        console.log('cloudflared хато:', err.message);
      }
    }

    console.log('cloudflared/ngrok ёфт нашуд — localtunnel (камустувор).');
    console.log('Ҳалли доимӣ: install-cloudflared.bat  Ё  NGROK_AUTHTOKEN дар .env');

    try {
      await startLocaltunnel();
      console.log('localtunnel қатъ шуд — аз нав оғоз...');
    } catch (err) {
      console.log('localtunnel хато:', err.message);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

main().catch((err) => {
  console.error('ХАТО:', err.message);
  process.exit(1);
});
