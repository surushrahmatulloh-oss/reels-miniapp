import mongoose from 'mongoose';
import { seedSampleVideos } from '../services/sampleVideoSeed.service.js';

async function main() {
  const clear = process.argv.includes('--clear');
  try {
    const result = await seedSampleVideos({ clear });
    console.log('\n=== Seed Result ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Seed failed:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

main();
