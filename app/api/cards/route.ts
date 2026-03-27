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
  });

  if (!res.ok) throw new Error(`Token error: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function fetchAllCards(token: string) {
  const allCards: unknown[] = [];
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
    });

    if (!res.ok) throw new Error(`Cards API error: ${res.status}`);
    const data = await res.json();

    const cards = data.cards ?? [];
    allCards.push(...cards);

    if (allCards.length >= data.cardCount || cards.length === 0) break;
    page++;
  }

  return allCards;
}

export async function GET() {
  try {
    const token = await getAccessToken();
    const cards = await fetchAllCards(token);
    return NextResponse.json({ cards });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
