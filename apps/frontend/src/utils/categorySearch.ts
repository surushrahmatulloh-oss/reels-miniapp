import { CATEGORIES } from '@/types';

const CATEGORY_ALIASES: Record<string, string> = {
  music: 'music',
  мусиқӣ: 'music',
  travel: 'travel',
  сафар: 'travel',
  food: 'food',
  таом: 'food',
  sport: 'sport',
  варзиш: 'sport',
  tech: 'tech',
  technology: 'tech',
  технология: 'tech',
  comedy: 'comedy',
  комедия: 'comedy',
  fashion: 'fashion',
  мода: 'fashion',
  nature: 'nature',
  табиат: 'nature',
  education: 'education',
  таълим: 'education',
  dance: 'dance',
  рақс: 'dance',
  cooking: 'cooking',
  пухтупаз: 'cooking',
  fitness: 'fitness',
  фитнес: 'fitness',
};

export function resolveCategoryQuery(q: string): string | null {
  const trimmed = q.trim().toLowerCase();
  if (!trimmed) return null;
  if (CATEGORY_ALIASES[trimmed]) return CATEGORY_ALIASES[trimmed];
  const byId = CATEGORIES.find((c) => c.id === trimmed);
  if (byId) return byId.id;
  const byLabel = CATEGORIES.find((c) => c.label.toLowerCase() === trimmed);
  if (byLabel) return byLabel.id;
  for (const cat of CATEGORIES) {
    if (trimmed.includes(cat.label.toLowerCase()) || cat.label.toLowerCase().includes(trimmed)) {
      return cat.id;
    }
  }
  return null;
}

export function buildSearchQuery(input: string, activeCategory: string | null): string {
  if (activeCategory) return activeCategory;
  const resolved = resolveCategoryQuery(input);
  if (resolved) return resolved;
  return input.trim();
}
