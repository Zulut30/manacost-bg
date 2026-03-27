import { NextResponse } from 'next/server';

const TOKEN_URL = 'https://oauth.battle.net/token';

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
  const data = await res.json();
  return data.access_token as string;
}

export async function GET() {
  try {
    const token = await getAccessToken();
    const base = 'https://us.api.blizzard.com/hearthstone/metadata';
    const headers = { Authorization: `Bearer ${token}` };

    const [kwRes, mtRes] = await Promise.all([
      fetch(`${base}/keywords?locale=ru_RU`, { headers, next: { revalidate: 86400 } }),
      fetch(`${base}/minionTypes?locale=ru_RU`, { headers, next: { revalidate: 86400 } }),
    ]);

    const keywords: { id: number; name: string }[] = await kwRes.json();
    const minionTypes: { id: number; name: string; gameModes?: number[] }[] = await mtRes.json();

    const kwMap: Record<number, string> = {};
    for (const k of keywords) kwMap[k.id] = k.name;

    // Only BG-relevant minion types (gameMode 5 = BG, or known BG tribes)
    const BG_TRIBE_IDS = new Set([11, 14, 15, 17, 18, 20, 23, 24, 26, 43, 92, 93]);
    const tribes = minionTypes
      .filter((m) => BG_TRIBE_IDS.has(m.id))
      .map((m) => ({ id: m.id, name: m.name }));

    return NextResponse.json({ keywords: kwMap, tribes });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
