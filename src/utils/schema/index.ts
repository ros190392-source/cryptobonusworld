/**
 * CryptoBonusWorld — Centralised Schema.org Layer
 * ──────────────────────────────────────────────────────────────────────────────
 * Single import point for all JSON-LD schema builders used across the site.
 *
 * Re-exports every existing builder from src/utils/seo.ts (fully backward-
 * compatible) and adds:
 *
 *   buildFinancialServiceSchema() — standalone FinancialService for exchange pages
 *
 * Usage:
 *   import { buildFinancialServiceSchema, buildProductSchema } from '../../utils/schema';
 *
 * Note: BreadcrumbList is already self-emitted by <Breadcrumbs> component.
 * Do NOT pass it in the schema[] array on pages that use that component.
 */

// ── Re-exports from seo.ts ────────────────────────────────────────────────────

export {
  // Core site schemas
  buildWebSiteSchema,
  buildOrganizationSchema,
  // Page-level schemas
  buildBreadcrumbSchema,
  buildArticleSchema,
  buildFAQSchema,
  buildItemListSchema,
  // Exchange schemas
  buildProductSchema,
  buildReviewPageSchema,
  buildComparisonSchema,
  buildCoinPageSchema,
  // Helpers / constants
  toIsoCurrency,
  parseUserCount,
  YEAR,
  // Types
  type FAQItem,
  type ArticleSchemaOpts,
  type SeoExchange,
  type SeoCategory,
  type SeoCountry,
  type ReviewerEntity,
} from '../seo';

import { SITE_URL, SITE_NAME, toIsoCurrency } from '../seo';

// ── FinancialService schema ───────────────────────────────────────────────────

/**
 * Input shape for buildFinancialServiceSchema.
 * All fields from SeoExchange are accepted via [key: string]: unknown.
 */
export interface FinancialServiceInput {
  name: string;
  slug: string;
  shortDescription: string;
  rating: number;
  bonusTitle: string;
  bonusAmount: number;
  bonusCurrency: string;
  logo?: string;
  countries?: string[];
  licences?: string[];
  founded?: number;
  headquarters?: string;
  users?: string;
  updatedAt?: string;
  lastVerified?: string;
  [key: string]: unknown;
}

/**
 * FinancialService schema — standalone exchange entity for exchange review pages.
 *
 * Use alongside buildReviewPageSchema (which embeds a FinancialProduct mainEntity).
 * This schema gives Google a richer picture of the exchange as a service provider:
 * regulated area of service, credentials (licences), location.
 *
 * Used by: /exchanges/[slug].astro
 */
export function buildFinancialServiceSchema(
  ex: FinancialServiceInput,
): Record<string, unknown> {
  const licences  = (ex.licences  ?? []) as string[];
  const countries = (ex.countries ?? []) as string[];
  const isGlobal  = countries.includes('global');
  const lastVerified = (ex.lastVerified ?? ex.updatedAt) as string | undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'FinancialService',
    name: `${ex.name} Cryptocurrency Exchange`,
    description: ex.shortDescription,
    url: `${SITE_URL}/exchanges/${ex.slug}/`,
    ...(ex.logo
      ? {
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_URL}${String(ex.logo).startsWith('/') ? '' : '/'}${ex.logo}`,
          },
        }
      : {}),
    serviceType: 'Cryptocurrency Exchange',
    ...(isGlobal
      ? { areaServed: { '@type': 'Place', name: 'Worldwide' } }
      : countries.length > 0
        ? { areaServed: countries.slice(0, 5).map(c => ({ '@type': 'Place', name: c })) }
        : {}),
    ...(licences.length > 0
      ? {
          hasCredential: licences.map(lic => ({
            '@type': 'EducationalOccupationalCredential',
            credentialCategory: 'Financial Services License',
            name: lic,
          })),
        }
      : {}),
    ...(ex.founded ? { foundingDate: String(ex.founded) } : {}),
    ...(ex.headquarters
      ? { location: { '@type': 'Place', name: ex.headquarters } }
      : {}),
    ...(lastVerified ? { dateModified: lastVerified } : {}),
    // aggregateRating omitted — no user-submitted reviews exist; a fabricated
    // ratingCount risks a structured-data manual action (see utils/seo.ts).
    provider: {
      '@type': 'Organization',
      name: ex.name,
      url: `${SITE_URL}/exchanges/${ex.slug}/`,
    },
  };
}
