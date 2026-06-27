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

async function triggerRenderDeploy() {
  if (!RENDER_DEPLOY_HOOK) {
    console.log('');
    console.log('RENDER_DEPLOY_HOOK нест.');
    console.log('→ Render Dashboard → reels-miniapp → Settings → Deploy Hook');
    console.log('→ URL-ро дар .env.deploy гузоред: RENDER_DEPLOY_HOOK=...');
    console.log('→ Ё дастӣ: Manual Deploy → Clear build cache & deploy');
    return;
  }

  console.log('[render] Deploy оғоз...');
  const res = await fetch(RENDER_DEPLOY_HOOK, { method: 'POST' });
  if (res.ok) {
    console.log('[render] Deploy фиристода шуд ✓');
  } else {
    console.warn(`[render] Deploy hook хато: ${res.status}`);
  }
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
  console.log('https://reels-miniapp.onrender.com/health');
  console.log('Бояд version: 2.3.1 ва videos: 27');
}

main().catch((err) => {
  console.error('ХАТО:', err.message);
  process.exit(1);
});
