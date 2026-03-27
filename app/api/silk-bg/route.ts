import { NextResponse } from 'next/server';

const SILK = 'https://api-data-silk.vercel.app/api/v1';

/** Прокси к публичному Silk API: тир-листы стратегий BG и статистика карт Firestone */
export async function GET() {
  try {
    const [compsRes, fireRes] = await Promise.all([
      fetch(`${SILK}/bg/hsreplay/comps`, { next: { revalidate: 14_400 } }),
      fetch(`${SILK}/bg/firestone/cards?mmr_percentile=mmr-100&min_played=0`, {
        next: { revalidate: 14_400 },
      }),
    ]);

    const comps = compsRes.ok ? await compsRes.json() : { _error: compsRes.status };
    const firestone = fireRes.ok ? await fireRes.json() : { _error: fireRes.status };

    return NextResponse.json({
      comps,
      firestone,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
