/**
 * Generates apps/backend/src/data/youtubeSamplePool.ts
 * Sources: YouTube Data API (if key) + public RSS feeds from 250+ channels.
 * Target: 18 categories × 112 = 2016 unique real YouTube embed IDs.
 */
import { writeFileSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'apps/backend/src/data/youtubeSamplePool.ts');

function loadEnvFile(file) {
  const env = {};
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const t = line.replace(/^\uFEFF/, '').replace(/\r$/, '').trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = {
  ...loadEnvFile(path.join(root, '.env')),
  ...loadEnvFile(path.join(root, '.env.deploy')),
  ...process.env,
};

const SEED_CATEGORIES = [
  'music', 'travel', 'food', 'sport', 'tech', 'comedy', 'fashion', 'nature',
  'education', 'dance', 'cooking', 'fitness', 'animals', 'art', 'gaming',
  'news', 'health', 'business',
];

const VIDEOS_PER_CATEGORY = 112;

/** Our categories → YouTube Data API videoCategoryId */
const YT_CATEGORY_MAP = {
  music: '10',
  animals: '15',
  sport: '17',
  travel: '19',
  gaming: '20',
  comedy: '23',
  fashion: '26',
  education: '27',
  tech: '28',
  food: '26',
  nature: '15',
  dance: '10',
  cooking: '26',
  fitness: '17',
  art: '26',
  news: '25',
  health: '27',
  business: '25',
};

const REGIONS = ['US', 'GB', 'DE', 'FR', 'JP', 'IN', 'BR', 'RU', 'KR', 'MX'];

const RSS_USERS = [
  'PewDiePie', 'Smosh', 'RedBull', 'FailArmy', 'CollegeHumor', 'RickSteves', 'LonelyPlanet',
  'BBC', 'Discovery', 'HistoryChannel', 'GoPro', 'GordonRamsay', 'Babish', 'JamieOliver',
  'SeriousEats', 'Tasty', 'NBA', 'Nike', 'UFC', 'Olympics', 'NHL', 'MLB', 'DudePerfect',
  'ESPN', 'FIFA', 'GoogleDevelopers', 'linustechtips', 'TheVerge', 'Engadget', 'WIRED',
  'UnboxTherapy', 'AndroidAuthority', 'TechCrunch', 'Vsauce', 'minutephysics', 'Kurzgesagt',
  'CGPGrey', 'iJustine', 'MKBHD', 'MarquesBrownlee', 'ComedyCentral', 'funnyordie',
  'SaturdayNightLive', 'ELLE', 'Vogue', 'GQ', 'BBCEarth', 'MinuteEarth', 'NatGeo',
  'NationalGeographic', 'KhanAcademy', 'CrashCourse', 'Numberphile', 'TED', '3Blue1Brown',
  'Veritasium', 'BTS', 'VEVO', 'BonAppetit', 'FoodWishes', 'Epicurious', 'FoodNetwork',
  'Bodybuildingcom', 'AthleanX', 'AnimalPlanet', 'TheDodo', 'BraveWilderness', 'Tate',
  'Proko', 'DrawWithJazza', 'BlenderGuru', 'IGN', 'GameSpot', 'nintendo', 'PlayStation',
  'Xbox', 'CNN', 'Reuters', 'AlJazeeraEnglish', 'ABCNews', 'CBSNews', 'NBCNews', 'Bloomberg',
  'Forbes', 'CNBC', 'GaryVee', 'MarkRober', 'TraversyMedia', 'freeCodeCamp', 'SmarterEveryDay',
  'PhysicsGirl', 'NASA', 'TEDxTalks', '9to5Google', 'TheCodingTrain', 'RealLifeLore',
  'Wendover', 'HalfAsInteresting', 'TomScott', 'Hypebeast', '1MILLIONDanceStudio', 'SMTOWN',
  'SciShow', 'AsapSCIENCE', 'HealthcareTriage', 'MayoClinic', 'BusinessInsider', 'DWNews',
  'FRANCE24', 'SkyNews', 'AdobeCreativeCloud', 'RockstarGames', 'EA', 'Ubisoft', 'Pinkfong',
  'Cocomelon', 'LooLooKids', 'EdSheeran', 'WizKhalifa', 'Maroon5', 'JustinBieber', 'Shakira',
  'KatyPerry', 'OneRepublic', 'Psy', 'MarkRonson', 'LuisFonsiVEVO', 'EminemVEVO', 'TaylorSwift',
  'Coldplay', 'ImagineDragons', 'LinkinPark', 'QueenOfficial', 'Metallica', 'BillieEilish',
  'TheWeekndVEVO', 'DrakeOfficial', 'PostMaloneVEVO', 'DuaLipa', 'HarryStylesVEVO', 'BrunoMars',
  'LadyGagaVEVO', 'ArianaGrandeVevo', 'MarshmelloVEVO', 'AlanWalker', 'DavidGuetta',
  'CalvinHarrisVEVO', 'MartinGarrix', 'ZeddVEVO', 'KygoVEVO', 'ChainsmokersVEVO', 'Gorillaz',
  'RadioheadVEVO', 'GreenDayVEVO', 'Blink182VEVO', 'FallOutBoyVEVO', 'TwentyOnePilots',
  'ParamoreVEVO', 'WeezerVEVO', 'TheCureVEVO', 'DepecheModeVEVO', 'JoyDivisionVEVO',
  'PrimalScreamVEVO', 'NatGeoWild', 'BBCNews', 'SkyNews', 'FoxNews', 'MSNBC', 'WashingtonPost',
  'NYTimes', 'GuardianNews', 'Vox', 'ViceNews', 'AJEnglish', 'euronews', 'TRTWorld',
  'WION', 'NDTV', 'AsianBoss', 'YesTheory', 'KaraandNate', 'EvaZuBeck', 'FlyingTheNest',
  'SamuelandAudrey', 'TheFoodRanger', 'BestEverFoodReview', 'MarkWiens', 'MikeyChenX',
  'StrictlyDumpling', 'SORTEDFood', 'SamTheCookingGuy', 'JoshuaWeissman', 'ProHomeCooks',
  'BingingWithBabish', 'FoodInsider', 'TechLinked', 'ShortCircuit', 'Dave2D', 'JerryRigEverything',
  'MrMobile', 'TheUnlockr', 'CNET', 'DigitalTrends', 'Tomsguide', 'PCWorld', 'HardwareCanucks',
  'GamersNexus', 'LinusTechTips', 'JayzTwoCents', 'PaulsHardware', 'TechYESCity', 'TechAltar',
  'MrBeast', 'MrBeastGaming', 'DudePerfect', 'Corridor', 'CorridorDigital', 'RocketJump',
  'RoosterTeeth', 'AchievementHunter', 'Funhaus', 'GameGrumps', 'NintendoLife', 'Eurogamer',
  'Polygon', 'Kotaku', 'PCGamer', 'GameInformer', 'PlayStationAccess', 'XboxOn', 'Nintendo',
  'AdobeVideo', 'Photoshop', 'Illustrator', 'Behance', 'ArtStationHQ', 'ProkoTV', 'Drawabox',
  'NewMastersAcademy', 'LoveLifeDrawing', 'SchaeferArt', 'BobRoss', 'GreatArtExplained',
  'TheArtAssignment', 'MuseumOfModernArt', 'TateShots', 'NationalGallery', 'LouvreMuseum',
  'YogaWithAdriene', 'Blogilates', 'ChloeTing', 'PamelaRf1', 'MadFit', 'HASfit', 'FitnessBlender',
  'ScottHermanFitness', 'JeffNippard', 'RenaissancePeriodization', 'StrongerByScience',
  'Calisthenicmovement', 'THENX', 'ChrisHeria', 'GlobalCyclingNetwork', 'GMBNFitness',
  'RedBullDance', 'STEEZY', 'DanceTutorialsLIVE', 'MattSteffanina', 'MihranTV',
  'SanDiegoZoo', 'SmithsonianChannel', 'DeepLook', 'PBS', 'PBSDigitalStudios', 'NOVA',
  'SciFri', 'ItsOkayToBeSmart', 'BeSmart', 'PBSInfiniteSeries', 'Standupmaths', 'Tibees',
  'FlammableMaths', 'blackpenredpen', 'patrickJMT', 'ProfessorLeonard', 'MITOpenCourseWare',
  'Stanford', 'Harvard', 'YaleCourses', 'UCBerkeley', 'OxfordUniversity', 'CambridgeUniversity',
  'WorldEconomicForum', 'TEDEd', 'BigThink', 'HubermanLab', 'DoctorMike', 'Chubbyemu',
  'MedlifeCrisis', 'Kurzgesagt', 'MinutePhysics', 'DomainOfScience', 'ArvinAsh', 'ScienceAsylum',
];

async function fetchRssByUser(user) {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?user=${user}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const titles = [...text.matchAll(/<title>([^<]+)<\/title>/g)].map((m) => m[1]);
    const ids = [...text.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)].map((m) => m[1]);
    return ids.map((id, i) => ({ id, title: titles[i + 1] ?? `${user} video`, author: user }));
  } catch {
    return [];
  }
}

