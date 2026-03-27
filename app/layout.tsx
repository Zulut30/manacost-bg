import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Hearthstone Battlegrounds — Карты',
    template: '%s · BG Library',
  },
  description: 'Библиотека карт Hearthstone Battlegrounds',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
