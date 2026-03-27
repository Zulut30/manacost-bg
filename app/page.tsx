'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';

// ── Types ────────────────────────────────────────────────────────────────────
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
const CATEGORIES: { key: CategoryKey; label: string; icon: string }[] = [
  { key: 'all',     label: 'Все',          icon: '📚' },
  { key: 'minion',  label: 'Существа',     icon: '⚔️' },
  { key: 'hero',    label: 'Герои',        icon: '👑' },
  { key: 'spell',   label: 'Заклинания',   icon: '✨' },
  { key: 'trinket', label: 'Аксессуары',   icon: '💎' },
  { key: 'anomaly', label: 'Аномалии',     icon: '🌀' },
  { key: 'quest',   label: 'Задачи',       icon: '📜' },
  { key: 'chrono',  label: 'Хрономальные', icon: '⏳' },
  { key: 'other',   label: 'Прочее',       icon: '❓' },
];

// Correct tribe map based on Blizzard metadata (gameMode 5 = BG)
const TRIBE_INFO: Record<number, { name: string; icon: string; color: string; glow: string }> = {
  11: { name: 'Нежить',      icon: '/assets/undead.webp',    color: '#3d4f5c', glow: '#78909C' },
  14: { name: 'Мурлок',      icon: '/assets/murlocs.webp',   color: '#0d47a1', glow: '#42A5F5' },
  15: { name: 'Демон',       icon: '/assets/demons.webp',    color: '#4a148c', glow: '#CE93D8' },
  17: { name: 'Механизм',    icon: '/assets/mechs.webp',     color: '#263238', glow: '#B0BEC5' },
  18: { name: 'Элементаль',  icon: '/assets/elementals.webp',color: '#bf360c', glow: '#FFAB40' },
  20: { name: 'Зверь',       icon: '/assets/beasts.webp',    color: '#1b5e20', glow: '#81C784' },
  23: { name: 'Пират',       icon: '/assets/pirates.webp',   color: '#0d1f6e', glow: '#7986CB' },
  24: { name: 'Дракон',      icon: '/assets/dragons.webp',   color: '#7f0000', glow: '#EF9A9A' },
  26: { name: 'Все расы',    icon: '/assets/all.webp',       color: '#4a3300', glow: '#FFD54F' },
  43: { name: 'Свинобраз',   icon: '/assets/quilboar.webp',  color: '#3e2723', glow: '#A1887F' },
  92: { name: 'Нага',        icon: '/assets/nagas.webp',     color: '#00352a', glow: '#4DB6AC' },
  93: { name: 'Древний бог', icon: '/assets/all.webp',       color: '#1a1030', glow: '#9C27B0' },
};

// Tier data for display
const TIER_TIERS = [1, 2, 3, 4, 5, 6];

// BG-relevant keyword IDs (from data analysis - most common in BG cards)
const BG_KEYWORD_IDS = [8, 12, 1, 3, 21, 198, 360, 234, 196, 66, 11, 261, 6, 78];

// ── Helper ────────────────────────────────────────────────────────────────────
function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// ── Sub-components ────────────────────────────────────────────────────────────
function TierLabel({ tier }: { tier: number }) {
  return (
    <div className="tier-section-header">
      <div className="tier-shield-badge" data-tier={tier}>{tier}</div>
      <span>Тир {tier}</span>
      <div className="tier-section-line" />
    </div>
  );
}

