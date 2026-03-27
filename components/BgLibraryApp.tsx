'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  buildHeroRuLookup,
  heroPortraitUrl,
  resolveHeroRuName,
  tierFromPlacement,
  translateFirestonePeriod,
} from '@/lib/heroMetaDisplay';

// ── Types ─────────────────────────────────────────────────────────────────────
interface BgCard {
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
  tier?: number;
  manaCost?: number | null;
  hero: boolean;
  duosOnly: boolean;
  solosOnly: boolean;
}

/** Малые хрономальные — уровень таверны 3, ключевые — уровень таверны 5 */
const CHRONO_TIER_MINOR = 3;
const CHRONO_TIER_MAJOR = 5;

type ChronoKind = 'minor' | 'major';

function chronoSortKey(c: BgCard): number {
  const m = c.manaCost;
  if (m != null && m > 0) return m;
  return 999;
}

/** Группировка секций по стоимости хронума; -1 = без стоимости (в конец) */
function chronoGroupKey(c: BgCard): number {
  if (c.manaCost != null && c.manaCost > 0) return c.manaCost;
  return -1;
}

type CategoryKey =
  | 'all' | 'minion' | 'hero' | 'spell'
  | 'trinket' | 'anomaly' | 'quest' | 'chrono' | 'other';

// ── Static data (подразделы внутри вкладки «Библиотека») ───────────────────────
const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'all',     label: 'Все'          },
  { key: 'minion',  label: 'Существа'     },
  { key: 'hero',    label: 'Герои'        },
  { key: 'spell',   label: 'Заклинания'   },
  { key: 'trinket', label: 'Аксессуары'   },
  { key: 'anomaly', label: 'Аномалии'     },
  { key: 'quest',   label: 'Задачи'       },
  { key: 'chrono',  label: 'Хрономальные' },
  { key: 'other',   label: 'Прочее'       },
];

type AppSection = 'library' | 'meta';

type FirestoneHeroRow = {
  hero_card_id?: string;
  hero_name?: string;
  avg_placement?: number | null;
  pick_rate?: number | null;
  games_played?: number | null;
  total_offered?: number | null;
  time_period?: string;
};

type FirestoneHeroesPayload = {
  ok?: boolean;
  heroes?: FirestoneHeroRow[];
  total?: number;
  fetchedAt?: string;
  error?: string;
  message?: string;
};

const TRIBE_INFO: Record<number, { name: string; icon: string; glow: string }> = {
  11: { name: 'Нежить',      icon: '/assets/undead.webp',     glow: '#78909C' },
  14: { name: 'Мурлок',      icon: '/assets/murlocs.webp',    glow: '#42A5F5' },
  15: { name: 'Демон',       icon: '/assets/demons.webp',     glow: '#CE93D8' },
  17: { name: 'Механизм',    icon: '/assets/mechs.webp',      glow: '#B0BEC5' },
  18: { name: 'Элементаль',  icon: '/assets/elementals.webp', glow: '#FFAB40' },
  20: { name: 'Зверь',       icon: '/assets/beasts.webp',     glow: '#81C784' },
  23: { name: 'Пират',       icon: '/assets/pirates.webp',    glow: '#7986CB' },
  24: { name: 'Дракон',      icon: '/assets/dragons.webp',    glow: '#EF9A9A' },
  26: { name: 'Все расы',    icon: '/assets/all.webp',        glow: '#FFD54F' },
  43: { name: 'Свинобраз',   icon: '/assets/quilboar.webp',   glow: '#A1887F' },
  92: { name: 'Нага',        icon: '/assets/nagas.webp',      glow: '#4DB6AC' },
  93: { name: 'Древний бог', icon: '/assets/all.webp',        glow: '#9C27B0' },
};

const TIER_TIERS = [1, 2, 3, 4, 5, 6];
const BG_KEYWORD_IDS = [8, 12, 1, 3, 21, 198, 360, 234, 196, 66, 261, 6];

