/** Mirror backend expandCategoryIds — keep in sync with apps/backend/src/data/categories.ts */
const LEGACY_MAP: Record<string, string[]> = {
  cars: ['cars', 'automotive', 'business'],
  sport: ['sport', 'fitness', 'dance'],
  football: ['football', 'sport', 'fitness'],
  music: ['music', 'dance'],
  cinema: ['cinema', 'entertainment', 'animation', 'art'],
  tech: ['tech', 'technology', 'science'],
  gaming: ['gaming', 'entertainment'],
  comedy: ['comedy', 'entertainment'],
  news: ['news', 'education'],
  nature: ['nature', 'animals'],
  travel: ['travel', 'food'],
  cooking: ['cooking', 'food'],
};

export function expandCategoryIds(ids: string[]): string[] {
  const out = new Set<string>();
  for (const id of ids) {
    const mapped = LEGACY_MAP[id] ?? [id];
    for (const m of mapped) out.add(m.toLowerCase());
    out.add(id.toLowerCase());
  }
  return [...out];
}

export function videoMatchesCategories(
  video: { category: string; hashtags?: string[] },
  selectedIds: string[],
): boolean {
  if (selectedIds.length === 0) return true;
  const expanded = expandCategoryIds(selectedIds);
  const cat = video.category?.toLowerCase() ?? '';
  if (expanded.includes(cat)) return true;
  return (video.hashtags ?? []).some((h) => expanded.includes(h.toLowerCase()));
}
