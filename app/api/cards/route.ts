import { NextResponse } from 'next/server';

const TOKEN_URL = 'https://oauth.battle.net/token';
const CARDS_URL = 'https://us.api.blizzard.com/hearthstone/cards';

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`Token error: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

interface RawCard {
  id: number;
  slug: string;
  name: string;
  text?: string;
  cardTypeId?: number;
  minionTypeId?: number;
  keywordIds?: number[];
  attack?: number;
  health?: number;
  armor?: number;
  manaCost?: number;
  image?: string;
  imageGold?: string;
  cropImage?: string;
  battlegrounds?: {
    hero?: boolean;
    tier?: number;
    quest?: boolean;
    reward?: boolean;
    duosOnly?: boolean;
    solosOnly?: boolean;
    image?: string;
    imageGold?: string;
    heroPowerId?: number;
    companionId?: number;
    upgradeId?: number;
  };
}

function pickImage(card: RawCard): string {
  const bgImg = card.battlegrounds?.image;
  if (bgImg && bgImg.trim()) return bgImg;
  const rootImg = card.image;
  if (rootImg && rootImg.trim()) return rootImg;
  return card.cropImage ?? '';
}

/** Determine a logical category for display */
function getCategory(card: RawCard): string {
  const bg = card.battlegrounds;
  if (bg?.hero) return 'hero';
  if (bg?.quest) return 'quest';
  if (bg?.reward) return 'reward';
  const t = card.cardTypeId;
  if (t === 4) return 'minion';
  if (t === 43) return 'anomaly';
  if (t === 42) return 'spell';
  if (t === 44) return 'trinket';
  if (t === 5) return 'quest';
  if (t === 40 || t === 999) return 'chrono';
  return 'other';
}

async function fetchAllCards(token: string) {
  const allCards: RawCard[] = [];
  let page = 1;
  const pageSize = 500;

  while (true) {
    const url = new URL(CARDS_URL);
    url.searchParams.set('locale', 'ru_RU');
    url.searchParams.set('gameMode', 'battlegrounds');
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error(`Cards API error: ${res.status}`);
    const data = await res.json();

    const cards: RawCard[] = data.cards ?? [];
    allCards.push(...cards);

    if (page >= (data.pageCount ?? 1) || cards.length === 0) break;
    page++;
  }

  return allCards.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    text: c.text ?? '',
    cardTypeId: c.cardTypeId,
    minionTypeId: c.minionTypeId,
    keywordIds: c.keywordIds ?? [],
    attack: c.attack,
    health: c.health,
    armor: c.armor,
    category: getCategory(c),
    image: pickImage(c),
    imageGold: c.battlegrounds?.imageGold || c.imageGold || '',
    tier: c.battlegrounds?.tier,
    hero: c.battlegrounds?.hero ?? false,
    duosOnly: c.battlegrounds?.duosOnly ?? false,
    solosOnly: c.battlegrounds?.solosOnly ?? false,
  }));
}

export async function GET() {
  try {
    const token = await getAccessToken();
    const cards = await fetchAllCards(token);
    return NextResponse.json({ cards, total: cards.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
