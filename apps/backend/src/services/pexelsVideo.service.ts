import { config } from '../config.js';

export type PexelsVideoEntry = {
  mp4Url: string;
  thumbnailUrl: string;
  title: string;
  author: string;
  width: number;
  height: number;
};

const CATEGORY_QUERIES: Record<string, string> = {
  music: 'music concert',
  travel: 'travel adventure',
  food: 'cooking food',
  sport: 'sport fitness',
  tech: 'technology',
  comedy: 'funny people',
  fashion: 'fashion model',
  nature: 'nature landscape',
  education: 'education study',
  dance: 'dance',
  cooking: 'chef cooking',
  fitness: 'workout gym',
  animals: 'wild animals',
  art: 'art creative',
  gaming: 'gaming',
  news: 'city street',
  health: 'yoga wellness',
  business: 'business office',
};

type PexelsFile = { quality?: string; file_type?: string; link?: string; width?: number; height?: number };
type PexelsVideo = {
  id: number;
  image?: string;
  video_files?: PexelsFile[];
  user?: { name?: string };
};
type PexelsResponse = { videos?: PexelsVideo[]; page?: number; per_page?: number; total_results?: number };

type PixabayHit = {
  videos?: {
    large?: { url?: string; width?: number; height?: number };
    medium?: { url?: string; width?: number; height?: number };
    small?: { url?: string; width?: number; height?: number };
    tiny?: { url?: string; width?: number; height?: number };
  };
  user?: string;
  tags?: string;
  pageURL?: string;
};
type PixabayResponse = { hits?: PixabayHit[] };

function pickMp4(files: PexelsFile[] | undefined): PexelsFile | null {
  if (!files?.length) return null;
  const mp4s = files.filter((f) => f.file_type === 'video/mp4' && f.link);
  if (!mp4s.length) return null;
  const portrait = mp4s.filter((f) => (f.height ?? 0) >= (f.width ?? 0));
  const pool = portrait.length ? portrait : mp4s;
  return pool.sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0] ?? pool[0]!;
}

function pexelsAuthKey(): string {
  const raw = config.pexelsApiKey.trim();
  if (!raw) return '';
  return raw.replace(/^Bearer\s+/i, '');
}

async function fetchPexels(query: string, perPage: number, page: number): Promise<PexelsVideoEntry[]> {
  const apiKey = pexelsAuthKey();
  if (!apiKey) return [];

  const url = new URL('https://api.pexels.com/videos/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));
  url.searchParams.set('orientation', 'portrait');

  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    console.warn(`[pexels] ${res.status} for query="${query}" page=${page}`);
    return [];
  }

  const data = (await res.json()) as PexelsResponse;
  const out: PexelsVideoEntry[] = [];

  for (const v of data.videos ?? []) {
    const file = pickMp4(v.video_files);
    if (!file?.link) continue;
    out.push({
      mp4Url: file.link,
      thumbnailUrl: v.image ?? '',
      title: query,
      author: v.user?.name ?? 'Pexels',
      width: file.width ?? 720,
      height: file.height ?? 1280,
    });
  }
  return out;
}

async function fetchPixabay(query: string, perPage: number, page: number): Promise<PexelsVideoEntry[]> {
  if (!config.pixabayApiKey) return [];

  const url = new URL('https://pixabay.com/api/videos/');
  url.searchParams.set('key', config.pixabayApiKey);
  url.searchParams.set('q', query);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));
  url.searchParams.set('video_type', 'film');

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return [];

  const data = (await res.json()) as PixabayResponse;
  const out: PexelsVideoEntry[] = [];

  for (const hit of data.hits ?? []) {
    const v = hit.videos?.large ?? hit.videos?.medium ?? hit.videos?.small ?? hit.videos?.tiny;
    if (!v?.url) continue;
    out.push({
      mp4Url: v.url,
      thumbnailUrl: hit.pageURL ?? '',
      title: hit.tags ?? query,
      author: hit.user ?? 'Pixabay',
      width: v.width ?? 720,
      height: v.height ?? 1280,
    });
  }
  return out;
}

