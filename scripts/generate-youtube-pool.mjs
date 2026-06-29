/**
 * Generates apps/backend/src/data/youtubeSamplePool.ts from public YouTube RSS (no API key).
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'apps/backend/src/data/youtubeSamplePool.ts');

const SEED_CATEGORIES = [
  'music',
  'travel',
  'food',
  'sport',
  'tech',
  'comedy',
  'fashion',
  'nature',
  'education',
  'dance',
  'cooking',
  'fitness',
];

const VIDEOS_PER_CATEGORY = 42;

/** YouTube RSS user= feeds (verified working) */
const USER_CHANNELS_BY_CATEGORY = {
  music: ['PewDiePie', 'Smosh', 'RedBull', 'FailArmy', 'CollegeHumor'],
  travel: ['RickSteves', 'LonelyPlanet', 'BBC', 'Discovery', 'HistoryChannel', 'GoPro'],
  food: ['GordonRamsay', 'Babish', 'JamieOliver', 'SeriousEats', 'Tasty'],
  sport: ['NBA', 'Nike', 'UFC', 'RedBull', 'FailArmy', 'Olympics', 'NHL', 'MLB', 'DudePerfect'],
  tech: [
    'GoogleDevelopers',
    'linustechtips',
    'TheVerge',
    'Engadget',
    'WIRED',
    'UnboxTherapy',
    'AndroidAuthority',
    'TechCrunch',
    'Vsauce',
    'minutephysics',
    'Kurzgesagt',
    'CGPGrey',
    'iJustine',
  ],
  comedy: ['CollegeHumor', 'ComedyCentral', 'FailArmy', 'funnyordie', 'Smosh', 'PewDiePie', 'SmoshGames'],
  fashion: ['ELLE', 'FashionNova', 'iJustine', 'Vogue', 'GQ', 'WIRED', 'TheVerge'],
  nature: ['BBCEarth', 'Discovery', 'MinuteEarth', 'BBC', 'HistoryChannel', 'SciShow', 'AsapSCIENCE'],
  education: ['KhanAcademy', 'CrashCourse', 'Numberphile', 'Vsauce', 'minutephysics', 'TED'],
  dance: ['RedBull', 'BTS', 'Smosh', 'PewDiePie'],
  cooking: ['GordonRamsay', 'Babish', 'JamieOliver', 'SeriousEats', 'BonAppetit'],
  fitness: ['Nike', 'UFC', 'NBA', 'RedBull'],
};

/** Extra channels used to fill categories below 63 videos */
const OVERFLOW_CHANNELS = [
  'KhanAcademy', 'CrashCourse', 'Numberphile', 'MarkRober', 'TraversyMedia', 'freeCodeCamp',
  'RealLifeLore', 'Wendover', 'HalfAsInteresting', 'TomScott', 'DomainOfScience', 'PhysicsGirl',
  'NASA', 'NatGeo', 'TED', 'Epicurious', 'FoodNetwork', 'GoPro', 'DJI', 'BonAppetit',
  'AndroidAuthority', '9to5Google', 'TheCodingTrain', '3Blue1Brown', 'SmarterEveryDay',
];

const CHANNEL_ID_FEEDS = {
  music: ['UC3IZKseVpdzPSBaWxBxundA', 'UC8GibK2KZ6K7Z2T9n9J_qTg', 'UC-lHJZR3Gqxm24_Vd_AJ5Yw'],
  food: ['UCwzCMiicL-hBUzyjWiJaseg'],
  tech: [
    'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    'UCBJycsmduvYEL83R_U4JriQ',
    'UCXuqSBlHAE6Xw-yeJA0Tunw',
    'UCZYTClx2T1of7BRZ86-8fow',
    'UCsBjURrPoezykLs9EqgamOA',
  ],
  comedy: ['UCX6OQ3DkcsbYNE6H8uQQuVA'],
  travel: ['UC4AEYEmS3x4K6x6465DQPvg'],
};