// ── Card component (pure image) ───────────────────────────────────────────────
function CardImage({ card, imgErrors, onImgError, size = '200px' }: {
  card: BgCard;
  imgErrors: Set<number>;
  onImgError: (id: number) => void;
  size?: string;
}) {
  const hasImg = card.image && !imgErrors.has(card.id);
  return (
    <div className="card-img-wrap" title={card.name}>
      {card.duosOnly && <span className="card-duo-badge">Дуо</span>}
      {hasImg ? (
        <Image
          src={card.image}
          alt={card.name}
          fill
          sizes={size}
          style={{ objectFit: 'cover' }}
          onError={() => onImgError(card.id)}
          unoptimized
        />
      ) : (
        <div className="card-placeholder">🃏</div>
      )}
    </div>
  );
}

// ── Tier section divider ──────────────────────────────────────────────────────
function TierDivider({ tier }: { tier: number }) {
  return (
    <div className="tier-divider">
      <div className="tier-divider__line" />
      <div className="tier-divider__center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/tier${tier}.png`} alt={`Уровень Таверны ${tier}`} className="tier-divider__img" />
        <span className="tier-divider__label">Уровень Таверны {tier}</span>
      </div>
      <div className="tier-divider__line" />
    </div>
  );
}

function ChronumDivider({ cost }: { cost: number }) {
  if (cost === -1) {
    return (
      <div className="tier-divider tier-divider--chrono">
        <div className="tier-divider__line" />
        <div className="tier-divider__center">
          <span className="tier-divider__label tier-divider__label--chrono">Без стоимости</span>
        </div>
        <div className="tier-divider__line" />
      </div>
    );
  }
  const showImg = cost >= 1 && cost <= 3;
  return (
    <div className="tier-divider tier-divider--chrono">
      <div className="tier-divider__line" />
      <div className="tier-divider__center">
        {showImg ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/assets/chronum${cost}.webp`} alt={`Хронум ${cost}`} className="tier-divider__img tier-divider__img--chrono" />
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/chronum3.webp" alt="" className="tier-divider__img tier-divider__img--chrono tier-divider__img--chrono-muted" aria-hidden />
          </>
        )}
        <span className="tier-divider__label tier-divider__label--chrono">Хронум {cost}</span>
      </div>
      <div className="tier-divider__line" />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BgLibraryApp() {
  const pathname = usePathname();
  const appSection: AppSection = pathname === '/meta' ? 'meta' : 'library';

  const [cards, setCards]         = useState<BgCard[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [kwMap, setKwMap]         = useState<Record<number, string>>({});
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [search, setSearch]       = useState('');
  const [filterTier, setFilterTier]     = useState<number | null>(null);
  const [filterTribe, setFilterTribe]   = useState<number | null>(null);
  const [filterKeyword, setFilterKeyword] = useState<number | null>(null);
  const [chronoKind, setChronoKind] = useState<ChronoKind>('minor');
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const [firestoneHeroes, setFirestoneHeroes] = useState<FirestoneHeroesPayload | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/cards').then((r) => r.json()),
      fetch('/api/metadata').then((r) => r.json()),
    ])
      .then(([cardData, meta]) => {
        if (cardData.error) throw new Error(cardData.error);
        setCards(cardData.cards ?? []);
        setKwMap(meta.keywords ?? {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (appSection !== 'meta') return;
    let cancelled = false;
    setMetaLoading(true);
    fetch('/api/silk-firestone-heroes')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setFirestoneHeroes(d);
      })
      .catch(() => {
        if (!cancelled) setFirestoneHeroes({ ok: false, error: 'fetch', message: 'Сеть или сервер недоступны.' });
      })
      .finally(() => {
        if (!cancelled) setMetaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appSection]);

  const handleImgError = (id: number) =>
    setImgErrors((prev) => new Set(prev).add(id));

  const countByCategory = useMemo(() => {
    const m: Record<string, number> = { all: cards.length };
    for (const c of cards) m[c.category] = (m[c.category] ?? 0) + 1;
    return m;
  }, [cards]);

  const activeTribeIds = useMemo(() => {
    const s = new Set<number>();
    cards.filter((c) => c.category === 'minion' && c.minionTypeId)
      .forEach((c) => s.add(c.minionTypeId!));
    return [...s].sort((a, b) => a - b);
  }, [cards]);

  const activeKeywordIds = useMemo(() => {
    const s = new Set<number>();
    cards.filter((c) => c.category === 'minion')
      .forEach((c) => c.keywordIds.forEach((k) => s.add(k)));
    return BG_KEYWORD_IDS.filter((k) => s.has(k));
  }, [cards]);

  const heroRuLookup = useMemo(() => buildHeroRuLookup(cards), [cards]);

  const sortedFirestoneHeroes = useMemo((): FirestoneHeroRow[] => {
    if (!firestoneHeroes?.heroes?.length) return [];
    return [...firestoneHeroes.heroes].sort(
      (a, b) => (a.avg_placement ?? 99) - (b.avg_placement ?? 99),
    );
  }, [firestoneHeroes]);

  const maxPickRate = useMemo(() => {
    let m = 1;
    for (const h of sortedFirestoneHeroes) {
      if (typeof h.pick_rate === 'number') m = Math.max(m, h.pick_rate);
    }
    return m;
  }, [sortedFirestoneHeroes]);

  const SORT_BY_TIER: CategoryKey[] = ['minion', 'spell'];

  const filtered = useMemo(() => {
    const wantChronoTier = chronoKind === 'minor' ? CHRONO_TIER_MINOR : CHRONO_TIER_MAJOR;
    const result = cards.filter((c) => {
      if (activeCategory !== 'all' && c.category !== activeCategory) return false;
      if (activeCategory === 'chrono' && c.tier !== wantChronoTier) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterTier !== null && c.tier !== filterTier) return false;
      if (filterTribe !== null && c.minionTypeId !== filterTribe) return false;
      if (filterKeyword !== null && !c.keywordIds.includes(filterKeyword)) return false;
      return true;
    });
    if (activeCategory === 'chrono') {
      result.sort((a, b) => {
        const ka = chronoSortKey(a);
        const kb = chronoSortKey(b);
        if (ka !== kb) return ka - kb;
        return a.name.localeCompare(b.name, 'ru');
      });
    } else if (SORT_BY_TIER.includes(activeCategory)) {
      result.sort((a, b) => (a.tier ?? 999) - (b.tier ?? 999));
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, activeCategory, search, filterTier, filterTribe, filterKeyword, chronoKind]);

  const byTier = useMemo(() => {
    if (activeCategory !== 'minion' && activeCategory !== 'spell') return null;
    const map = new Map<number, BgCard[]>();
    for (const c of filtered) {
      const t = c.tier ?? 0;
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(c);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [filtered, activeCategory]);

  const byChronum = useMemo(() => {
    if (activeCategory !== 'chrono') return null;
    const map = new Map<number, BgCard[]>();
    for (const c of filtered) {
      const k = chronoGroupKey(c);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return [...map.entries()].sort(([a], [b]) => {
      const ao = a === -1 ? 99999 : a;
      const bo = b === -1 ? 99999 : b;
      return ao - bo;
    });
  }, [filtered, activeCategory]);

  function resetFilters() {
    setFilterTier(null);
    setFilterTribe(null);
    setFilterKeyword(null);
    setSearch('');
    setChronoKind('minor');
  }

  const isMinion    = activeCategory === 'minion';
  const isSpell     = activeCategory === 'spell';
  const isChrono    = activeCategory === 'chrono';
  const showFilters = isMinion || isSpell || isChrono;
  const hasFilters  =
    filterTier !== null
    || filterTribe !== null
    || filterKeyword !== null
    || (isChrono && chronoKind !== 'minor');

  return (
    <div className="page-root">

      {/* ════════════════════════════════
          HEADER
      ════════════════════════════════ */}
      <header className="site-header">
        <div className="site-header__inner">
          <Link href="/biblioteka" className="site-header__logo" aria-label="На главную — библиотека">
            <span className="logo-gem">◆</span>
            <span className="logo-text">BG <em>Library</em></span>
          </Link>
          {appSection === 'library' && (
            <div className="site-header__search">
              <svg className="search-ico" viewBox="0 0 20 20" fill="none">
                <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <input
                className="search-input"
                placeholder="Поиск карты..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ════════════════════════════════
          Главное меню: Библиотека | Мета
      ════════════════════════════════ */}
      <nav className="cat-nav cat-nav--root" aria-label="Разделы приложения">
        <div className="cat-nav__inner cat-nav__inner--root cat-nav__inner--split">
          <Link
            href="/biblioteka"
            className={`cat-tab cat-tab--split${appSection === 'library' ? ' active' : ''}`}
            aria-current={appSection === 'library' ? 'page' : undefined}
          >
            Библиотека
            <span className="cat-tab__count">{cards.length}</span>
          </Link>
          <Link
            href="/meta"
            className={`cat-tab cat-tab--split${appSection === 'meta' ? ' active' : ''}`}
            aria-current={appSection === 'meta' ? 'page' : undefined}
          >
            Мета и тир-листы
          </Link>
        </div>
      </nav>
      {appSection === 'library' && (
      <nav className="lib-subnav" aria-label="Разделы библиотеки">
        <div className="lib-subnav__inner">
          {CATEGORIES.map(({ key, label }) => {
            const count = key === 'all' ? cards.length : (countByCategory[key] ?? 0);
            if (key !== 'all' && count === 0) return null;
            return (
              <button
                key={key}
                type="button"
                className={`lib-subnav__tab${activeCategory === key ? ' active' : ''}`}
                onClick={() => {
                  setActiveCategory(key);
                  resetFilters();
                }}
              >
                {label}
                <span className="lib-subnav__count">{count}</span>
              </button>
            );
          })}
        </div>
      </nav>
      )}

      {/* ════════════════════════════════
          FILTER PANEL
      ════════════════════════════════ */}
      {appSection === 'library' && showFilters && !loading && (
        <div className="filter-panel">
          <div className="filter-panel__inner">

            {isChrono && (
              <div className="fp-row">
                <span className="fp-label">Тип</span>
                <div className="chrono-segment" role="tablist" aria-label="Тип хрономальных карт">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={chronoKind === 'minor'}
                    className={`chrono-segment__btn${chronoKind === 'minor' ? ' active' : ''}`}
                    onClick={() => setChronoKind('minor')}
                  >
                    Малые
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={chronoKind === 'major'}
                    className={`chrono-segment__btn${chronoKind === 'major' ? ' active' : ''}`}
                    onClick={() => setChronoKind('major')}
                  >
                    Ключевые
                  </button>
                </div>
              </div>
            )}

            {(isMinion || isSpell) && (
              <>
                {/* Tier row */}
                <div className="fp-row">
                  <span className="fp-label">Уровень Таверны</span>
                  <div className="fp-chips">
                    <button
                      className={`tier-chip${filterTier === null ? ' active' : ''}`}
                      onClick={() => setFilterTier(null)}
                    >
                      Все
                    </button>
                    {TIER_TIERS.map((t) => (
                      <button
                        key={t}
                        className={`tier-chip tier-chip--${t}${filterTier === t ? ' active' : ''}`}
                        onClick={() => setFilterTier(filterTier === t ? null : t)}
                        title={`Уровень Таверны ${t}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/assets/tier${t}.png`} alt={`${t}`} className="tier-chip__img" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tribe + Mechanics row (minions only) */}
                {isMinion && (
                  <div className="fp-row">
                    <span className="fp-label">Раса</span>
                    <div className="fp-chips fp-chips--tribes">
                      {activeTribeIds.map((id) => {
                        const info = TRIBE_INFO[id];
                        if (!info) return null;
                        const active = filterTribe === id;
                        return (
                          <button
                            key={id}
                            className={`tribe-chip${active ? ' active' : ''}`}
                            style={{ '--glow': info.glow } as React.CSSProperties}
                            onClick={() => setFilterTribe(active ? null : id)}
                            title={info.name}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={info.icon} alt={info.name} className="tribe-chip__img" />
                            <span className="tribe-chip__name">{info.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {activeKeywordIds.length > 0 && (
                      <>
                        <span className="fp-label" style={{ marginLeft: 12 }}>Механика</span>
                        <select
                          className="mech-select"
                          value={filterKeyword ?? ''}
                          onChange={(e) => setFilterKeyword(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">Все</option>
                          {activeKeywordIds.map((id) => (
                            <option key={id} value={id}>{kwMap[id] ?? `#${id}`}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          STATUS BAR
      ════════════════════════════════ */}
      {appSection === 'library' && (
      <div className="status-bar">
        <span className="status-bar__count">
          {loading ? 'Загрузка...' : `${filtered.length} из ${cards.length} карт`}
        </span>
        {hasFilters && (
          <button className="reset-btn" onClick={resetFilters}>✕ Сбросить</button>
        )}
      </div>
      )}

      {/* ════════════════════════════════
          CONTENT
      ════════════════════════════════ */}
      <main className="content">
        {appSection === 'meta' && (
          <section className="meta-page" aria-label="Тир-лист героев Firestone">
            <header className="meta-page__header">
              <h1 className="meta-page__title">Тир-лист героев</h1>
              <p className="meta-page__subtitle">
                Статистика Firestone: среднее место в конце партии (чем ниже — тем лучше) и доля выборов героя.
                Имена подставляются на русском из вашей библиотеки карт, если герой есть в списке.
              </p>
            </header>
            {metaLoading && (
              <div className="loading-state loading-state--compact">
                <div className="spinner" />
                <p>Загружаем героев…</p>
              </div>
            )}
            {!metaLoading && firestoneHeroes && firestoneHeroes.ok !== true && (
              <>
                <div className="error-state meta-page__error">
                  <strong>Не удалось загрузить данные.</strong>
                  <p>{firestoneHeroes.message ?? firestoneHeroes.error ?? 'Неизвестная ошибка'}</p>
                </div>
                <p className="meta-page__lead">
                  Проверьте переменную{' '}
                  <code className="meta-page__code">SILK_API_BASE_URL</code> в Vercel и{' '}
                  <a href="https://api-data-silk.vercel.app/#overview" target="_blank" rel="noreferrer">
                    документацию Silk
                  </a>
                  .
                </p>
              </>
            )}
            {!metaLoading && firestoneHeroes?.ok === true && (
              <>
                <div className="meta-page__toolbar">
                  <p className="meta-page__updated">
                    {firestoneHeroes.fetchedAt
                      ? `Обновлено: ${new Date(firestoneHeroes.fetchedAt).toLocaleString('ru-RU')}`
                      : null}
                    {firestoneHeroes.total != null ? ` · Героев в списке: ${firestoneHeroes.total}` : ''}
                  </p>
                  <div className="meta-legend" aria-hidden>
                    <span className="meta-legend__item"><i className="meta-legend__dot meta-legend__dot--s" /> S</span>
                    <span className="meta-legend__item"><i className="meta-legend__dot meta-legend__dot--a" /> A</span>
                    <span className="meta-legend__item"><i className="meta-legend__dot meta-legend__dot--b" /> B</span>
                    <span className="meta-legend__item"><i className="meta-legend__dot meta-legend__dot--c" /> C</span>
                    <span className="meta-legend__item"><i className="meta-legend__dot meta-legend__dot--d" /> D</span>
                    <span className="meta-legend__hint">по среднему месту</span>
                  </div>
                </div>
                <ul className="hero-meta-list">
                  {sortedFirestoneHeroes.map((row, i) => {
                    const ruName = resolveHeroRuName(row, heroRuLookup);
                    const tier = tierFromPlacement(row.avg_placement ?? null);
                    const portrait = heroPortraitUrl(row.hero_card_id);
                    const pick = typeof row.pick_rate === 'number' ? row.pick_rate : 0;
                    const pickBar = maxPickRate > 0 ? Math.min(100, (pick / maxPickRate) * 100) : 0;
                    return (
                      <li key={row.hero_card_id ?? `h-${i}`} className={`hero-meta-card hero-meta-card--tier-${tier.toLowerCase()}`}>
                        <div className="hero-meta-card__rank" title="Место в рейтинге">
                          <span className="hero-meta-card__rank-num">{i + 1}</span>
                        </div>
                        <div className="hero-meta-card__portrait-wrap">
                          {portrait ? (
                            <Image
                              src={portrait}
                              alt={ruName}
                              width={76}
                              height={76}
                              className="hero-meta-card__portrait-img"
                              unoptimized
                            />
                          ) : (
                            <div className="hero-meta-card__portrait-fallback" aria-hidden>?</div>
                          )}
                          <span className={`hero-meta-card__tier-badge hero-meta-card__tier-badge--${tier.toLowerCase()}`}>
                            {tier}
                          </span>
                        </div>
                        <div className="hero-meta-card__main">
                          <h2 className="hero-meta-card__name">{ruName}</h2>
                          <div className="hero-meta-card__stats">
                            <div className="hero-meta-stat">
                              <span className="hero-meta-stat__label">Среднее место</span>
                              <span className="hero-meta-stat__value">
                                {row.avg_placement != null ? row.avg_placement.toFixed(2) : '—'}
                              </span>
                            </div>
                            <div className="hero-meta-stat">
                              <span className="hero-meta-stat__label">Пикрейт</span>
                              <span className="hero-meta-stat__value">
                                {typeof row.pick_rate === 'number' ? `${row.pick_rate.toFixed(1)}%` : '—'}
                              </span>
                            </div>
                            <div className="hero-meta-stat">
                              <span className="hero-meta-stat__label">Игр</span>
                              <span className="hero-meta-stat__value">
                                {row.games_played != null
                                  ? row.games_played.toLocaleString('ru-RU')
                                  : '—'}
                              </span>
                            </div>
                            <div className="hero-meta-stat">
                              <span className="hero-meta-stat__label">Период</span>
                              <span className="hero-meta-stat__value hero-meta-stat__value--small">
                                {translateFirestonePeriod(row.time_period)}
                              </span>
                            </div>
                          </div>
                          {typeof row.pick_rate === 'number' && (
                            <div className="hero-meta-card__bar" aria-hidden>
                              <div
                                className="hero-meta-card__bar-fill"
                                style={{ width: `${pickBar}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <details className="meta-page__details">
                  <summary className="meta-page__details-sum">Подключение API</summary>
                  <p className="meta-page__details-text">
                    В Vercel задайте <code className="meta-page__code">SILK_API_BASE_URL</code> — URL backend с
                    префиксом <code className="meta-page__code">/api/v1</code>. Документация:{' '}
                    <a href="https://api-data-silk.vercel.app/#overview" target="_blank" rel="noreferrer">
                      api-data-silk.vercel.app
                    </a>
                    .
                  </p>
                </details>
              </>
            )}
          </section>
        )}

        {appSection === 'library' && (
          <>
        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Загружаем карты Battlegrounds…</p>
          </div>
        )}
        {error && <div className="error-state">⚠ {error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">Ничего не найдено</div>
        )}

        {/* Grouped by chronum (хрономальные) */}
        {!loading && !error && byChronum && (
          <>
            {byChronum.map(([cost, chronumCards]) => (
              <section key={cost} className="tier-section">
                <ChronumDivider cost={cost} />
                <div className="cards-grid">
                  {chronumCards.map((card) => (
                    <CardImage key={card.id} card={card} imgErrors={imgErrors} onImgError={handleImgError} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        {/* Grouped by tier */}
        {!loading && !error && !byChronum && byTier && (
          <>
            {byTier.map(([tier, tierCards]) => (
              <section key={tier} className="tier-section">
                {tier > 0
                  ? <TierDivider tier={tier} />
                  : <div className="tier-divider tier-divider--notier"><div className="tier-divider__line"/><span style={{color:'rgba(255,255,255,.3)',fontSize:'0.8rem',padding:'0 14px'}}>Без тира</span><div className="tier-divider__line"/></div>
                }
                <div className="cards-grid">
                  {tierCards.map((card) => (
                    <CardImage key={card.id} card={card} imgErrors={imgErrors} onImgError={handleImgError} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        {/* Plain grid (all other tabs) */}
        {!loading && !error && !byChronum && !byTier && filtered.length > 0 && (
          <div className="cards-grid">
            {filtered.map((card) => (
              <CardImage key={card.id} card={card} imgErrors={imgErrors} onImgError={handleImgError} />
            ))}
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}
