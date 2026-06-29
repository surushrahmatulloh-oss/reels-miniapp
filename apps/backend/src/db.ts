import mongoose from 'mongoose';
import { config } from './config.js';
import { enableFallback, isFallbackMode } from './store/fallback.js';
import { loadPersistedStore } from './persist.js';

const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 2_000;

const MONGO_OPTIONS: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 15_000,
  connectTimeoutMS: 15_000,
  socketTimeoutMS: 45_000,
  maxPoolSize: 8,
  minPoolSize: 1,
  maxIdleTimeMS: 30_000,
  heartbeatFrequencyMS: 10_000,
  retryWrites: true,
  retryReads: true,
};

let connectPromise: Promise<void> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setupConnectionEvents(): void {
  const conn = mongoose.connection;
  conn.removeAllListeners('disconnected');
  conn.removeAllListeners('error');

  conn.on('error', (err) => {
    console.error('[mongo] connection error:', err.message);
  });

  conn.on('disconnected', () => {
    console.warn('[mongo] disconnected — scheduling reconnect');
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectPromise = null;
      void connectDatabase().catch((err) => {
        console.error('[mongo] reconnect failed:', err instanceof Error ? err.message : err);
      });
    }, BASE_DELAY_MS);
  });
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1 && !isFallbackMode();
}

export async function connectDatabase(): Promise<void> {
  if (config.useMemoryDb) {
    enableFallback();
    loadPersistedStore();
    return;
  }

  if (mongoose.connection.readyState === 1) return;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect().catch(() => undefined);
        }

        await mongoose.connect(config.mongodbUri, MONGO_OPTIONS);
        setupConnectionEvents();
        console.log(`MongoDB connected (pool max=${MONGO_OPTIONS.maxPoolSize}, attempt ${attempt})`);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[mongo] attempt ${attempt}/${MAX_ATTEMPTS} failed: ${msg}`);
        if (attempt === MAX_ATTEMPTS) {
          console.warn('MongoDB unavailable — using in-memory storage');
          enableFallback();
          loadPersistedStore();
          return;
        }
        await delay(Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), 20_000));
      }
    }
  })();

  try {
    await connectPromise;
  } finally {
    if (mongoose.connection.readyState !== 1 && !isFallbackMode()) {
      connectPromise = null;
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isFallbackMode()) {
    await mongoose.disconnect();
  }
  connectPromise = null;
}
