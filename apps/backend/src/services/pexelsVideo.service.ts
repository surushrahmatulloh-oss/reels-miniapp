import { config } from '../config.js';

export type PexelsVideoEntry = {
  mp4Url: string;
  thumbnailUrl: string;
  title: string;
  author: string;
  width: number;
  height: number;
  sourceId?: string;
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

/** Extra search terms per category to reach unique video targets */
const CATEGORY_QUERY_VARIANTS: Record<string, string[]> = {
  music: ['music concert', 'musician performing', 'live music vertical'],
  travel: ['travel adventure', 'city walking', 'beach travel vertical'],
  food: ['cooking food', 'restaurant chef', 'street food vertical'],
  sport: ['sport fitness', 'running workout', 'basketball vertical'],
  tech: ['technology', 'smartphone tech', 'coding laptop vertical'],
  comedy: ['funny people', 'comedy sketch', 'friends laughing vertical'],
  fashion: ['fashion model', 'street fashion', 'makeup beauty vertical'],
  nature: ['nature landscape', 'forest trees', 'ocean waves vertical'],
  education: ['education study', 'student classroom', 'library reading vertical'],
  dance: ['dance', 'hip hop dance', 'ballet performance vertical'],
  cooking: ['chef cooking', 'kitchen recipe', 'baking vertical'],
  fitness: ['workout gym', 'yoga stretch', 'home exercise vertical'],
  animals: ['wild animals', 'pets dogs', 'birds nature vertical'],
  art: ['art creative', 'painting artist', 'street art vertical'],
  gaming: ['gaming', 'esports player', 'video game vertical'],
  news: ['city street', 'urban life', 'people walking vertical'],
  health: ['yoga wellness', 'meditation calm', 'healthy lifestyle vertical'],
  business: ['business office', 'meeting work', 'entrepreneur vertical'],
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
  id?: number;
};
type PixabayResponse = { hits?: PixabayHit[] };

const API_PAGE_SIZE = 80;
const MAX_PAGES_PER_QUERY = 80;
const REQUEST_DELAY_MS = 180;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

/** Dedupe key: prefer Pexels/Pixabay asset id over full CDN URL */
export function videoDedupeKey(url: string, sourceId?: string): string {
  if (sourceId) return sourceId;
  const pexels = url.match(/video-files\/(\d+)\//i);
  if (pexels) return `pexels:${pexels[1]}`;
  const pixabay = url.match(/cdn\.pixabay\.com\/video\/(\d+)\//i);
  if (pixabay) return `pixabay:${pixabay[1]}`;
  return url.split('?')[0]!;
}

export function isFakeSeedUrl(url: string): boolean {
  return /\?seed=/i.test(url);
}

function mapPexelsVideo(v: PexelsVideo, query: string): PexelsVideoEntry | null {
  const file = pickMp4(v.video_files);
  if (!file?.link) return null;
  return {
    mp4Url: file.link.split('?')[0]!,
    thumbnailUrl: v.image ?? '',
    title: query,
    author: v.user?.name ?? 'Pexels',
    width: file.width ?? 720,
    height: file.height ?? 1280,
    sourceId: `pexels:${v.id}`,
  };
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
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    console.warn(`[pexels] ${res.status} for query="${query}" page=${page}`);
    return [];
  }

  const data = (await res.json()) as PexelsResponse;
  const out: PexelsVideoEntry[] = [];

  for (const v of data.videos ?? []) {
    const entry = mapPexelsVideo(v, query);
    if (entry) out.push(entry);
  }
  return out;
}

async function fetchPexelsPopular(perPage: number, page: number): Promise<PexelsVideoEntry[]> {
  const apiKey = pexelsAuthKey();
  if (!apiKey) return [];

  const url = new URL('https://api.pexels.com/videos/popular');
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));

  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    console.warn(`[pexels] popular ${res.status} page=${page}`);
    return [];
  }

  const data = (await res.json()) as PexelsResponse;
  const out: PexelsVideoEntry[] = [];
  for (const v of data.videos ?? []) {
    const entry = mapPexelsVideo(v, 'popular');
    if (!entry) continue;
    if ((entry.height ?? 0) < (entry.width ?? 0)) continue;
    out.push(entry);
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
    if ((v.height ?? 0) < (v.width ?? 0)) continue;
    out.push({
      mp4Url: v.url.split('?')[0]!,
      thumbnailUrl: hit.pageURL ?? '',
      title: hit.tags ?? query,
      author: hit.user ?? 'Pixabay',
      width: v.width ?? 720,
      height: v.height ?? 1280,
      sourceId: hit.id != null ? `pixabay:${hit.id}` : undefined,
    });
  }
  return out;
}

