import { NextResponse } from 'next/server';

/**
 * База API: можно указать только origin (`https://host`) или уже с `/api/v1`.
 * Если `/api/v1` нет в конце — дописываем (как в документации Silk).
 */
function normalizeSilkBase(raw: string): string {
  let b = raw.trim().replace(/\/$/, '');
  if (!b.endsWith('/api/v1')) {
    b = `${b}/api/v1`;
  }
  return b;
}

function getSilkBase(): string | null {
  const raw = process.env.SILK_API_BASE_URL?.trim();
  if (!raw) return null;
  return normalizeSilkBase(raw);
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
        'Задайте в Vercel → Environment Variables переменную SILK_API_BASE_URL. Достаточно корня, например https://api.example.com — путь /api/v1 подставится сам. Важно: на https://api-data-silk.vercel.app развёрнута только HTML-документация; JSON API должен быть на другом URL (ваш FastAPI / Railway / и т.д.).',
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
          'Ответ не JSON (часто HTML-документация). Домен api-data-silk.vercel.app сейчас отдаёт только сайт с докой, не API. Укажите SILK_API_BASE_URL на хост, где реально запущен FastAPI из репозитория Silk (Railway, VPS и т.д.). Запрос идёт на: ' +
          url,
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
