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
export function tierFromPlacement(avg: number | null | undefined): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (avg == null || Number.isNaN(avg)) return 'D';
  if (avg <= 3.5) return 'S';
  if (avg <= 3.85) return 'A';
  if (avg <= 4.2) return 'B';
  if (avg <= 4.55) return 'C';
  return 'D';
}

export function heroPortraitUrl(heroCardId: string | undefined): string | null {
  if (!heroCardId?.trim()) return null;
  return `https://art.hearthstonejson.com/v1/render/latest/ruRU/256x/${heroCardId}.png`;
}
