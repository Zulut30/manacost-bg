'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';

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
  hero: boolean;
  duosOnly: boolean;
  solosOnly: boolean;
}

type CategoryKey =
  | 'all' | 'minion' | 'hero' | 'spell'
  | 'trinket' | 'anomaly' | 'quest' | 'chrono' | 'other';

// ── Static data ───────────────────────────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [cards, setCards]         = useState<BgCard[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [kwMap, setKwMap]         = useState<Record<number, string>>({});
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [search, setSearch]       = useState('');
  const [filterTier, setFilterTier]     = useState<number | null>(null);
  const [filterTribe, setFilterTribe]   = useState<number | null>(null);
  const [filterKeyword, setFilterKeyword] = useState<number | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

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

  const SORT_BY_TIER: CategoryKey[] = ['minion', 'spell', 'chrono'];

  const filtered = useMemo(() => {
    const result = cards.filter((c) => {
      if (activeCategory !== 'all' && c.category !== activeCategory) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterTier !== null && c.tier !== filterTier) return false;
      if (filterTribe !== null && c.minionTypeId !== filterTribe) return false;
      if (filterKeyword !== null && !c.keywordIds.includes(filterKeyword)) return false;
      return true;
    });
    if (SORT_BY_TIER.includes(activeCategory)) {
      result.sort((a, b) => (a.tier ?? 999) - (b.tier ?? 999));
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, activeCategory, search, filterTier, filterTribe, filterKeyword]);

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

  function resetFilters() {
    setFilterTier(null);
    setFilterTribe(null);
    setFilterKeyword(null);
    setSearch('');
  }

  const isMinion    = activeCategory === 'minion';
  const isSpell     = activeCategory === 'spell';
  const showFilters = isMinion || isSpell;
  const hasFilters  = filterTier !== null || filterTribe !== null || filterKeyword !== null;

  return (
    <div className="page-root">

      {/* ════════════════════════════════
          HEADER
      ════════════════════════════════ */}
      <header className="site-header">
        <div className="site-header__inner">
          <div className="site-header__logo">
            <span className="logo-gem">◆</span>
            <span className="logo-text">BG <em>Library</em></span>
          </div>
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
        </div>
      </header>

      {/* ════════════════════════════════
          CATEGORY TABS
      ════════════════════════════════ */}
      <nav className="cat-nav">
        <div className="cat-nav__inner">
          {CATEGORIES.map(({ key, label }) => {
            const count = key === 'all' ? cards.length : (countByCategory[key] ?? 0);
            if (key !== 'all' && count === 0) return null;
            return (
              <button
                key={key}
                className={`cat-tab${activeCategory === key ? ' active' : ''}`}
                onClick={() => { setActiveCategory(key); resetFilters(); }}
              >
                {label}
                <span className="cat-tab__count">{count}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ════════════════════════════════
          FILTER PANEL
      ════════════════════════════════ */}
      {showFilters && !loading && (
        <div className="filter-panel">
          <div className="filter-panel__inner">

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
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          STATUS BAR
      ════════════════════════════════ */}
      <div className="status-bar">
        <span className="status-bar__count">
          {loading ? 'Загрузка...' : `${filtered.length} из ${cards.length} карт`}
        </span>
        {hasFilters && (
          <button className="reset-btn" onClick={resetFilters}>✕ Сбросить</button>
        )}
      </div>

      {/* ════════════════════════════════
          CONTENT
      ════════════════════════════════ */}
      <main className="content">
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

        {/* Grouped by tier */}
        {!loading && !error && byTier && (
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
        {!loading && !error && !byTier && filtered.length > 0 && (
          <div className="cards-grid">
            {filtered.map((card) => (
              <CardImage key={card.id} card={card} imgErrors={imgErrors} onImgError={handleImgError} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