function MinionCard({ card, imgErrors, onImgError }: {
  card: BgCard;
  imgErrors: Set<number>;
  onImgError: (id: number) => void;
}) {
  const tribe = card.minionTypeId ? TRIBE_INFO[card.minionTypeId] : null;
  const hasImage = card.image && !imgErrors.has(card.id);

  return (
    <div className="minion-card" title={card.name}>
      <div className="minion-card__img">
        {card.duosOnly && <span className="duo-badge">Дуо</span>}
        {hasImage ? (
          <Image
            src={card.image}
            alt={card.name}
            fill
            sizes="220px"
            style={{ objectFit: 'cover' }}
            onError={() => onImgError(card.id)}
            unoptimized
          />
        ) : (
          <div className="card-placeholder">🃏</div>
        )}
      </div>
      <div className="minion-card__info">
        <div className="minion-card__name">{card.name}</div>
        {card.text && (
          <div className="minion-card__text">{stripHtml(card.text)}</div>
        )}
        <div className="minion-card__meta">
          {tribe && (
            <span
              className="tribe-badge"
              style={{ '--tribe-color': tribe.color, '--tribe-glow': tribe.glow } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tribe.icon} alt={tribe.name} className="tribe-badge__icon" />
              {tribe.name}
            </span>
          )}
          {card.attack !== undefined && card.health !== undefined && (
            <span className="stat-badge">
              <span className="stat-atk">{card.attack}</span>
              <span className="stat-sep">/</span>
              <span className="stat-hp">{card.health}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PlainCard({ card, imgErrors, onImgError }: {
  card: BgCard;
  imgErrors: Set<number>;
  onImgError: (id: number) => void;
}) {
  return (
    <div className="plain-card" title={card.name}>
      {card.duosOnly && <span className="duo-badge">Дуо</span>}
      {card.image && !imgErrors.has(card.id) ? (
        <Image
          src={card.image}
          alt={card.name}
          fill
          sizes="180px"
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

// ── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [cards, setCards]           = useState<BgCard[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [kwMap, setKwMap]           = useState<Record<number, string>>({});
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [search, setSearch]         = useState('');
  const [filterTier, setFilterTier] = useState<number | null>(null);
  const [filterTribe, setFilterTribe] = useState<number | null>(null);
  const [filterKeyword, setFilterKeyword] = useState<number | null>(null);
  const [imgErrors, setImgErrors]   = useState<Set<number>>(new Set());

  // Fetch cards + metadata in parallel
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

  function handleImgError(id: number) {
    setImgErrors((prev) => new Set(prev).add(id));
  }

  // Count per category
  const countByCategory = useMemo(() => {
    const m: Record<string, number> = { all: cards.length };
    for (const c of cards) m[c.category] = (m[c.category] ?? 0) + 1;
    return m;
  }, [cards]);

  // Tribes that actually appear in current minion cards
  const activeTribeIds = useMemo(() => {
    const s = new Set<number>();
    cards.filter((c) => c.category === 'minion' && c.minionTypeId)
      .forEach((c) => s.add(c.minionTypeId!));
    return [...s].sort((a, b) => a - b);
  }, [cards]);

  // Keywords that appear in current minion cards
  const activeKeywordIds = useMemo(() => {
    const s = new Set<number>();
    cards.filter((c) => c.category === 'minion')
      .forEach((c) => c.keywordIds.forEach((k) => s.add(k)));
    return BG_KEYWORD_IDS.filter((k) => s.has(k));
  }, [cards]);

  // Sort/filter/group logic
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

  // Group by tier (for minion and spell views)
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

  const isMinion = activeCategory === 'minion';
  const isSpell  = activeCategory === 'spell';
  const showFilters = isMinion || isSpell;

  return (
    <>
      {/* ── Header ── */}
      <header className="header">
        <h1>⚔️ BG Карты</h1>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Поиск: например, Боевой клич, Мурлок, Дракон..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav className="tabs-bar">
        {CATEGORIES.map(({ key, label, icon }) => {
          const count = key === 'all' ? cards.length : (countByCategory[key] ?? 0);
          if (key !== 'all' && count === 0) return null;
          return (
            <button
              key={key}
              className={`tab${activeCategory === key ? ' active' : ''}`}
              onClick={() => { setActiveCategory(key); resetFilters(); }}
            >
              {icon} {label}
              <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Filter bar (minions + spells) ── */}
      {showFilters && !loading && (
        <div className="filter-bar">
          {/* Tier shields */}
          <div className="filter-section">
            <button
              className={`tier-btn${filterTier === null ? ' active' : ''}`}
              onClick={() => setFilterTier(null)}
              title="Все тиры"
            >
              <span className="tier-btn__label">Все</span>
            </button>
            {TIER_TIERS.map((t) => (
              <button
                key={t}
                className={`tier-btn${filterTier === t ? ' active' : ''}`}
                onClick={() => setFilterTier(filterTier === t ? null : t)}
                title={`Тир ${t}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/assets/tier${t}.png`} alt={`Тир ${t}`} className="tier-btn__img" />
              </button>
            ))}
          </div>

          {/* Tribe circles (minions only) */}
          {isMinion && (
            <>
              <div className="filter-divider" />
              <div className="filter-section">
                {activeTribeIds.map((id) => {
                  const info = TRIBE_INFO[id];
                  if (!info) return null;
                  const isActive = filterTribe === id;
                  return (
                    <button
                      key={id}
                      className={`tribe-circle${isActive ? ' active' : ''}`}
                      style={{ '--tc': info.color, '--tg': info.glow } as React.CSSProperties}
                      onClick={() => setFilterTribe(isActive ? null : id)}
                      title={info.name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={info.icon} alt={info.name} className="tribe-circle__img" />
                      <span className="tribe-circle__name">{info.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mechanics dropdown */}
              {activeKeywordIds.length > 0 && (
                <>
                  <div className="filter-divider" />
                  <select
                    className="mechanics-select"
                    value={filterKeyword ?? ''}
                    onChange={(e) => setFilterKeyword(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Механики</option>
                    {activeKeywordIds.map((id) => (
                      <option key={id} value={id}>
                        {kwMap[id] ?? `Механика ${id}`}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Stats bar ── */}
      <div className="stats-bar">
        {loading
          ? 'Загрузка карт...'
          : `Показано: ${filtered.length} из ${cards.length} карт`}
        {(filterTier !== null || filterTribe !== null || filterKeyword !== null) && (
          <button className="reset-btn" onClick={resetFilters}>✕ Сбросить фильтры</button>
        )}
      </div>

      {/* ── Main content ── */}
      <main className="main">
        {loading && (
          <div className="loading">
            <div className="spinner" />
            Загружаем карты Battlegrounds...
          </div>
        )}
        {error && <div className="error"><strong>Ошибка:</strong> {error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="empty">Карты не найдены</div>
        )}

        {/* Minions & Spells: grouped by tier */}
        {!loading && !error && byTier && byTier.length > 0 && (
          <div>
            {byTier.map(([tier, tierCards]) => (
              <div key={tier} className="tier-group">
                {tier > 0 ? <TierLabel tier={tier} /> : (
                  <div className="tier-section-header">
                    <span style={{ color: 'rgba(224,224,224,0.4)', fontSize: '0.85rem' }}>Без тира</span>
                    <div className="tier-section-line" />
                  </div>
                )}
                {isMinion ? (
                  <div className="minion-grid">
                    {tierCards.map((card) => (
                      <MinionCard
                        key={card.id}
                        card={card}
                        imgErrors={imgErrors}
                        onImgError={handleImgError}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="plain-grid">
                    {tierCards.map((card) => (
                      <div key={card.id} className="plain-card-wrap">
                        <PlainCard card={card} imgErrors={imgErrors} onImgError={handleImgError} />
                        <div className="plain-card-name">{card.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* All other categories: plain image grid */}
        {!loading && !error && !byTier && filtered.length > 0 && (
          <div className="plain-grid">
            {filtered.map((card) => (
              <div key={card.id} className="plain-card-wrap">
                <PlainCard card={card} imgErrors={imgErrors} onImgError={handleImgError} />
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