/** Built-in MP4 samples (always work in HTML5 video) */
const FALLBACK_MP4: PexelsVideoEntry[] = [
  {
    mp4Url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/r1/720/1280',
    title: 'Blazes',
    author: 'Sample',
    width: 1280,
    height: 720,
  },
  {
    mp4Url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/r2/720/1280',
    title: 'Escapes',
    author: 'Sample',
    width: 1280,
    height: 720,
  },
  {
    mp4Url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/r3/720/1280',
    title: 'Fun',
    author: 'Sample',
    width: 1280,
    height: 720,
  },
  {
    mp4Url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/r4/720/1280',
    title: 'Joyrides',
    author: 'Sample',
    width: 1280,
    height: 720,
  },
  {
    mp4Url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/r5/720/1280',
    title: 'Meltdowns',
    author: 'Sample',
    width: 1280,
    height: 720,
  },
  {
    mp4Url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/r6/720/1280',
    title: 'Sintel',
    author: 'Sample',
    width: 1280,
    height: 720,
  },
  {
    mp4Url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/r7/720/1280',
    title: 'Bunny',
    author: 'Sample',
    width: 1280,
    height: 720,
  },
  {
    mp4Url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/r8/720/1280',
    title: 'Dream',
    author: 'Sample',
    width: 1280,
    height: 720,
  },
  {
    mp4Url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/r9/720/1280',
    title: 'Flower',
    author: 'MDN',
    width: 720,
    height: 1280,
  },
  {
    mp4Url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/r10/720/1280',
    title: 'Friday',
    author: 'MDN',
    width: 720,
    height: 1280,
  },
  {
    mp4Url: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_1440_2732_25fps.mp4',
    thumbnailUrl: 'https://images.pexels.com/videos/3195394/pictures/preview-0.jpg',
    title: 'Ocean waves',
    author: 'Pexels',
    width: 1440,
    height: 2732,
  },
  {
    mp4Url: 'https://videos.pexels.com/video-files/854021/854021-hd_720_1366_25fps.mp4',
    thumbnailUrl: 'https://images.pexels.com/videos/854021/pictures/preview-0.jpg',
    title: 'City night',
    author: 'Pexels',
    width: 720,
    height: 1366,
  },
  {
    mp4Url: 'https://videos.pexels.com/video-files/4763824/4763824-hd_1080_1920_30fps.mp4',
    thumbnailUrl: 'https://images.pexels.com/videos/4763824/pictures/preview-0.jpg',
    title: 'Fitness',
    author: 'Pexels',
    width: 1080,
    height: 1920,
  },
  {
    mp4Url: 'https://videos.pexels.com/video-files/4057259/4057259-hd_1080_1920_25fps.mp4',
    thumbnailUrl: 'https://images.pexels.com/videos/4057259/pictures/preview-0.jpg',
    title: 'Cooking',
    author: 'Pexels',
    width: 1080,
    height: 1920,
  },
  {
    mp4Url: 'https://videos.pexels.com/video-files/3045163/3045163-hd_1080_1920_30fps.mp4',
    thumbnailUrl: 'https://images.pexels.com/videos/3045163/pictures/preview-0.jpg',
    title: 'Travel',
    author: 'Pexels',
    width: 1080,
    height: 1920,
  },
  {
    mp4Url: 'https://videos.pexels.com/video-files/2098989/2098989-hd_1080_1920_30fps.mp4',
    thumbnailUrl: 'https://images.pexels.com/videos/2098989/pictures/preview-0.jpg',
    title: 'Dance',
    author: 'Pexels',
    width: 1080,
    height: 1920,
  },
  {
    mp4Url: 'https://videos.pexels.com/video-files/2491284/2491284-hd_1080_1920_25fps.mp4',
    thumbnailUrl: 'https://images.pexels.com/videos/2491284/pictures/preview-0.jpg',
    title: 'Nature',
    author: 'Pexels',
    width: 1080,
    height: 1920,
  },
];

export async function fetchVideosForCategory(
  category: string,
  targetCount: number,
): Promise<PexelsVideoEntry[]> {
  const query = CATEGORY_QUERIES[category] ?? category;
  const collected: PexelsVideoEntry[] = [];
  const seen = new Set<string>();

  const add = (items: PexelsVideoEntry[]) => {
    for (const item of items) {
      if (seen.has(item.mp4Url)) continue;
      seen.add(item.mp4Url);
      collected.push(item);
      if (collected.length >= targetCount) break;
    }
  };

  const hasApi = Boolean(pexelsAuthKey() || config.pixabayApiKey);
  const maxPages = hasApi ? 3 : 0;

  for (let page = 1; page <= maxPages && collected.length < targetCount; page++) {
    add(await fetchPexels(query, 40, page));
    if (collected.length >= targetCount) break;
    add(await fetchPixabay(query, 40, page));
  }

  let i = 0;
  while (collected.length < targetCount) {
    const base = FALLBACK_MP4[i % FALLBACK_MP4.length]!;
    const suffix = `${category}_${i}`;
    add([
      {
        ...base,
        mp4Url: base.mp4Url,
        thumbnailUrl: `https://picsum.photos/seed/${suffix}/720/1280`,
        title: `${base.title} — ${category}`,
      },
    ]);
    i++;
  }

  return collected.slice(0, targetCount);
}

export function isPlayableMp4Url(url: string): boolean {
  if (!url) return false;
  if (/youtube\.com|youtu\.be/i.test(url)) return false;
  return /\.mp4(\?|$)/i.test(url) || /videos\.pexels\.com|cdn\.pixabay\.com|commondatastorage\.googleapis\.com|interactive-examples\.mdn/i.test(url);
}

export { CATEGORY_QUERIES, FALLBACK_MP4 };
