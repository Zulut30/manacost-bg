/** Сопоставление hero_card_id (slug) → русское имя из библиотеки карт */
export function buildHeroRuLookup(
  cards: Array<{ slug: string; name: string; category: string }>,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of cards) {
    if (c.category !== 'hero' || !c.slug) continue;
    m.set(c.slug, c.name);
  }
  return m;
}

export function resolveHeroRuName(
  row: { hero_card_id?: string; hero_name?: string },
  lookup: Map<string, string>,
): string {
  const id = row.hero_card_id;
  if (id && lookup.has(id)) return lookup.get(id)!;
  return row.hero_name ?? '—';
}

/** Периоды из Firestone / HSReplay — в подписи на русском */
export function translateFirestonePeriod(p?: string | null): string {
  if (!p) return '—';
  const t = p.trim().toLowerCase().replace(/_/g, '-');
  const map: Record<string, string> = {
    'last-patch': 'Текущий патч',
    'current-patch': 'Текущий патч',
    'last-7-days': 'Последние 7 дней',
    'last-30-days': 'Последние 30 дней',
    'last-patch-battlegrounds': 'Текущий патч BG',
  };
  return map[t] ?? p;
}

/** Тир по среднему месту (чем ниже avg_placement, тем лучше) */
export type TierLetter = 'S' | 'A' | 'B' | 'C' | 'D';

export const TIER_ORDER: TierLetter[] = ['S', 'A', 'B', 'C', 'D'];

export function tierFromPlacement(avg: number | null | undefined): TierLetter {
  if (avg == null || Number.isNaN(avg)) return 'D';
  if (avg <= 3.5) return 'S';
  if (avg <= 3.85) return 'A';
  if (avg <= 4.2) return 'B';
  if (avg <= 4.55) return 'C';
  return 'D';
}

/** Броня и Дуо по slug героя из библиотеки карт */
export function buildHeroExtrasLookup(
  cards: Array<{ slug: string; category: string; armor?: number; duosOnly: boolean }>,
): Map<string, { armor?: number; duosOnly: boolean }> {
  const m = new Map<string, { armor?: number; duosOnly: boolean }>();
  for (const c of cards) {
    if (c.category !== 'hero' || !c.slug) continue;
    m.set(c.slug, { armor: c.armor, duosOnly: c.duosOnly });
  }
  return m;
}

export function groupRowsByTier<T extends { avg_placement?: number | null }>(
  rows: T[],
  tierOf: (row: T) => TierLetter,
): Map<TierLetter, T[]> {
  const map = new Map<TierLetter, T[]>();
  for (const t of TIER_ORDER) map.set(t, []);
  for (const row of rows) {
    const tier = tierOf(row);
    map.get(tier)!.push(row);
  }
  return map;
}

export function heroPortraitUrl(heroCardId: string | undefined): string | null {
  if (!heroCardId?.trim()) return null;
  return `https://art.hearthstonejson.com/v1/render/latest/ruRU/256x/${heroCardId}.png`;
}
