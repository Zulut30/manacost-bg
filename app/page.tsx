'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';

interface BgCard {
  id: number;
  slug: string;
  image: string;
  name: string;
  cardTypeId?: number;
  minionTypeId?: number;
  battlegroundsTier?: number;
  attack?: number;
  health?: number;
}

const TRIBE_MAP: Record<number, string> = {
  14: 'Мурлок',
  15: 'Демон',
  17: 'Механизм',
  18: 'Зверь',
  20: 'Пират',
  24: 'Дракон',
  26: 'Элементаль',
  43: 'Квилборн',
  92: 'Нага',
  93: 'Ундерол',
  97: 'Спелункер',
};

function getImageUrl(card: BgCard): string {
  // Use the slug from Blizzard API — it contains the card ID like "bg34-235-card-name"
  // HearthstoneJSON uses the raw card ID (e.g. BG34_235)
  // We also fall back to the Blizzard-provided image
  const slugId = card.slug.split('-').slice(0, 2);
  if (slugId.length >= 2) {
    // Try to reconstruct something like BG34_235 from slug "bg34-235-..."
    // Actually let's just use the Blizzard image as primary and HearthstoneJSON as fallback
  }
  return card.image;
}

export default function HomePage() {
  const [cards, setCards] = useState<BgCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const tiers = useMemo(() => {
    const t = new Set<number>();
    cards.forEach((c) => { if (c.battlegroundsTier) t.add(c.battlegroundsTier); });
    return [...t].sort((a, b) => a - b);
  }, [cards]);

  const tribes = useMemo(() => {
    const t = new Set<number>();
    cards.forEach((c) => { if (c.minionTypeId) t.add(c.minionTypeId); });
    return [...t].sort((a, b) => a - b);
  }, [cards]);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterTier !== 'all' && String(c.battlegroundsTier) !== filterTier) return false;
      if (filterTribe !== 'all' && String(c.minionTypeId) !== filterTribe) return false;
      return true;
    });
  }, [cards, search, filterTier, filterTribe]);

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
          <select
            className="filter-select"
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
          >
            <option value="all">Все тиры</option>
            {tiers.map((t) => (
              <option key={t} value={String(t)}>Тир {t}</option>
            ))}
          </select>
          <select
            className="filter-select"
            value={filterTribe}
            onChange={(e) => setFilterTribe(e.target.value)}
          >
            <option value="all">Все расы</option>
            {tribes.map((t) => (
              <option key={t} value={String(t)}>
                {TRIBE_MAP[t] ?? `Раса ${t}`}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="stats-bar">
        {loading ? 'Загрузка...' : `Показано: ${filtered.length} из ${cards.length} карт`}
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

        {!loading && !error && (
          <div className="cards-grid">
            {filtered.map((card) => (
              <div key={card.id} className="card-item" title={card.name}>
                <div className="card-image-wrapper">
                  {imgErrors.has(card.id) ? (
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
                    {card.battlegroundsTier && (
                      <span className="badge badge-tier">Тир {card.battlegroundsTier}</span>
                    )}
                    {card.minionTypeId && (
                      <span className="badge badge-tribe">
                        {TRIBE_MAP[card.minionTypeId] ?? `Раса ${card.minionTypeId}`}
                      </span>
                    )}
                    {card.attack !== undefined && card.health !== undefined && (
                      <span className="badge badge-type">
                        {card.attack}/{card.health}
                      </span>
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
