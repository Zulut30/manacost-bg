import { NextResponse } from 'next/server';

/** Базовый URL backend (FastAPI), заканчивается на /api/v1 — без слэша в конце допускается */
function getSilkBase(): string | null {
  const raw = process.env.SILK_API_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

async function parseJsonSafe(res: Response): Promise<unknown | null> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Тир-лист героев BG (Firestone) — GET /bg/firestone/heroes */
export async function GET() {
  const base = getSilkBase();
  if (!base) {
    return NextResponse.json({
      ok: false,
      error: 'missing_config',
      message:
        'Задайте в Vercel / .env.local переменную SILK_API_BASE_URL — URL вашего backend с префиксом /api/v1 (например https://api.example.com/api/v1). Сайт api-data-silk.vercel.app сейчас отдаёт только HTML-документацию, не JSON API.',
    });
  }

  const url = `${base}/bg/firestone/heroes?mmr_percentile=mmr-100`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });

    const data = await parseJsonSafe(res);
    if (data === null) {
      return NextResponse.json({
        ok: false,
        error: 'not_json',
        message:
          'Ответ не JSON (часто это страница документации). Проверьте SILK_API_BASE_URL — должен указывать на рабочий REST backend, а не на статический сайт.',
        httpStatus: res.status,
      });
    }

    if (!res.ok) {
      const msg =
        typeof (data as { message?: string }).message === 'string'
          ? (data as { message: string }).message
          : `HTTP ${res.status}`;
      return NextResponse.json({
        ok: false,
        error: 'upstream',
        message: msg,
        httpStatus: res.status,
      });
    }

    const d = data as { heroes?: unknown[]; total?: number };
    return NextResponse.json({
      ok: true,
      heroes: Array.isArray(d.heroes) ? d.heroes : [],
      total: d.total,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: 'fetch', message });
  }
}
