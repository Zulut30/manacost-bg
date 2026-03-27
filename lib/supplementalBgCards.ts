/**
 * Карты BG, которые не попадают в ответ Blizzard Game Data API в нужном виде,
 * подмешиваются из HearthstoneJSON (по dbfId).
 */
export const SUPPLEMENTAL_CHRONO_DBF_IDS: number[] = [
  129289, // Хрономальная секретность (BG34_Treasure_625)
  126156, // Хрономальный вор-искусник (BG34_Treasure_902)
];

function stripCardText(html: string | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface CardPayload {
  id: number;
  slug: string;
  name: string;
  text: string;
  cardTypeId?: number;
  minionTypeId?: number;
  keywordIds: number[];
  attack?: number;
  health?: number;
  armor?: number;
  category: string;
  image: string;
  imageGold: string;
  tier?: number;
  manaCost: number | null;
  hero: boolean;
  duosOnly: boolean;
  solosOnly: boolean;
}

export async function fetchSupplementalBattlegroundsCards(): Promise<CardPayload[]> {
  const res = await fetch('https://api.hearthstonejson.com/v1/latest/ruRU/cards.json', {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [];
  const all: Array<Record<string, unknown> & { dbfId?: number; id?: string; name?: string }> =
    await res.json();
  const out: CardPayload[] = [];
  for (const dbfId of SUPPLEMENTAL_CHRONO_DBF_IDS) {
    const card = all.find((c) => c.dbfId === dbfId);
    if (!card || typeof card.id !== 'string') continue;
    const slug = card.id;
    const tl = card.techLevel as number | undefined;
    const tier =
      typeof tl === 'number' && tl >= 1 && tl <= 6
        ? tl
        : 5;
    const cost = typeof card.cost === 'number' ? card.cost : null;
    out.push({
      id: dbfId,
      slug,
      name: String(card.name ?? ''),
      text: stripCardText(card.text as string | undefined),
      cardTypeId: card.cardTypeId as number | undefined,
      minionTypeId: card.minionTypeId as number | undefined,
      keywordIds: Array.isArray(card.keywordIds) ? (card.keywordIds as number[]) : [],
      attack: card.attack as number | undefined,
      health: card.health as number | undefined,
      armor: card.armor as number | undefined,
      category: 'chrono',
      image: `https://art.hearthstonejson.com/v1/render/latest/ruRU/512x/${slug}.png`,
      imageGold: '',
      tier,
      manaCost: cost,
      hero: false,
      duosOnly: false,
      solosOnly: false,
    });
  }
  return out;
}
