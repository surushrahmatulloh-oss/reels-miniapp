/**
 * Deploy ба Render — GitHub push + Render Blueprint
 * Токенҳо дар .env.deploy ё environment:
 *   GITHUB_TOKEN=ghp_...
 *   RENDER_API_KEY=rnd_...
 */
import { execSync, spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const REPO_NAME = 'reels-miniapp';

function loadEnvFile(file) {
  const env = {};
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = {
  ...loadEnvFile(path.join(root, '.env')),
  ...loadEnvFile(path.join(root, '.env.deploy')),
  ...process.env,
};

const GITHUB_TOKEN = env.GITHUB_TOKEN ?? env.GH_TOKEN;
const RENDER_API_KEY = env.RENDER_API_KEY;
const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;

function log(msg) {
  console.log(`[deploy] ${msg}`);
}

function run(cmd, opts = {}) {
  log(`$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', shell: true, ...opts });
}

async function ghApi(method, apiPath, body) {
  const res = await fetch(`https://api.github.com${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'reels-miniapp-deploy',
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
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function getGitHubUser() {
  return ghApi('GET', '/user');
}

async function ensureRepo(owner) {
  try {
    const repo = await ghApi('GET', `/repos/${owner}/${REPO_NAME}`);
    log(`Repo мавҷуд: ${repo.html_url}`);
    return repo;
  } catch {
    log('Repo эҷод мешавад...');
    return ghApi('POST', '/user/repos', {
      name: REPO_NAME,
      description: 'Telegram Reels Mini App',
      private: false,
      auto_init: false,
    });
  }
}

function pushToGitHub(cloneUrl) {
  const url = cloneUrl.replace('https://', `https://${GITHUB_TOKEN}@`);
  try {
    run('git remote get-url origin');
    run(`git remote set-url origin ${url.replace(GITHUB_TOKEN, '***')}`);
    run(`git remote set-url origin "${url}"`);
  } catch {
    run(`git remote add origin "${url}"`);
  }
  run('git push -u origin main --force');
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Render ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function triggerBlueprint(owner, repoUrl) {
  log('Render Blueprint оғоз...');
  try {
    const result = await renderApi('POST', '/blueprints', {
      name: REPO_NAME,
      repo: `${repoUrl}`,
      branch: 'main',
    });
    log(`Blueprint: ${JSON.stringify(result)}`);
    return result;
  } catch (err) {
    log(`Blueprint хато (дастӣ иҷро кунед): ${err.message}`);
    log(`→ https://dashboard.render.com/select-repo?type=blueprint`);
    return null;
  }
}

async function updateTelegramBot(publicUrl) {
  if (!TELEGRAM_BOT_TOKEN) return;
  const url = publicUrl.replace(/\/$/, '');
  log(`Telegram бот → ${url}`);
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setChatMenuButton`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      menu_button: { type: 'web_app', text: '🎬 Reels', web_app: { url } },
    }),
  });
  const data = await res.json();
  log(`Bot: ${data.ok ? 'OK ✓' : JSON.stringify(data)}`);
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log('  Auto Deploy — GitHub + Render');
  console.log('========================================');
  console.log('');

  if (!GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN ёфт нашуд.');
    console.error('Дар .env.deploy гузоред: GITHUB_TOKEN=ghp_...');
    console.error('→ https://github.com/settings/tokens (repo access)');
    process.exit(1);
  }

  const user = await getGitHubUser();
  log(`GitHub: ${user.login}`);

  const repo = await ensureRepo(user.login);
  pushToGitHub(repo.clone_url);

  if (RENDER_API_KEY) {
    await triggerBlueprint(user.login, repo.html_url);
    log('Deploy дар Render оғоз шуд. 3-5 дақиқа интизор шавед.');
    log('URL: https://reels-miniapp.onrender.com (ё дар Render Dashboard)');
  } else {
    log('RENDER_API_KEY нест — Render дастӣ:');
    log('https://dashboard.render.com/select-repo?type=blueprint');
    writeFileSync(
      path.join(root, 'RENDER-NEXT.txt'),
      `1. https://dashboard.render.com/select-repo?type=blueprint\n2. Repo: ${user.login}/${REPO_NAME}\n3. TELEGRAM_BOT_TOKEN аз .env\n4. node setup-bot.js https://reels-miniapp.onrender.com\n`,
      'utf8',
    );
  }

  console.log('');
  log('GitHub push ✓');
  log(`Repo: ${repo.html_url}`);
}

main().catch((err) => {
  console.error('ХАТО:', err.message);
  process.exit(1);
});
