/**
 * Push ба GitHub — санҷиши пайваст + push бе --force
 */
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const REPO = 'surushrahmatulloh-oss/reels-miniapp';

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
  ...loadEnvFile(path.join(root, '.env.deploy')),
  ...process.env,
};

const GITHUB_TOKEN = env.GITHUB_TOKEN ?? env.GH_TOKEN;
const RENDER_DEPLOY_HOOK = env.RENDER_DEPLOY_HOOK;
const RENDER_API_KEY = env.RENDER_API_KEY;
const RENDER_SERVICE_NAME = env.RENDER_SERVICE_NAME ?? 'reels-miniapp';
const RENDER_URL = env.RENDER_URL ?? 'https://reels-miniapp.onrender.com';

function run(cmd, quiet = false) {
  if (!quiet) console.log(`> ${cmd.replace(GITHUB_TOKEN ?? '', '***')}`);
  execSync(cmd, { cwd: root, stdio: quiet ? 'pipe' : 'inherit', shell: true });
}

async function testGitHub() {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'reels-push',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub token хато (${res.status}): ${text.slice(0, 120)}`);
  }
  return res.json();
}

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

async function findRenderService() {
  let cursor;
  do {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const page = await renderApi('GET', `/services${q}`);
    for (const row of page) {
      const svc = row.service ?? row;
      if (svc.name === RENDER_SERVICE_NAME) return svc;
    }
    cursor = page.length ? page[page.length - 1]?.cursor : null;
  } while (cursor);
  throw new Error(`Service "${RENDER_SERVICE_NAME}" not found`);
}

async function triggerRenderDeployViaApi() {
  const service = await findRenderService();
  console.log(`[render] API deploy: ${service.name} (${service.id})`);
  await renderApi('POST', `/services/${service.id}/deploys`, { clearCache: 'clear' });
  console.log('[render] Deploy оғоз шуд (clear cache) ✓');
}

async function triggerRenderDeploy() {
  if (RENDER_DEPLOY_HOOK) {
    console.log('[render] Deploy hook...');
    const res = await fetch(RENDER_DEPLOY_HOOK, { method: 'POST' });
    if (res.ok) {
      console.log('[render] Deploy фиристода шуд ✓');
      return;
    }
    console.warn(`[render] Deploy hook хато: ${res.status}`);
  }

  if (RENDER_API_KEY?.startsWith('rnd_')) {
    try {
      await triggerRenderDeployViaApi();
      return;
    } catch (err) {
      console.warn('[render] API deploy хато:', err.message);
    }
  }

  console.log('[render] Auto-deploy аз GitHub (render.yaml autoDeploy: true)');
  console.log(`[render] Санҷед: ${RENDER_URL}/health`);
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log('  Push → GitHub → Render');
  console.log('========================================');
  console.log('');

  if (!GITHUB_TOKEN?.startsWith('ghp_')) {
    console.error('GITHUB_TOKEN ёфт нашуд.');
    console.error('Дар .env.deploy гузоред: GITHUB_TOKEN=ghp_...');
    process.exit(1);
  }

  let user;
  try {
    user = await testGitHub();
    console.log(`GitHub: ${user.login} ✓`);
  } catch (err) {
    console.error('GitHub пайваст нест:', err.message);
    console.error('VPN ё hotspot-ро фаъол кунед.');
    process.exit(1);
  }

  const cleanUrl = `https://github.com/${REPO}.git`;
  const pushUrl = `https://${GITHUB_TOKEN}@github.com/${REPO}.git`;

  try {
    run(`git remote get-url origin`, true);
    run(`git remote set-url origin "${cleanUrl}"`);
  } catch {
    run(`git remote add origin "${cleanUrl}"`);
  }

  try {
    run(`git push "${pushUrl}" main`);
  } catch {
    console.log('Push бо upstream...');
    run(`git push -u "${pushUrl}" main`);
  }

  run(`git remote set-url origin "${cleanUrl}"`);
  run(`git branch --set-upstream-to=origin/main main`, true);

  console.log('');
  console.log('GitHub push ✓');

  await triggerRenderDeploy();

  console.log('');
  console.log('Пас аз 5-7 дақиқа санҷед:');
  console.log(`${RENDER_URL}/health`);
}

main().catch((err) => {
  console.error('ХАТО:', err.message);
  process.exit(1);
});
