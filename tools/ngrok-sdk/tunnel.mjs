import ngrok from '@ngrok/ngrok';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const envFile = path.join(root, '.env');

function loadToken() {
  if (!existsSync(envFile)) return '';
  const env = readFileSync(envFile, 'utf8');
  const match = env.match(/^NGROK_AUTHTOKEN=(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

async function main() {
  const token = loadToken();
  if (!token) {
    console.error('NGROK_AUTHTOKEN ёфт нашуд');
    process.exit(1);
  }

  const port = Number(process.env.TUNNEL_PORT ?? 5173);
  const listener = await ngrok.forward({
    addr: port,
    authtoken: token,
    on_status_change: (_addr, err) => {
      if (err) console.error('ngrok disconnected:', err);
    },
  });
  console.log(`ngrok-url: ${listener.url()}`);
  setInterval(() => {}, 60_000);
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('ngrok хато:', err.message);
  process.exit(1);
});
