import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { users, likes, saves, isFallbackMode } from './store/fallback.js';
import type { MemoryUser } from './store/fallback.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'memory-store.json');

interface PersistedData {
  users: MemoryUser[];
  likes: string[];
  saves: string[];
}

export function loadPersistedStore(): void {
  if (!isFallbackMode() || !existsSync(DATA_FILE)) return;

  try {
    const raw = readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw) as PersistedData;
    for (const u of data.users) {
      users.set(u.id, { ...u, createdAt: new Date(u.createdAt) });
    }
    for (const l of data.likes ?? []) likes.add(l);
    for (const s of data.saves ?? []) saves.add(s);
    console.log(`Loaded ${data.users.length} users from disk`);
  } catch (err) {
    console.warn('Could not load persisted store:', (err as Error).message);
  }
}

export function savePersistedStore(): void {
  if (!isFallbackMode()) return;

  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const payload: PersistedData = {
      users: [...users.values()].map((u) => ({
        ...u,
        createdAt: u.createdAt,
      })),
      likes: [...likes],
      saves: [...saves],
    };
    writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not save persisted store:', (err as Error).message);
  }
}
