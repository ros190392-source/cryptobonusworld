/**
 * Homepage country meta — single source for the homepage GEO surfaces
 * (site hero GEO panel + HomepageGeoBonusFinder panels), so the hero and the
 * finder can never drift apart. Values are the long-standing approved finder
 * entries, moved verbatim from HomepageGeoBonusFinder.astro.
 * European Union is a regulatory overlay only (geoRankings.ts) — never a
 * country here.
 */
import type { PromoCountrySlug } from './geoRankings';

export interface HomepageCountryMeta {
  slug: PromoCountrySlug;
  label: string;
  flag: string;
  headline: string;
}

export const HOMEPAGE_COUNTRY_META: HomepageCountryMeta[] = [
  { slug: 'global',         label: 'Global',         flag: '🌍', headline: 'Best Crypto Bonus Codes Worldwide' },
  { slug: 'poland',         label: 'Poland',         flag: '🇵🇱', headline: 'Best Crypto Bonus Codes for Poland' },
  { slug: 'germany',        label: 'Germany',        flag: '🇩🇪', headline: 'Best Crypto Bonus Codes for Germany' },
  { slug: 'kazakhstan',     label: 'Kazakhstan',     flag: '🇰🇿', headline: 'Best Crypto Bonus Codes for Kazakhstan' },
  { slug: 'turkey',         label: 'Turkey',         flag: '🇹🇷', headline: 'Best Crypto Bonus Codes for Turkey' },
  { slug: 'united-kingdom', label: 'United Kingdom', flag: '🇬🇧', headline: 'Best Crypto Bonus Codes for the United Kingdom' },
  { slug: 'united-states',  label: 'United States',  flag: '🇺🇸', headline: 'Best Crypto Bonus Codes for the United States' },
];
