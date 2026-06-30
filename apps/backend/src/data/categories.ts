/** Shared category definitions — keep in sync with frontend types/index.ts */
export const APP_CATEGORIES = [
  { id: 'cars', label: 'Автомобилҳо', emoji: '🚗' },
  { id: 'sport', label: 'Варзиш', emoji: '🏃' },
  { id: 'football', label: 'Футбол', emoji: '⚽' },
  { id: 'music', label: 'Мусиқӣ', emoji: '🎵' },
  { id: 'cinema', label: 'Кино', emoji: '🎬' },
  { id: 'tech', label: 'Технология', emoji: '💻' },
  { id: 'gaming', label: 'Бозиҳо', emoji: '🎮' },
  { id: 'comedy', label: 'Ҳаҷв', emoji: '😂' },
  { id: 'news', label: 'Хабарҳо', emoji: '📰' },
  { id: 'nature', label: 'Табиат', emoji: '🌿' },
  { id: 'travel', label: 'Сафар', emoji: '✈️' },
  { id: 'cooking', label: 'Ошпазӣ', emoji: '👨‍🍳' },
] as const;

export const CATEGORY_IDS = APP_CATEGORIES.map((c) => c.id);

/** Legacy DB category ids → new ids for feed/search */
const LEGACY_MAP: Record<string, string[]> = {
  cars: ['cars', 'automotive', 'business'],
  sport: ['sport', 'fitness', 'dance'],
  football: ['football'],
  music: ['music', 'dance'],
  cinema: ['cinema', 'entertainment', 'animation', 'art'],
  tech: ['tech', 'technology'],
  gaming: ['gaming', 'entertainment'],
  comedy: ['comedy', 'entertainment'],
  news: ['news', 'education'],
  nature: ['nature', 'animals'],
  travel: ['travel', 'food'],
  cooking: ['cooking', 'food'],
};

const ALIASES: Record<string, string> = {};
for (const cat of APP_CATEGORIES) {
  ALIASES[cat.id] = cat.id;
  ALIASES[cat.label.toLowerCase()] = cat.id;
}
Object.assign(ALIASES, {
  football: 'football',
  футбол: 'football',
  soccer: 'football',
  автомобилҳо: 'cars',
  автомобил: 'cars',
  cars: 'cars',
  auto: 'cars',
  варзиш: 'sport',
  мусиқӣ: 'music',
  кино: 'cinema',
  movie: 'cinema',
  movies: 'cinema',
  технология: 'tech',
  technology: 'tech',
  бозиҳо: 'gaming',
  games: 'gaming',
  game: 'gaming',
  ҳаҷв: 'comedy',
  хабарҳо: 'news',
  хабар: 'news',
  табиат: 'nature',
  сафар: 'travel',
  ошпазӣ: 'cooking',
  пухтупаз: 'cooking',
  таом: 'cooking',
  food: 'cooking',
  комедия: 'comedy',
  мода: 'cinema',
  fashion: 'cinema',
  таълим: 'news',
  education: 'news',
  фитнес: 'sport',
  fitness: 'sport',
  рақс: 'music',
  dance: 'music',
  entertainment: 'cinema',
  animation: 'cinema',
  animals: 'nature',
  art: 'cinema',
  health: 'sport',
  business: 'cars',
});

export function resolveCategoryQuery(q: string): string | null {
  const trimmed = q.trim().toLowerCase();
  if (!trimmed) return null;
  if (ALIASES[trimmed]) return ALIASES[trimmed];
  for (const cat of APP_CATEGORIES) {
    if (cat.label.toLowerCase() === trimmed) return cat.id;
    if (trimmed.includes(cat.label.toLowerCase()) || cat.label.toLowerCase().includes(trimmed)) {
      return cat.id;
    }
  }
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (alias.length >= 3 && trimmed.includes(alias)) return id;
  }
  return null;
}

export function expandCategoryIds(ids: string[]): string[] {
  const out = new Set<string>();
  for (const id of ids) {
    const key = id.toLowerCase();
    const mapped = LEGACY_MAP[key] ?? LEGACY_MAP[id] ?? [key];
    for (const m of mapped) out.add(m.toLowerCase());
    out.add(key);
  }
  return [...out];
}

export function isFormatQuery(q: string): boolean {
  return /^(reels|igtv|stories)$/i.test(q.trim());
}
