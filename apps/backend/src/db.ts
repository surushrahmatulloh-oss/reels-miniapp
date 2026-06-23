import mongoose from 'mongoose';
import { config } from './config.js';
import { enableFallback, isFallbackMode } from './store/fallback.js';
import { loadPersistedStore } from './persist.js';

export async function connectDatabase(): Promise<void> {
  if (config.useMemoryDb) {
    enableFallback();
    loadPersistedStore();
    return;
  }

  try {
    await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch {
    console.warn('MongoDB unavailable — using in-memory storage');
    enableFallback();
    loadPersistedStore();
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isFallbackMode()) {
    await mongoose.disconnect();
  }
}