async function fetchRssByChannel(channelId) {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const titles = [...text.matchAll(/<title>([^<]+)<\/title>/g)].map((m) => m[1]);
    const ids = [...text.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)].map((m) => m[1]);
    return ids.map((id, i) => ({ id, title: titles[i + 1] ?? 'YouTube video', author: 'YouTube' }));
  } catch {
    return [];
  }
}

async function fetchViaYouTubeApi(apiKey) {
  const seen = new Set();
  const pool = [];

  const add = (items) => {
    for (const item of items) {
      if (!item.id || seen.has(item.id)) continue;
      seen.add(item.id);
      pool.push(item);
    }
  };

  for (const region of REGIONS) {
    for (const ytCat of [...new Set(Object.values(YT_CATEGORY_MAP))]) {
      try {
        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('chart', 'mostPopular');
        url.searchParams.set('regionCode', region);
        url.searchParams.set('videoCategoryId', ytCat);
        url.searchParams.set('maxResults', '50');
        url.searchParams.set('key', apiKey);
        const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        if (!res.ok) continue;
        const data = await res.json();
        add(
          (data.items ?? []).map((v) => ({
            id: v.id,
            title: v.snippet?.title ?? 'YouTube video',
            author: v.snippet?.channelTitle ?? 'YouTube',
          })),
        );
      } catch {
        /* skip */
      }
    }
    console.log(`[api] region ${region}: ${pool.length} unique`);
  }

  return pool;
}

