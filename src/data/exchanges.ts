// Clean MVP exchange data — replaces portal-era exchanges.json for new pages
// go/[exchange].astro still reads exchanges.json; this file drives the new clean pages

export interface Exchange {
  slug: string;
  name: string;
  logoText: string;         // display name / short brand text
  status: 'active' | 'inactive' | 'pending';
  cardImage: string;        // 1200×800, 3:2 — homepage grid card
  ogImage: string;          // 1200×630 — og:image
  articleImage: string;     // 1200×675 — article inline image
  affiliateUrl: string;     // always use internal /go/[slug] route
  officialUrl: string;      // for fact table display (no tracking)
  shortDescription: string; // one line for cards
  featured: boolean;
  pageUrl?: string;         // override content page URL (e.g. /bybit/ instead of /exchanges/bybit/)
}

export const exchanges: Exchange[] = [
  {
    slug:             'bybit',
    name:             'Bybit',
    logoText:         'BYBIT',
    status:           'active',
    cardImage:        '/media/exchanges/bybit/cards/bybit-card-golden-v1-1200x800.jpg',
    ogImage:          '/media/exchanges/bybit/share/bybit-og-golden-v1-1200x630.jpg',
    articleImage:     '/media/exchanges/bybit/article/bybit-article-golden-v1-1200x675.jpg',
    affiliateUrl:     '/go/bybit',
    officialUrl:      'https://www.bybit.com',
    shortDescription: 'Leading derivatives & spot exchange with up to 30,000 USDT welcome rewards',
    featured:         true,
    pageUrl:          '/bybit/',
  },
];

export function getExchange(slug: string): Exchange | undefined {
  return exchanges.find(e => e.slug === slug);
}

export function getFeaturedExchanges(): Exchange[] {
  return exchanges.filter(e => e.status === 'active' && e.featured);
}
