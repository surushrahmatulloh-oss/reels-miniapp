import mongoose from 'mongoose';
import { fetchYouTubeVideos } from '../services/youtube.service.js';

async function main() {
  try {
    const added = await fetchYouTubeVideos();
    console.log(`Done. Total added: ${added}`);
  } catch (err) {
    console.error('Fetch failed:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

main();