async function fetchViaRss() {
  const seen = new Set();
  const pool = [];
  const users = [...new Set(RSS_USERS)];

  for (let i = 0; i < users.length; i += 25) {
    const batch = users.slice(i, i + 25);
    const results = await Promise.all(batch.map((u) => fetchRssByUser(u)));
    for (const videos of results) {
      for (const v of videos) {
        if (!v.id || seen.has(v.id)) continue;
        seen.add(v.id);
        pool.push(v);
      }
    }
    process.stdout.write(`\r[rss] ${Math.min(i + 25, users.length)}/${users.length} channels → ${pool.length} unique`);
  }
  console.log('');

  const extraChannels = [
    'UC-lHJZR3Gqxm24_Vd_AJ5Yw', 'UCX6OQ3DkcsbYNE6H8uQQuVA', 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    'UCBJycsmduvYEL83R_U4JriQ', 'UCXuqSBlHAE6Xw-yeJA0Tunw', 'UCZYTClx2T1of7BRZ86-8fow',
    'UCsBjURrPoezykLs9EqgamOA', 'UC4a-Gbdw7v2accDmGoX3uHA', 'UC6107grRI4m0o2-emgojnAA',
    'UCpVm7bg6pXKo1Pr6k5kxG9A', 'UCpko_-a4wgz2u_DgDgd9fqA', 'UC16niRr50-MSBwiO3YDb3RA',
    'UCBR8-60-B28hp2BmDPdntcQ', 'UCoOae5nYA7VqaXzerajD0lg', 'UCq-Fj5jknLsUf-MWSy4_brA',
    'UCY1kMZp36IQSRxQIzq8RfvY', 'UCJ5v_MCY4GNUBTR8NANjKwA', 'UCwzCMiicL-hBUzyjWiJaseg',
    'UC4AEYEmS3x4K6x6465DQPvg', 'UCWJ2lWNubArHWmf3-4t4Aow', 'UCsooa4yRKGN_eeMEO6yKsvA',
    'UC7_gcs09iThXy5TIF4V1_nA', 'UCqECaJ0GAsbhyK_-6iKc3Kw', 'UCJkOIffmTEe4Zrr23BU9gng',
    'UCoxcjq-8zIDGYp3QLlrM_vw', 'UCbpmy0F4Ii6JXiyX09WqIRw', 'UCJFpDEs_R9g3O_UfJcX5cBg',
    'UCpRYz6a_b0IHhYpNH9a7lHA', 'UC2Ey8REBkyhfa8s4ulQg4PA', 'UCqVDpXKK_mE7P5lWEyCo_g',
    'UCJ0-OtVpF0wOKEhXtbuHhTg', 'UCoMdktPbSTixAyZkPw3Cp7Q', 'UC3IZKseVpdzPSBaWxBxundA',
    'UC8GibK2KZ6K7Z2T9n9J_qTg', 'UC0C-w0YjGpqDXGB81IWE4eg', 'UC2C_jS4Z7TKCHyf_JssA9o',
    'UCa10nxShhzNrCQbd9lfmQuQ', 'UCoSrY_IQQVpmIRZ9Xf-y93g', 'UC-9-kyTW8ZkZNDHQJ6FgpwQ',
    'UC3IZKseVpdzPSBaWxBxundA', 'UCX6OQ3DkcsbYNE6H8uQQuVA', 'UCsBjURrPoezykLs9EqgamOA',
    'UCZYTClx2T1of7BRZ86-8fow', 'UC4a-Gbdw7v2accDmGoX3uHA', 'UC6107grRI4m0o2-emgojnAA',
    'UCpVm7bg6pXKo1Pr6k5kxG9A', 'UC16niRr50-MSBwiO3YDb3RA', 'UC7_gcs09iThXy5TIF4V1_nA',
    'UCsooa4yRKGN_eeMEO6yKsvA', 'UCqECaJ0GAsbhyK_-6iKc3Kw', 'UCJkOIffmTEe4Zrr23BU9gng',
    'UC4AEYEmS3x4K6x6465DQPvg', 'UCWJ2lWNubArHWmf3-4t4Aow', 'UCwzCMiicL-hBUzyjWiJaseg',
    'UCbpmy0F4Ii6JXiyX09WqIRw', 'UCJFpDEs_R9g3O_UfJcX5cBg', 'UCpRYz6a_b0IHhYpNH9a7lHA',
    'UC2Ey8REBkyhfa8s4ulQg4PA', 'UCqVDpXKK_mE7P5lWEyCo_g', 'UCJ0-OtVpF0wOKEhXtbuHhTg',
    'UC_x5XG1OV2P6uZZ5FSM9Ttw', 'UCBJycsmduvYEL83R_U4JriQ', 'UCXuqSBlHAE6Xw-yeJA0Tunw',
    'UC-lHJZR3Gqxm24_Vd_AJ5Yw', 'UCX6OQ3DkcsbYNE6H8uQQuVA', 'UCBR8-60-B28hp2BmDPdntcQ',
    'UCoOae5nYA7VqaXzerajD0lg', 'UCq-Fj5jknLsUf-MWSy4_brA', 'UCY1kMZp36IQSRxQIzq8RfvY',
    'UCJ5v_MCY4GNUBTR8NANjKwA', 'UCoSrY_IQQVpmIRZ9Xf-y93g', 'UC-9-kyTW8ZkZNDHQJ6FgpwQ',
    'UC3IZKseVpdzPSBaWxBxundA', 'UC8GibK2KZ6K7Z2T9n9J_qTg', 'UC0C-w0YjGpqDXGB81IWE4eg',
    'UC2C_jS4Z7TKCHyf_JssA9o', 'UCa10nxShhzNrCQbd9lfmQuQ', 'UCoxcjq-8zIDGYp3QLlrM_vw',
    'UCoMdktPbSTixAyZkPw3Cp7Q', 'UCpko_-a4wgz2u_DgDgd9fqA', 'UC4a-Gbdw7v2accDmGoX3uHA',
    'UC6107grRI4m0o2-emgojnAA', 'UCsBjURrPoezykLs9EqgamOA', 'UCZYTClx2T1of7BRZ86-8fow',
    'UCpVm7bg6pXKo1Pr6k5kxG9A', 'UC16niRr50-MSBwiO3YDb3RA', 'UC7_gcs09iThXy5TIF4V1_nA',
    'UCsooa4yRKGN_eeMEO6yKsvA', 'UCqECaJ0GAsbhyK_-6iKc3Kw', 'UCJkOIffmTEe4Zrr23BU9gng',
    'UC4AEYEmS3x4K6x6465DQPvg', 'UCWJ2lWNubArHWmf3-4t4Aow', 'UCwzCMiicL-hBUzyjWiJaseg',
    'UCbpmy0F4Ii6JXiyX09WqIRw', 'UCJFpDEs_R9g3O_UfJcX5cBg', 'UCpRYz6a_b0IHhYpNH9a7lHA',
    'UC2Ey8REBkyhfa8s4ulQg4PA', 'UCqVDpXKK_mE7P5lWEyCo_g', 'UCJ0-OtVpF0wOKEhXtbuHhTg',
  ];

  for (let i = 0; i < extraChannels.length; i += 20) {
    const batch = [...new Set(extraChannels)].slice(i, i + 20);
    const results = await Promise.all(batch.map((ch) => fetchRssByChannel(ch)));
    for (const videos of results) {
      for (const v of videos) {
        if (!v.id || seen.has(v.id)) continue;
        seen.add(v.id);
        pool.push(v);
      }
    }
  }
  console.log(`[rss] after channel_ids: ${pool.length} unique`);

  return pool;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function assignPool(masterPool) {
  const globalUsed = new Set();
  const result = Object.fromEntries(SEED_CATEGORIES.map((c) => [c, []]));
  const shuffled = shuffle(masterPool);

  let idx = 0;
  while (idx < shuffled.length) {
    let placed = false;
    for (const cat of SEED_CATEGORIES) {
      if (result[cat].length >= VIDEOS_PER_CATEGORY) continue;
      const item = shuffled[idx];
      if (!item || globalUsed.has(item.id)) {
        idx++;
        continue;
      }
      globalUsed.add(item.id);
      result[cat].push(item);
      idx++;
      placed = true;
      break;
    }
    if (!placed) idx++;
    if (SEED_CATEGORIES.every((c) => result[c].length >= VIDEOS_PER_CATEGORY)) break;
  }

  return result;
}

const apiKey = env.YOUTUBE_API_KEY;
let masterPool = [];

if (apiKey) {
  console.log('Using YouTube Data API...');
  masterPool = await fetchViaYouTubeApi(apiKey);
}

if (masterPool.length < SEED_CATEGORIES.length * VIDEOS_PER_CATEGORY) {
  console.log('Fetching RSS feeds...');
  const rssPool = await fetchViaRss();
  const seen = new Set(masterPool.map((v) => v.id));
  for (const v of rssPool) {
    if (!seen.has(v.id)) {
      seen.add(v.id);
      masterPool.push(v);
    }
  }
}

console.log(`Master pool: ${masterPool.length} unique videos`);

const needed = SEED_CATEGORIES.length * VIDEOS_PER_CATEGORY;
if (masterPool.length < needed) {
  console.error(`ERROR: need ${needed} unique videos, got ${masterPool.length}`);
  process.exit(1);
}

const pool = assignPool(masterPool);

for (const cat of SEED_CATEGORIES) {
  console.log(`${cat}: ${pool[cat].length}/${VIDEOS_PER_CATEGORY}`);
}

const total = Object.values(pool).reduce((s, a) => s + a.length, 0);
console.log(`Total: ${total} unique videos`);

const ts = `/** Auto-generated — real YouTube embed IDs (API + RSS) */
export const SEED_CATEGORIES = ${JSON.stringify(SEED_CATEGORIES)} as const;
export type SeedCategory = (typeof SEED_CATEGORIES)[number];
export const VIDEOS_PER_CATEGORY = ${VIDEOS_PER_CATEGORY};

export type SampleVideoEntry = { id: string; title: string; author: string };

export const SAMPLE_YOUTUBE_POOL: Record<SeedCategory, SampleVideoEntry[]> = ${JSON.stringify(pool, null, 2)};
`;

writeFileSync(outFile, ts, 'utf8');
console.log('Wrote', outFile);
