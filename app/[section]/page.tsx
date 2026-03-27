import type { Metadata } from 'next';
import BgLibraryApp from '@/components/BgLibraryApp';

type Props = {
  params: Promise<{ section: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  if (section === 'meta') {
    return {
      title: 'Мета и тир-листы',
      description:
        'Тир-лист героев Hearthstone Battlegrounds по данным Firestone: среднее место и пикрейт.',
    };
  }
  return {
    title: 'Библиотека карт',
    description: 'Библиотека карт Hearthstone Battlegrounds: существа, заклинания, герои и хрономальные.',
  };
}

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ section: 'biblioteka' }, { section: 'meta' }];
}

export default function SectionPage() {
  return <BgLibraryApp />;
}
