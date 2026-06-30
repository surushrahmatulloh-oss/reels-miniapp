/** Resolve search query to category id(s) — supports Tajik labels and emoji. */
export const CATEGORY_ALIASES: Record<string, string> = {
  music: 'music',
  мусиқӣ: 'music',
  '🎵': 'music',
  travel: 'travel',
  сафар: 'travel',
  '✈️': 'travel',
  food: 'food',
  таом: 'food',
  '🍳': 'food',
  sport: 'sport',
  варзиш: 'sport',
  '⚽': 'sport',
  tech: 'tech',
  technology: 'tech',
  технология: 'tech',
  '💻': 'tech',
  comedy: 'comedy',
  комедия: 'comedy',
  '😂': 'comedy',
  fashion: 'fashion',
  мода: 'fashion',
  '👗': 'fashion',
  nature: 'nature',
  табиат: 'nature',
  '🌿': 'nature',
  education: 'education',
  таълим: 'education',
  '📚': 'education',
  dance: 'dance',
  рақс: 'dance',
  '💃': 'dance',
  cooking: 'cooking',
  пухтупаз: 'cooking',
  '👨‍🍳': 'cooking',
  fitness: 'fitness',
  фитнес: 'fitness',
  '💪': 'fitness',
  animals: 'animals',
  art: 'art',
  gaming: 'gaming',
  news: 'news',
  health: 'health',
  business: 'business',
  entertainment: 'entertainment',
  animation: 'animation',
  science: 'science',
};

export function resolveCategoryQuery(q: string): string | null {
  const trimmed = q.trim().toLowerCase();
  if (!trimmed) return null;
  if (CATEGORY_ALIASES[trimmed]) return CATEGORY_ALIASES[trimmed];
  for (const [alias, id] of Object.entries(CATEGORY_ALIASES)) {
    if (alias.length >= 3 && trimmed.includes(alias.toLowerCase())) return id;
  }
  return null;
}

export function isFormatQuery(q: string): boolean {
  return /^(reels|igtv|stories)$/i.test(q.trim());
}
