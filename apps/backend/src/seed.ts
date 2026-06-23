import mongoose from 'mongoose';
import { connectDatabase } from './db.js';
import { Video } from './models/Video.js';
import { CATEGORIES } from './services/feed.service.js';

const SAMPLE_VIDEOS = [
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/reels1/720/1280',
    caption: 'Amazing travel vibes #travel #nature',
    musicTitle: 'Summer Vibes',
    authorName: 'TravelDaily',
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/reels2/720/1280',
    caption: 'Workout motivation #sport #fitness',
    musicTitle: 'Energy Beat',
    authorName: 'FitLife',
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/reels3/720/1280',
    caption: 'Delicious recipe in 60 seconds #food #cooking',
    musicTitle: 'Kitchen Groove',
    authorName: 'ChefTaj',
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/reels4/720/1280',
    caption: 'Tech tips you need #technology #tips',
    musicTitle: 'Digital Flow',
    authorName: 'TechHub',
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/reels5/720/1280',
    caption: 'Fashion trends 2025 #fashion #style',
    musicTitle: 'Runway',
    authorName: 'StyleTG',
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/reels6/720/1280',
    caption: 'Animation masterpiece #animation #art',
    musicTitle: 'Epic Score',
    authorName: 'AnimWorld',
  },
];

async function seed() {
  await connectDatabase();

  const count = await Video.countDocuments();
  if (count > 0) {
    console.log(`Database already has ${count} videos, skipping seed.`);
    await mongoose.disconnect();
    return;
  }

  const formats = ['reels', 'reels', 'reels', 'igtv', 'stories'] as const;
  const docs = [];

  for (let i = 0; i < 30; i++) {
    const sample = SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length]!;
    const category = CATEGORIES[i % CATEGORIES.length]!;
    const format = formats[i % formats.length]!;

    docs.push({
      instagramId: `ig_seed_${i + 1}`,
      url: sample.url,
      thumbnailUrl: `${sample.thumbnailUrl}?v=${i}`,
      format,
      category,
      hashtags: [category, 'reels', 'viral'],
      caption: sample.caption,
      authorName: sample.authorName,
      authorAvatar: `https://i.pravatar.cc/150?u=${sample.authorName}`,
      musicTitle: sample.musicTitle,
      likes: Math.floor(Math.random() * 5000) + 100,
      views: Math.floor(Math.random() * 50000) + 1000,
      commentsCount: Math.floor(Math.random() * 200),
      sharesCount: Math.floor(Math.random() * 100),
      savesCount: Math.floor(Math.random() * 300),
      createdAt: new Date(Date.now() - i * 3600000),
    });
  }

  await Video.insertMany(docs);
  console.log(`Seeded ${docs.length} videos`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
