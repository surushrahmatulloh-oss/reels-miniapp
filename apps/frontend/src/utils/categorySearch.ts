import { CATEGORIES } from '@/types';

const ALIASES: Record<string, string> = {
  football: 'football',
  футбол: 'football',
  soccer: 'football',
  cars: 'cars',
  автомобилҳо: 'cars',
  автомобил: 'cars',
  sport: 'sport',
  варзиш: 'sport',
  music: 'music',
  мусиқӣ: 'music',
  cinema: 'cinema',
  кино: 'cinema',
  movie: 'cinema',
  tech: 'tech',
  технология: 'tech',
  technology: 'tech',
  gaming: 'gaming',
  бозиҳо: 'gaming',
  games: 'gaming',
  comedy: 'comedy',
  ҳаҷв: 'comedy',
  комедия: 'comedy',
  news: 'news',
  хабарҳо: 'news',
  хабар: 'news',
  nature: 'nature',
  табиат: 'nature',
  travel: 'travel',
  сафар: 'travel',
  cooking: 'cooking',
  ошпазӣ: 'cooking',
  пухтупаз: 'cooking',
  таом: 'cooking',
  food: 'cooking',
};

export function resolveCategoryQuery(q: string): string | null {
  const trimmed = q.trim().toLowerCase();
  if (!trimmed) return null;
  if (ALIASES[trimmed]) return ALIASES[trimmed];
  const byId = CATEGORIES.find((c) => c.id === trimmed);
  if (byId) return byId.id;
  const byLabel = CATEGORIES.find((c) => c.label.toLowerCase() === trimmed);
  if (byLabel) return byLabel.id;
  for (const cat of CATEGORIES) {
    const label = cat.label.toLowerCase();
    if (trimmed.includes(label) || label.includes(trimmed)) return cat.id;
  }
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (alias.length >= 3 && trimmed.includes(alias)) return id;
  }
  return null;
}

export function buildSearchQuery(input: string, activeCategory: string | null): string {
  const resolved = resolveCategoryQuery(input);
  if (resolved) return resolved;
  if (activeCategory && !input.trim()) return activeCategory;
  return input.trim();
}
