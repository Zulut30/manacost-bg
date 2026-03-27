'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';

interface BgCard {
  id: number;
  slug: string;
  name: string;
  text: string;
  cardTypeId?: number;
  minionTypeId?: number;
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

type CategoryKey = 'all' | 'minion' | 'hero' | 'spell' | 'anomaly' | 'quest' | 'special' | 'other';

const CATEGORIES: { key: CategoryKey; label: string; icon: string }[] = [
  { key: 'all',     label: 'Все',         icon: '📚' },
  { key: 'minion',  label: 'Существа',    icon: '⚔️' },
  { key: 'hero',    label: 'Герои',       icon: '👑' },
  { key: 'spell',   label: 'Заклинания',  icon: '✨' },
  { key: 'anomaly', label: 'Аномалии',    icon: '🌀' },
  { key: 'quest',   label: 'Задачи',      icon: '📜' },
  { key: 'special', label: 'Особые',      icon: '🔮' },
  { key: 'other',   label: 'Прочее',      icon: '❓' },
];

const TRIBE_MAP: Record<number, string> = {
  14: 'Мурлок', 15: 'Демон', 17: 'Механизм', 18: 'Зверь',
  20: 'Пират',  24: 'Дракон', 26: 'Элементаль', 43: 'Квилборн',
  92: 'Нага',   93: 'Ундерол', 97: 'Спелункер',  11: 'Нежить',
  23: 'Другие',
};

export default function HomePage() {
  const [cards, setCards] = useState<BgCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterTribe, setFilterTribe] = useState('all');
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/cards')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCards(data.cards ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const countByCategory = useMemo(() => {
    const m: Record<string, number> = { all: cards.length };
    for (const c of cards) {
      m[c.category] = (m[c.category] ?? 0) + 1;
    }
    return m;
  }, [cards]);

  const tiers = useMemo(() => {
    if (activeCategory !== 'all' && activeCategory !== 'minion') return [];
    const t = new Set<number>();
    cards.filter((c) => c.category === 'minion').forEach((c) => { if (c.tier) t.add(c.tier); });
    return [...t].sort((a, b) => a - b);
  }, [cards, activeCategory]);

  const tribes = useMemo(() => {
    if (activeCategory !== 'all' && activeCategory !== 'minion') return [];
    const t = new Set<number>();
    cards.filter((c) => c.category === 'minion').forEach((c) => {
      if (c.minionTypeId) t.add(c.minionTypeId);
    });
    return [...t].sort((a, b) => a - b);
  }, [cards, activeCategory]);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (activeCategory !== 'all' && c.category !== activeCategory) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterTier !== 'all' && String(c.tier) !== filterTier) return false;
      if (filterTribe !== 'all' && String(c.minionTypeId) !== filterTribe) return false;
      return true;
    });
  }, [cards, activeCategory, search, filterTier, filterTribe]);

  function handleImgError(id: number) {
    setImgErrors((prev) => new Set(prev).add(id));
  }

  const showTierFilter = activeCategory === 'all' || activeCategory === 'minion';
  const showTribeFilter = activeCategory === 'all' || activeCategory === 'minion';

  return (
    <>
      <header className="header">
        <h1>⚔️ BG Карты</h1>
        <div className="controls">
          <input
            className="search-input"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {showTierFilter && tiers.length > 0 && (
            <select className="filter-select" value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
              <option value="all">Все тиры</option>
              {tiers.map((t) => <option key={t} value={String(t)}>Тир {t}</option>)}
            </select>
          )}
          {showTribeFilter && tribes.length > 0 && (
            <select className="filter-select" value={filterTribe} onChange={(e) => setFilterTribe(e.target.value)}>
              <option value="all">Все расы</option>
              {tribes.map((t) => (
                <option key={t} value={String(t)}>{TRIBE_MAP[t] ?? `Раса ${t}`}</option>
              ))}
            </select>
          )}
        </div>
      </header>

      <nav className="tabs-bar">
        {CATEGORIES.map(({ key, label, icon }) => {
          const count = countByCategory[key] ?? 0;
          if (key !== 'all' && count === 0) return null;
          return (
            <button
              key={key}
              className={`tab${activeCategory === key ? ' active' : ''}`}
              onClick={() => {
                setActiveCategory(key);
                setFilterTier('all');
                setFilterTribe('all');
              }}
            >
              {icon} {label}
              <span className="tab-count">{key === 'all' ? cards.length : count}</span>
            </button>
          );
        })}
      </nav>

      <div className="stats-bar">
        {loading
          ? 'Загрузка карт...'
          : `Показано: ${filtered.length} из ${cards.length} карт`}
      </div>

      <main className="main">
        {loading && (
          <div className="loading">
            <div className="spinner" />
            Загружаем карты Battlegrounds...
          </div>
        )}

        {error && (
          <div className="error">
            <strong>Ошибка:</strong> {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty">Карты не найдены</div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="cards-grid">
            {filtered.map((card) => (
              <div key={card.id} className="card-item" title={card.name}>
                <div className="card-image-wrapper">
                  {card.tier && <span className="tier-overlay">Тир {card.tier}</span>}
                  {card.duosOnly && <span className="duos-overlay">Дуо</span>}

                  {imgErrors.has(card.id) || !card.image ? (
                    <div className="card-placeholder">🃏</div>
                  ) : (
                    <Image
                      src={card.image}
                      alt={card.name}
                      fill
                      sizes="200px"
                      style={{ objectFit: 'cover' }}
                      onError={() => handleImgError(card.id)}
                      unoptimized
                    />
                  )}
                </div>

                <div className="card-info">
                  <div className="card-name">{card.name}</div>
                  <div className="card-meta">
                    {card.minionTypeId && (
                      <span className="badge badge-tribe">
                        {TRIBE_MAP[card.minionTypeId] ?? `Раса ${card.minionTypeId}`}
                      </span>
                    )}
                    {card.attack !== undefined && card.health !== undefined && (
                      <span className="badge badge-stat">{card.attack}/{card.health}</span>
                    )}
                    {card.armor !== undefined && card.armor > 0 && (
                      <span className="badge badge-armor">🛡 {card.armor}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
