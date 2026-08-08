#!/usr/bin/env node
import { build } from 'esbuild';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-owner-authority-split-'));
const OUT = join(TMP, 'authority-split.mjs');

const ownerAuthority = join(ROOT, 'src/data/contracts/ownerConfirmedCommercialAuthority.ts');
const offerAuthority = join(ROOT, 'src/data/contracts/publicOfferAuthority.ts');
const publicOfferView = join(ROOT, 'src/data/publicOfferView.ts');
const publicCommercialRoute = join(ROOT, 'src/data/publicCommercialRoute.ts');
const homepageTop10 = join(ROOT, 'src/data/homepageTop10.ts');
const homepageTop10Cta = join(ROOT, 'src/data/homepageTop10Cta.ts');

let checks = 0;
const failures = [];
function check(label, condition) {
  checks += 1;
  if (!condition) failures.push(label);
}

try {
  await build({
    stdin: {
      contents:
        `export { OWNER_CONFIRMED_COMMERCIAL_MANIFEST, resolveOwnerConfirmedCommercialAuthority, resolveOwnerConfirmedCommercialAuthorityForRaw, validateOwnerConfirmedCommercialManifest } from ${JSON.stringify(ownerAuthority)};\n` +
        `export { PUBLIC_COMMERCIAL_CANDIDATE_EXCHANGES } from ${JSON.stringify(offerAuthority)};\n` +
        `export { resolvePublicOfferView } from ${JSON.stringify(publicOfferView)};\n` +
        `export { resolvePublicCommercialRoute } from ${JSON.stringify(publicCommercialRoute)};\n` +
        `export { buildHomepageTop10 } from ${JSON.stringify(homepageTop10)};\n` +
        `export { resolveHomepageTop10Cta } from ${JSON.stringify(homepageTop10Cta)};\n`,
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'owner-authority-split-test-entry.ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: OUT,
    logLevel: 'silent',
  });

  const m = await import(`${pathToFileURL(OUT).href}?v=${Date.now()}`);
  const rawRecords = JSON.parse(readFileSync(join(ROOT, 'src/data/exchanges.json'), 'utf8'));
  const NOW = Date.UTC(2026, 7, 8, 10, 0, 0);
  const candidates = [...m.PUBLIC_COMMERCIAL_CANDIDATE_EXCHANGES];

  check('candidate count is 13', candidates.length === 13);
  check('manifest validation passes on exact current repository values', m.validateOwnerConfirmedCommercialManifest().ok === true);
  check('manifest covers candidate set exactly', new Set(m.OWNER_CONFIRMED_COMMERCIAL_MANIFEST.map((e) => e.slug)).size === candidates.length && candidates.every((slug) => m.OWNER_CONFIRMED_COMMERCIAL_MANIFEST.some((e) => e.slug === slug)));

  for (const slug of candidates) {
    const raw = rawRecords.find((row) => row.slug === slug);
    const authority = m.resolveOwnerConfirmedCommercialAuthority(slug);
    const view = m.resolvePublicOfferView(slug, NOW);
    const route = m.resolvePublicCommercialRoute(slug, NOW);

    check(`${slug}: raw record exists`, Boolean(raw));
    check(`${slug}: exact current link is owner-confirmed`, authority?.linkConfirmed === true);
    check(`${slug}: exact current public view exposes owner-confirmed link authority`, view?.linkAuthority === 'owner_confirmed');
    check(`${slug}: link authority does not verify factual offer state`, view?.publicState === 'under_re_verification');
    check(`${slug}: link authority does not flip legacy claim-commercial flag`, view?.isCommercial === false);
    check(`${slug}: no verified-offer badge from link/code authority`, view?.showVerifiedBadge === false);
    check(`${slug}: external route is allowed only through confirmed resolver`, route?.externalAllowed === true);
    check(`${slug}: route destination equals exact confirmed default`, route?.destination === authority?.confirmedDefaultUrl);
    check(`${slug}: route CTA is claim-neutral`, typeof route?.ctaLabel === 'string' && !/bonus|claim|reward|verified/i.test(route.ctaLabel));
    check(`${slug}: route terms remain under re-verification`, /re-verification/i.test(route?.offerTermsLabel ?? ''));

    if (slug === 'coinbase') {
      check('coinbase: empty promo code remains absent', authority?.promoCodeConfirmed === true && authority?.confirmedPromoCode === null && view?.promoCode === null);
    } else {
      check(`${slug}: exact current promo code is owner-confirmed`, authority?.promoCodeConfirmed === true && typeof authority?.confirmedPromoCode === 'string' && authority.confirmedPromoCode.length > 0);
      check(`${slug}: public view exposes only confirmed promo code`, view?.promoCodeAuthority === 'owner_confirmed' && view?.promoCode === authority?.confirmedPromoCode);
    }

    if (raw) {
      const affiliateMutation = structuredClone(raw);
      affiliateMutation.affiliateUrl = `${String(raw.affiliateUrl ?? '')}x`;
      check(`${slug}: one-character affiliateUrl mutation fails link authority`, m.resolveOwnerConfirmedCommercialAuthorityForRaw(slug, affiliateMutation)?.linkConfirmed === false);

      const defaultMutation = structuredClone(raw);
      defaultMutation.affiliateLinks = structuredClone(raw.affiliateLinks ?? {});
      defaultMutation.affiliateLinks.default = `${String(raw.affiliateLinks?.default ?? '')}x`;
      check(`${slug}: one-character default URL mutation fails link authority`, m.resolveOwnerConfirmedCommercialAuthorityForRaw(slug, defaultMutation)?.linkConfirmed === false);

      const newGeoMutation = structuredClone(raw);
      newGeoMutation.affiliateLinks = structuredClone(raw.affiliateLinks ?? {});
      newGeoMutation.affiliateLinks.geo = { ...(raw.affiliateLinks?.geo ?? {}), zz: 'https://example.com/new-owner-unconfirmed-route' };
      check(`${slug}: newly-added real GEO URL fails link authority`, m.resolveOwnerConfirmedCommercialAuthorityForRaw(slug, newGeoMutation)?.linkConfirmed === false);

      const promoMutation = structuredClone(raw);
      if (slug === 'coinbase') {
        promoMutation.promoCode = 'NEW-UNCONFIRMED-CODE';
      } else {
        promoMutation.promoCode = `${String(raw.promoCode ?? '')}x`;
      }
      check(`${slug}: promo mutation/new code fails promo authority`, m.resolveOwnerConfirmedCommercialAuthorityForRaw(slug, promoMutation)?.promoCodeConfirmed === false);
    }
  }

  check('unknown exchange has no owner authority', m.resolveOwnerConfirmedCommercialAuthority('new-exchange-never-confirmed') === null);
  check('unknown exchange has no external public route', m.resolvePublicCommercialRoute('new-exchange-never-confirmed', NOW).externalAllowed === false);

  // Homepage product policy: exact owner-confirmed links remain usable in explicit production
  // global context, but neither preview nor an explicit country may bypass their existing gates.
  const top10 = m.buildHomepageTop10(NOW);
  check('homepage model still contains exactly 10 rows', top10.length === 10);
  for (const entry of top10) {
    const productionGlobal = m.resolveHomepageTop10Cta(entry, 'production', 'en', { now: NOW });
    const previewGlobal = m.resolveHomepageTop10Cta(entry, 'preview', 'en', { now: NOW });
    const productionPoland = m.resolveHomepageTop10Cta(entry, 'production', 'en', { now: NOW, countryCode: 'PL' });

    check(`${entry.slug}: production global homepage uses owner-confirmed /go route`, productionGlobal.primary.href === `/go/${entry.slug}` && productionGlobal.primary.isAffiliate === true);
    check(`${entry.slug}: production global label is neutral Register`, productionGlobal.primary.label === 'Register' && !/bonus|claim|reward|verified/i.test(productionGlobal.primary.label));
    check(`${entry.slug}: preview global homepage never emits /go`, !previewGlobal.primary.href.startsWith('/go/') && previewGlobal.primary.isAffiliate === false);
    check(`${entry.slug}: explicit country stays MarketProfile-gated`, !productionPoland.primary.href.startsWith('/go/') && productionPoland.primary.isAffiliate === false);
  }

  // Source-level guard for the UI boundary that originally created the hidden regression:
  // a link-confirmed state may not unlock claim-bearing ExchangePromoPageV2.
  const governedSource = readFileSync(join(ROOT, 'src/components/exchange/GovernedExchangePage.astro'), 'utf8');
  check('governed page gates rich promo on verified factual state', /claimsVerified\s*=\s*view\?\.publicState\s*===\s*['"]verified['"]/.test(governedSource));
  check('governed page also requires independently safe commercial route', /richPromoAllowed\s*=\s*claimsVerified\s*&&\s*commercialRoute\.externalAllowed\s*===\s*true/.test(governedSource));
  check('governed page no longer equates isCommercial with rich claims', !/const\s+commercial\s*=\s*view\?\.isCommercial\s*===\s*true/.test(governedSource));

  const neutralSource = readFileSync(join(ROOT, 'src/components/exchange/ExchangeUnverifiedNotice.astro'), 'utf8');
  check('neutral page supports owner-confirmed promo code', neutralSource.includes('promoCodeAuthority') && neutralSource.includes('Owner confirmed'));
  check('neutral page uses internal commercial hop, not raw affiliate URL', neutralSource.includes('commercialHref') && !neutralSource.includes('affiliateUrl'));
  check('neutral page explicitly keeps offer terms under re-verification', /KYC\/deposit requirements/.test(neutralSource) && /under re-verification/.test(neutralSource));

  const homepageSource = readFileSync(join(ROOT, 'src/components/home/HomepageTop10.astro'), 'utf8');
  check('homepage disclosure still treats isCommercial as claim/evidence authority, not link authority', homepageSource.includes('const officialHref = view?.isCommercial ? offer?.sourceUrl : undefined'));

  if (failures.length > 0) {
    console.error(`OWNER-CONFIRMED AUTHORITY SPLIT: FAIL (${failures.length}/${checks})`);
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`OWNER-CONFIRMED AUTHORITY SPLIT: PASS (${checks}/${checks})`);
  }
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
