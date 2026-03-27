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

type CategoryKey =
  | 'all'
  | 'minion'
  | 'hero'
  | 'spell'
  | 'trinket'
  | 'anomaly'
  | 'quest'
  | 'chrono'
  | 'other';

const CATEGORIES: { key: CategoryKey; label: string; icon: string }[] = [
  { key: 'all',     label: 'Все',              icon: '📚' },
  { key: 'minion',  label: 'Существа',          icon: '⚔️' },
  { key: 'hero',    label: 'Герои',             icon: '👑' },
  { key: 'spell',   label: 'Заклинания',        icon: '✨' },
  { key: 'trinket', label: 'Аксессуары',        icon: '💎' },
  { key: 'anomaly', label: 'Аномалии',          icon: '🌀' },
  { key: 'quest',   label: 'Задачи',            icon: '📜' },
  { key: 'chrono',  label: 'Хрономальные',      icon: '⏳' },
  { key: 'other',   label: 'Прочее',            icon: '❓' },
];

export default function HomePage() {
  const [cards, setCards] = useState<BgCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [search, setSearch] = useState('');
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
    for (const c of cards) m[c.category] = (m[c.category] ?? 0) + 1;
    return m;
  }, [cards]);

  const SORT_BY_TIER: CategoryKey[] = ['minion', 'spell', 'chrono'];

  const filtered = useMemo(() => {
    const result = cards.filter((c) => {
      if (activeCategory !== 'all' && c.category !== activeCategory) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    if (SORT_BY_TIER.includes(activeCategory)) {
      result.sort((a, b) => {
        const ta = a.tier ?? 999;
        const tb = b.tier ?? 999;
        return ta - tb;
      });
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, activeCategory, search]);

  function handleImgError(id: number) {
    setImgErrors((prev) => new Set(prev).add(id));
  }

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
        </div>
      </header>

      <nav className="tabs-bar">
        {CATEGORIES.map(({ key, label, icon }) => {
          const count = key === 'all' ? cards.length : (countByCategory[key] ?? 0);
          if (key !== 'all' && count === 0) return null;
          return (
            <button
              key={key}
              className={`tab${activeCategory === key ? ' active' : ''}`}
              onClick={() => setActiveCategory(key)}
            >
              {icon} {label}
              <span className="tab-count">{count}</span>
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
                  {card.duosOnly && (
                    <span className="duos-overlay">Дуо</span>
                  )}
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
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