/** Top public music / viral IDs (fallback fill) */
const MUSIC_FALLBACK = [
  'dQw4w9WgXcQ', '9bZkp7q19f0', 'kJQP7kiw5Fk', 'fJ9rUzIMcZQ', 'JGwWNGJdvx8', 'hT_nvWreIhg',
  'OPf0YbXqDm0', 'k85mRPqvDos', 'cSBDOqg7KoQ', 'CevxZvSJLk8', '09R8_2nJtjg', '0KSOMA3QBU0',
  '2Vv-BfVoq4g', 'lp-EO5I60KA', 'RbozzKXV1mM', 'fRh_vgS2dFE', '7wtfhZwyrcc', 'DyDfgMOUjCI',
  '4NRXx6U8ABQ', 'ZmDBbnmKpqQ', 'r7qovpFAGrQ', 'q0hyYWKXF0Q', 'kXYiU_JCYtU', 'YQHsXMglC9A',
  'e-ORhEE9VVg', 'nfWlot6h_JM', '60ItHLz5WEA', 'RgKAFMDMlss', 'kffacxfA7G4', 'FTL1wTOJ578',
  'e_04ZrNgpHU', 'vr0Er-vNFjU', 'FkxCV_Xs8Wk', 'pRpeMcUMY8M', 'aJOTlE1W90s', 'qrO4YZeyl0I',
  '1w7OgIMMRc4', '6Ejga4kJUts', 'fLexgOxsZu0', 'nSDgHBxUbVQ', 'QJO3RGBTU7s', 'LHCob76k048',
  'GDu0wM47zik', 'ZbZSe6N_BXs', '1G4isv_Fylg', 'Yykj8861b5A', '3JWTaaS7Ld8', 'ScMzIvxBSi4',
  'q0U8IS5OEe4', 'u5CVsCnxyXg', 'YlUKcNNmywk', '04854XqcfCY', 'pRidRwmkCmM', 'oyEur9irJFE',
  '7PCkvCPvDX0', 'PT2_F-1es_8', '450p7goxZqg', 'Y2XzA-tU18s', 'hLQl3WBRoUE', 'Z9UqZgSJ2Qo',
  'BTTni69onSk', 'J---aiyznGQ', 'astISOttCQ0', 'V1bFr2AWGUA', 'UprcpdwHcKo', '8UVNT4wvIGY',
  '6_b7NDzHQDo', '8Of7gCEfJKQ', '0pRYDFPmLWI', 'UceaB4D0jpo', 'v1t7A8McDuE', 'Sxm4SeriaRE',
];

async function fetchRssByUser(user) {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?user=${user}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const text = await res.text();
  const titles = [...text.matchAll(/<title>([^<]+)<\/title>/g)].map((m) => m[1]);
  const ids = [...text.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)].map((m) => m[1]);
  return ids.map((id, i) => ({
    id,
    title: titles[i + 1] ?? `${user} video`,
    author: user,
  }));
}

async function fetchRssByChannel(channelId) {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const text = await res.text();
  const titles = [...text.matchAll(/<title>([^<]+)<\/title>/g)].map((m) => m[1]);
  const ids = [...text.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)].map((m) => m[1]);
  return ids.map((id, i) => ({
    id,
    title: titles[i + 1] ?? 'YouTube video',
    author: 'YouTube',
  }));
}

async function collectForCategory(category) {
  const entries = [];
  for (const user of USER_CHANNELS_BY_CATEGORY[category] ?? []) {
    try {
      entries.push(...(await fetchRssByUser(user)));
    } catch {
      /* skip */
    }
  }
  for (const ch of CHANNEL_ID_FEEDS[category] ?? []) {
    try {
      entries.push(...(await fetchRssByChannel(ch)));
    } catch {
      /* skip */
    }
  }
  if (category === 'music') {
    entries.push(
      ...MUSIC_FALLBACK.map((id, i) => ({
        id,
        title: `Music hit #${i + 1}`,
        author: 'YouTube Music',
      })),
    );
  }
  return entries;
}

async function buildPool() {
  const globalUsed = new Set();
  const pool = {};
  let overflow = [];

  for (const user of OVERFLOW_CHANNELS) {
    try {
      overflow.push(...(await fetchRssByUser(user)));
    } catch {
      /* skip */
    }
  }

  for (const category of SEED_CATEGORIES) {
    const raw = await collectForCategory(category);
    const picked = [];

    const tryPick = (item) => {
      if (globalUsed.has(item.id)) return false;
      globalUsed.add(item.id);
      picked.push(item);
      return picked.length >= VIDEOS_PER_CATEGORY;
    };

    for (const item of raw) {
      if (tryPick(item)) break;
    }

    if (picked.length < VIDEOS_PER_CATEGORY) {
      for (const item of overflow) {
        if (tryPick(item)) break;
      }
    }

    if (picked.length < VIDEOS_PER_CATEGORY) {
      for (const item of MUSIC_FALLBACK.map((id, i) => ({
        id,
        title: `Popular video #${i + 1}`,
        author: 'YouTube',
      }))) {
        if (tryPick(item)) break;
      }
    }

    pool[category] = picked;
    console.log(`${category}: ${picked.length}/${VIDEOS_PER_CATEGORY}`);
  }

  return pool;
}

const pool = await buildPool();
const total = Object.values(pool).reduce((s, arr) => s + arr.length, 0);
console.log(`Total: ${total} unique videos`);

if (total < 500) {
  console.warn(`Warning: only ${total} videos (target 500+)`);
}

const ts = `/** Auto-generated from public YouTube RSS — no API key required */
export const SEED_CATEGORIES = ${JSON.stringify(SEED_CATEGORIES)} as const;
export type SeedCategory = (typeof SEED_CATEGORIES)[number];
export const VIDEOS_PER_CATEGORY = ${VIDEOS_PER_CATEGORY};

export type SampleVideoEntry = { id: string; title: string; author: string };

export const SAMPLE_YOUTUBE_POOL: Record<SeedCategory, SampleVideoEntry[]> = ${JSON.stringify(pool, null, 2)};
`;

writeFileSync(outFile, ts, 'utf8');
console.log('Wrote', outFile);