async function collectFromPagedFetcher(
  fetchPage: (page: number) => Promise<PexelsVideoEntry[]>,
  targetCount: number,
  seen: Set<string>,
  collected: PexelsVideoEntry[],
): Promise<void> {
  let emptyStreak = 0;
  for (let page = 1; page <= MAX_PAGES_PER_QUERY && collected.length < targetCount; page++) {
    const items = await fetchPage(page);
    if (!items.length) {
      emptyStreak++;
      if (emptyStreak >= 2) break;
      await sleep(REQUEST_DELAY_MS);
      continue;
    }
    emptyStreak = 0;

    for (const item of items) {
      if (isFakeSeedUrl(item.mp4Url)) continue;
      const key = videoDedupeKey(item.mp4Url, item.sourceId);
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(item);
      if (collected.length >= targetCount) return;
    }

    await sleep(REQUEST_DELAY_MS);
  }
}

export async function fetchVideosForCategory(
  category: string,
  targetCount: number,
  globalSeen?: Set<string>,
): Promise<PexelsVideoEntry[]> {
  const queries = CATEGORY_QUERY_VARIANTS[category] ?? [CATEGORY_QUERIES[category] ?? category];
  const collected: PexelsVideoEntry[] = [];
  const seen = globalSeen ?? new Set<string>();

  const hasPexels = Boolean(pexelsAuthKey());
  const hasPixabay = Boolean(config.pixabayApiKey);

  if (!hasPexels && !hasPixabay) {
    console.error(
      `[pexels] PEXELS_API_KEY ё PIXABAY_API_KEY зарур аст — seed бе API танҳо URL-ҳои такрорӣ месозад.`,
    );
    return [];
  }

  if (hasPexels) {
    for (const query of queries) {
      if (collected.length >= targetCount) break;
      await collectFromPagedFetcher(
        (page) => fetchPexels(query, API_PAGE_SIZE, page),
        targetCount,
        seen,
        collected,
      );
    }

    if (collected.length < targetCount) {
      await collectFromPagedFetcher(
        (page) => fetchPexelsPopular(API_PAGE_SIZE, page),
        targetCount,
        seen,
        collected,
      );
    }
  }

  if (hasPixabay && collected.length < targetCount) {
    for (const query of queries) {
      if (collected.length >= targetCount) break;
      await collectFromPagedFetcher(
        (page) => fetchPixabay(query, Math.min(API_PAGE_SIZE, 200), page),
        targetCount,
        seen,
        collected,
      );
    }
  }

  if (collected.length < targetCount) {
    console.warn(
      `[pexels] ${category}: ${collected.length}/${targetCount} unique API videos (no fake ?seed= padding)`,
    );
  }

  return collected.slice(0, targetCount);
}

export function isPlayableMp4Url(url: string): boolean {
  if (!url || isFakeSeedUrl(url)) return false;
  if (/youtube\.com|youtu\.be/i.test(url)) return false;
  return (
    /\.mp4(\?|$)/i.test(url) ||
    /videos\.pexels\.com|cdn\.pixabay\.com|commondatastorage\.googleapis\.com|interactive-examples\.mdn/i.test(
      url,
    )
  );
}

export { CATEGORY_QUERIES };
