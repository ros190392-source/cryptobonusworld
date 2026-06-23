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
    cardImage:        '/media/exchanges/bybit/final/bybit-card-final-v1-1200x800.jpg',
    ogImage:          '/media/exchanges/bybit/final/bybit-og-final-v1-1200x630.jpg',
    articleImage:     '/media/exchanges/bybit/final/bybit-article-final-v1-1200x675.jpg',
    affiliateUrl:     '/go/bybit',
    officialUrl:      'https://www.bybit.com',
    shortDescription: 'Leading derivatives & spot exchange with up to 30,000 USDT welcome rewards',
    featured:         true,
    pageUrl:          '/bybit/',
  },
  {
    slug:             'mexc',
    name:             'MEXC',
    logoText:         'MEXC',
    status:           'active',
    cardImage:        '/media/exchanges/mexc/final/mexc-card-final-v3-1200x800.jpg',
    ogImage:          '/media/exchanges/mexc/final/mexc-og-final-v3-1200x630.jpg',
    articleImage:     '/media/exchanges/mexc/final/mexc-article-final-v3-1200x675.jpg',
    affiliateUrl:     '/go/mexc',
    officialUrl:      'https://www.mexc.com',
    shortDescription: 'Major altcoin exchange with no-KYC spot trading and up to 10,000 USDT new user rewards',
    featured:         true,
    pageUrl:          '/mexc/',
  },
];

export function getExchange(slug: string): Exchange | undefined {
  return exchanges.find(e => e.slug === slug);
}

export function getFeaturedExchanges(): Exchange[] {
  return exchanges.filter(e => e.status === 'active' && e.featured);
}
