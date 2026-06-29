import mongoose from 'mongoose';
import { seedSampleVideos } from '../services/sampleVideoSeed.service.js';

async function main() {
  const clear = process.argv.includes('--clear');
  try {
    const result = await seedSampleVideos({ clear });
    console.log('\n=== Seed Result ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    const msg = (err as Error).message;
    console.error('Seed failed:', msg);
    if (/bad auth|authentication failed/i.test(msg)) {
      console.error('\nMONGODB_URI дар .env нодуруст аст.');
      console.error('→ MongoDB Atlas → Database Access → паролро навсозӣ кунед');
      console.error('→ Connection string-ро дар .env ва Render Environment гузоред');
      console.error('→ Ё seed-ро дар production иҷро кунед: node scripts/trigger-fetch-videos.mjs');
    }
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

main();
