#!/usr/bin/env node
/**
 * CBW Portal Factory — fail-closed contracts test.
 *
 * Adversarial, runnable proof that the Portal Factory validators and the
 * commercial CTA gate reject malformed, incomplete, stale, conflicting,
 * restricted, unavailable and unapproved inputs — and that a /go/* affiliate
 * target is emitted ONLY for an approved, offer-eligible, available market in
 * production mode. Transpiles the TypeScript contracts with esbuild (already a
 * project dependency); no network, no third-party test runner.
 *
 * Exit 0 = every case behaved as expected; exit 1 = any regression.
 */
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const factory = join(ROOT, 'src/data/contracts/portalFactory.ts');
const cta = join(ROOT, 'src/data/contracts/portalCta.ts');
const ctaI18n = join(ROOT, 'src/data/contracts/portalCtaI18n.ts');
const homepageCta = join(ROOT, 'src/data/homepageTop10Cta.ts');
const homepageData = join(ROOT, 'src/data/homepageTop10.ts');
const routeGuards = join(ROOT, 'src/data/contracts/portalRouteGuards.ts');
const publication = join(ROOT, 'src/data/contracts/portalPublication.ts');
const disclosure = join(ROOT, 'src/data/contracts/portalDisclosure.ts');
const internalPath = join(ROOT, 'src/data/contracts/internalPath.ts');

const tmp = mkdtempSync(join(tmpdir(), 'cbw-portal-test-'));
const outfile = join(tmp, 'contracts.mjs');

const results = [];
let failures = 0;
function check(name, cond) {
  const ok = !!cond;
  if (!ok) failures++;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
}

try {
  await build({
    stdin: {
      contents:
        `export * from ${JSON.stringify(factory)};\n` +
        `export * from ${JSON.stringify(cta)};\n` +
        `export { pickLocalized, gateReasonText, ctaGateReasonText, ctaMicrocopy } from ${JSON.stringify(ctaI18n)};\n` +
        `export { resolveHomepageTop10Cta, buildCtaProfile } from ${JSON.stringify(homepageCta)};\n` +
        `export { homepageTop10 } from ${JSON.stringify(homepageData)};\n` +
        `export { assertPortalRouteRecord, resolvePortalRoute } from ${JSON.stringify(routeGuards)};\n` +
        `export { emitPublicRankingRoutes } from ${JSON.stringify(publication)};\n` +
        `export { resolveDisclosure } from ${JSON.stringify(disclosure)};\n` +
        `export { isInternalPath, assertInternalPath } from ${JSON.stringify(internalPath)};`,
      resolveDir: ROOT,
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'silent',
  });
  const m = await import(pathToFileURL(outfile).href);

  const digest = `sha256:${'a'.repeat(64)}`;
  const baseSource = {
    packetId: 'src:test:001', sourceUrl: 'https://example.com/x', sourceClass: 'exchange_official',
    publisher: 'X', accessedAt: '2026-07-31T00:00:00Z', topics: ['availability'],
    rawCaptureRef: 'ref://x', rawCaptureDigest: digest, parserVersion: '1', extractionWarnings: [],
  };
  const baseClaim = {
    claimId: 'clm:test:001', subjectId: 'subj:1', predicate: 'p', value: 'v',
    supportingPacketIds: ['src:test:001'], contradictingPacketIds: [], confidence: 'high',
    limitations: [], approval: 'validated',
  };
  const baseProfile = {
    profileId: 'mp:1', exchangeId: 'ex', countryCode: 'KZ', availability: 'available',
    offerEligibility: 'under_review', claimIds: ['clm:test:001'], limitations: [],
    lastCheckedAt: '2026-07-31T00:00:00Z', nextReviewAt: '2026-08-31T00:00:00Z', approval: 'validated',
  };

  // --- SourcePacket ---
  check('source: valid accepted', m.validateSourcePacket(baseSource).ok);
  check('source: null rejected (malformed)', !m.validateSourcePacket(null).ok);
  check('source: non-https rejected', !m.validateSourcePacket({ ...baseSource, sourceUrl: 'http://x.com/a' }).ok);
  check('source: bad digest rejected', !m.validateSourcePacket({ ...baseSource, rawCaptureDigest: 'nope' }).ok);
  check('source: missing topics rejected', !m.validateSourcePacket({ ...baseSource, topics: [] }).ok);

  // --- NormalizedClaim ---
  check('claim: valid accepted', m.validateNormalizedClaim(baseClaim).ok);
  check('claim: no evidence rejected (incomplete)', !m.validateNormalizedClaim({ ...baseClaim, supportingPacketIds: [] }).ok);
  check('claim: contradiction+approved rejected (conflicting)', !m.validateNormalizedClaim({ ...baseClaim, contradictingPacketIds: ['s2'], approval: 'approved' }).ok);
  check('claim: unknown-confidence approved rejected', !m.validateNormalizedClaim({ ...baseClaim, confidence: 'unknown', approval: 'approved' }).ok);

  // --- MarketProfile ---
  check('profile: valid accepted', m.validateMarketProfile(baseProfile).ok);
  check('profile: approved+unknown-availability rejected', !m.validateMarketProfile({ ...baseProfile, availability: 'unknown', approval: 'approved' }).ok);
  check('profile: offer-approved without profile-approval rejected', !m.validateMarketProfile({ ...baseProfile, offerEligibility: 'approved', approval: 'validated' }).ok);
  check('profile: nextReview<=lastChecked rejected (stale window)', !m.validateMarketProfile({ ...baseProfile, nextReviewAt: '2026-07-01T00:00:00Z' }).ok);
  check('profile: no claims rejected', !m.validateMarketProfile({ ...baseProfile, claimIds: [] }).ok);

  // --- RankingSnapshot ---
  const baseRank = { snapshotId: 'rk:1', countryCode: 'KZ', methodologyVersion: 'v1', rows: [], excludedExchangeIds: [], underReviewExchangeIds: [], evidenceCheckedAt: '2026-07-31T00:00:00Z', approval: 'draft' };
  check('ranking: valid empty draft accepted', m.validateRankingSnapshot(baseRank).ok);
  check('ranking: approved empty rejected', !m.validateRankingSnapshot({ ...baseRank, approval: 'approved' }).ok);
  check('ranking: non-contiguous positions rejected', !m.validateRankingSnapshot({ ...baseRank, rows: [{ position: 2, exchangeId: 'a', marketProfileId: 'mp', rationaleClaimIds: ['c'] }] }).ok);
  check('ranking: duplicate exchange rejected', !m.validateRankingSnapshot({ ...baseRank, rows: [
    { position: 1, exchangeId: 'a', marketProfileId: 'mp', rationaleClaimIds: ['c'] },
    { position: 2, exchangeId: 'a', marketProfileId: 'mp', rationaleClaimIds: ['c'] },
  ] }).ok);
  check('ranking: approved without approvedBy rejected', !m.validateRankingSnapshot({ ...baseRank, approval: 'approved', rows: [{ position: 1, exchangeId: 'a', marketProfileId: 'mp', rationaleClaimIds: ['c'] }] }).ok);

  // --- ContentPackage ---
  const basePkg = { packageId: 'ct:1', countryCode: 'KZ', approvedClaimIds: [], editorialBlocks: ['b'], sourcePacketIds: ['src:test:001'], localeReadiness: { en: 'draft' }, previewRoute: '/__design/cbw-v2/contracts/', approval: 'draft' };
  check('package: valid draft accepted', m.validateContentPackage(basePkg).ok);
  check('package: approved without approved claims rejected', !m.validateContentPackage({ ...basePkg, approval: 'approved' }).ok);
  check('package: approved without approved locale rejected', !m.validateContentPackage({ ...basePkg, approval: 'approved', approvedClaimIds: ['c'] }).ok);
  check('package: bad preview route rejected', !m.validateContentPackage({ ...basePkg, previewRoute: 'not-a-path' }).ok);
  check('package: no sources rejected', !m.validateContentPackage({ ...basePkg, sourcePacketIds: [] }).ok);

  // --- Commercial CTA gate ---
  const goProfile = { exchangeId: 'ex', slug: 'ex', availability: 'available', offerEligibility: 'approved', approval: 'approved', reviewHref: '/exchanges/ex/' };
  const goModel = m.resolveCommercialCta('get_bonus', 'ru', 'production', goProfile);
  check('cta: approved+eligible+production emits /go/', goModel.isAffiliate && goModel.href.startsWith('/go/') && goModel.rel.includes('sponsored') && goModel.rel.includes('nofollow'));
  check('cta: preview never emits /go/', !m.resolveCommercialCta('get_bonus', 'ru', 'preview', goProfile).href.startsWith('/go/'));
  check('cta: not-offer-eligible no /go/', !m.resolveCommercialCta('get_bonus', 'ru', 'production', { ...goProfile, offerEligibility: 'under_review', approval: 'validated' }).href.startsWith('/go/'));
  check('cta: stale approval no /go/', !m.resolveCommercialCta('get_bonus', 'ru', 'production', { ...goProfile, approval: 'stale' }).href.startsWith('/go/'));
  const restricted = m.resolveCommercialCta('get_bonus', 'ru', 'production', { ...goProfile, availability: 'restricted', offerEligibility: 'not_eligible' });
  check('cta: restricted no /go/ + disabled', !restricted.href.startsWith('/go/') && restricted.disabled === true && restricted.gateReason === 'MARKET_RESTRICTED');
  check('cta: unavailable no /go/', !m.resolveCommercialCta('get_bonus', 'ru', 'production', { ...goProfile, availability: 'unavailable', offerEligibility: 'not_eligible' }).href.startsWith('/go/'));
  check('cta: localized ru label present', goModel.label === 'Получить бонус');

  // --- Honest fallback: label always matches the resolved destination ---
  const throwsHelper = (fn) => { try { fn(); return false; } catch { return true; } };
  check('honest: live affiliate keeps requested commercial intent + label', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'en', 'production', goProfile);
    return r.requestedIntent === 'get_bonus' && r.resolvedIntent === 'get_bonus' && r.label === 'Get bonus' && r.href.startsWith('/go/');
  })());
  check('honest: preview downgrades get_bonus -> view_review label "Read review"', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'en', 'preview', goProfile);
    return r.requestedIntent === 'get_bonus' && r.resolvedIntent === 'view_review' && r.label === 'Read review' && !r.href.startsWith('/go/') && !r.rel.includes('sponsored');
  })());
  check('honest: offer-not-approved -> view_review label (not "Get bonus")', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'en', 'production', { ...goProfile, offerEligibility: 'under_review', approval: 'validated' });
    return r.resolvedIntent === 'view_review' && r.label === 'Read review' && r.gateReason === 'OFFER_NOT_APPROVED';
  })());
  check('honest: stale evidence -> view_review label matches internal dest', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'en', 'production', { ...goProfile, evidenceCheckedAt: '2020-01-01T00:00:00Z' }, { now: Date.parse('2026-08-02T00:00:00Z') });
    return r.resolvedIntent === 'view_review' && r.label === 'Read review' && !r.href.startsWith('/go/');
  })());
  check('honest: restricted -> disabled commercial control, no href, localized', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'ru', 'production', { ...goProfile, availability: 'restricted', offerEligibility: 'not_eligible' });
    return r.disabled === true && r.href === '' && r.resolvedIntent === 'get_bonus' && r.label === 'Получить бонус' && r.gateReason === 'MARKET_RESTRICTED';
  })());
  check('honest: requestedIntent preserved for analytics on downgrade', (() => {
    const r = m.resolveCommercialCta('register', 'en', 'preview', goProfile);
    return r.requestedIntent === 'register' && r.resolvedIntent === 'view_review';
  })());
  check('honest: label localized per resolved intent (ru preview => Читать обзор)', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'ru', 'preview', goProfile);
    return r.label === 'Читать обзор';
  })());
  check('honest: assert rejects label that contradicts resolved intent', throwsHelper(() =>
    m.assertCommercialCtaModel({ requestedIntent: 'get_bonus', resolvedIntent: 'view_review', locale: 'en', label: 'Get bonus', mode: 'preview', visualState: 'review', interactionState: 'default', href: '/exchanges/ex/', isAffiliate: false, disabled: false, rel: 'noopener', gateReason: 'PREVIEW_MODE' })));
  check('honest: assert rejects navigable non-affiliate commercial intent', throwsHelper(() =>
    m.assertCommercialCtaModel({ requestedIntent: 'get_bonus', resolvedIntent: 'get_bonus', locale: 'en', label: 'Get bonus', mode: 'preview', visualState: 'review', interactionState: 'default', href: '/exchanges/ex/', isAffiliate: false, disabled: false, rel: 'noopener', gateReason: 'PREVIEW_MODE' })));

  // --- Localization audit (en / ru / kk), deterministic fallback ---
  const LOCALES = ['en', 'ru', 'kk'];
  const INTENTS = ['register', 'get_bonus', 'open_exchange', 'view_review', 'view_evidence'];
  check('i18n: every CTA label present & non-empty in all locales', INTENTS.every((i) => LOCALES.every((l) => {
    const v = m.ctaLabels[i][l];
    return typeof v === 'string' && v.trim().length > 0 && v !== i;
  })));
  check('i18n: pickLocalized returns requested locale', m.pickLocalized({ en: 'A', ru: 'Б', kk: 'В' }, 'ru') === 'Б');
  check('i18n: missing locale falls back to en (not a raw key)', (() => {
    const partial = { en: 'Only-EN' };
    return m.pickLocalized(partial, 'kk') === 'Only-EN';
  })());
  check('i18n: missing en base throws (fail-closed, never blank)', (() => {
    try { m.pickLocalized({ en: '' }, 'en'); return false; } catch { return true; }
  })());
  check('i18n: every gate reason localized in all locales (not raw key)', Object.keys(m.ctaGateReasonText).every((r) =>
    LOCALES.every((l) => { const t = m.gateReasonText(r, l); return t && t.trim() && t !== r; })));
  check('i18n: unknown gate reason falls back to localized "unavailable"', (() => {
    const t = m.gateReasonText('SOME_UNKNOWN_REASON', 'ru');
    return t === m.ctaMicrocopy.unavailable.ru;
  })());
  check('i18n: microcopy present in all locales', ['opensNewTab', 'loading', 'unavailable'].every((k) =>
    LOCALES.every((l) => m.ctaMicrocopy[k][l] && m.ctaMicrocopy[k][l].trim())));
  // Factual independence: locale changes label only, never the gate facts.
  check('i18n: locale changes label only, facts unchanged', (() => {
    const prof = { exchangeId: 'ex', slug: 'ex', availability: 'available', offerEligibility: 'approved', approval: 'approved', reviewHref: '/exchanges/ex/' };
    const en = m.resolveCommercialCta('get_bonus', 'en', 'production', prof);
    const ru = m.resolveCommercialCta('get_bonus', 'ru', 'production', prof);
    const kk = m.resolveCommercialCta('get_bonus', 'kk', 'production', prof);
    const factsEqual = en.href === ru.href && ru.href === kk.href
      && en.isAffiliate === ru.isAffiliate && ru.isAffiliate === kk.isAffiliate
      && en.visualState === ru.visualState && ru.visualState === kk.visualState;
    const labelsDiffer = en.label !== ru.label && ru.label !== kk.label;
    return factsEqual && labelsDiffer;
  })());

  // --- Evidence freshness (deterministic, explicit clock) ---
  const NOW = Date.parse('2026-08-02T00:00:00Z');
  const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();
  check('fresh: recent evidence is fresh', m.assessEvidenceFreshness(daysAgo(10), NOW).state === 'fresh');
  check('fresh: missing timestamp is invalid (not coerced)', m.assessEvidenceFreshness(undefined, NOW).state === 'invalid');
  check('fresh: malformed timestamp is invalid (not coerced to now)', m.assessEvidenceFreshness('not-a-date', NOW).state === 'invalid');
  check('fresh: exactly at 45d boundary is fresh', m.assessEvidenceFreshness(daysAgo(45), NOW).state === 'fresh');
  check('fresh: just beyond 45d boundary is stale', m.assessEvidenceFreshness(daysAgo(46), NOW).state === 'stale');
  check('fresh: clearly old evidence is stale', m.assessEvidenceFreshness(daysAgo(400), NOW).state === 'stale');
  check('fresh: far-future timestamp flagged future', m.assessEvidenceFreshness(daysAgo(-5), NOW).state === 'future');
  check('fresh: within 60m skew tolerance is fresh', m.assessEvidenceFreshness(new Date(NOW + 30 * 60000).toISOString(), NOW).state === 'fresh');
  check('fresh: timezone offset normalized to UTC (deterministic)', (() => {
    const withOffset = '2026-07-25T05:00:00+05:00'; // == 2026-07-25T00:00Z
    const asUtc = '2026-07-25T00:00:00Z';
    const a = m.assessEvidenceFreshness(withOffset, NOW);
    const b = m.assessEvidenceFreshness(asUtc, NOW);
    return a.state === b.state && a.ageMs === b.ageMs;
  })());

  // Ranking-level fail-closed freshness for approved snapshots.
  const approvedRank = {
    snapshotId: 'rk:fresh', countryCode: 'KZ', methodologyVersion: 'v1',
    rows: [{ position: 1, exchangeId: 'a', marketProfileId: 'mp', rationaleClaimIds: ['c'] }],
    excludedExchangeIds: [], underReviewExchangeIds: [], evidenceCheckedAt: daysAgo(10),
    approval: 'approved', approvedBy: 'owner',
  };
  check('ranking: approved+fresh accepted (with clock)', m.validateRankingSnapshot(approvedRank, { now: NOW }).ok);
  check('ranking: approved+stale rejected (with clock)', !m.validateRankingSnapshot({ ...approvedRank, evidenceCheckedAt: daysAgo(120) }, { now: NOW }).ok);
  check('ranking: approved+future rejected (with clock)', !m.validateRankingSnapshot({ ...approvedRank, evidenceCheckedAt: daysAgo(-30) }, { now: NOW }).ok);
  check('ranking: stale but no clock stays deterministic (accepted)', m.validateRankingSnapshot({ ...approvedRank, evidenceCheckedAt: daysAgo(120) }).ok);

  // CTA-level: a stale-evidence profile must not expose an affiliate action.
  const freshProfile = { exchangeId: 'ex', slug: 'ex', availability: 'available', offerEligibility: 'approved', approval: 'approved', reviewHref: '/exchanges/ex/', evidenceCheckedAt: daysAgo(5) };
  check('cta: fresh evidence still emits /go/ in production', m.resolveCommercialCta('get_bonus', 'ru', 'production', freshProfile, { now: NOW }).href.startsWith('/go/'));
  check('cta: stale evidence blocks /go/ (EVIDENCE_STALE)', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'ru', 'production', { ...freshProfile, evidenceCheckedAt: daysAgo(200) }, { now: NOW });
    return !r.href.startsWith('/go/') && !r.isAffiliate && r.gateReason === 'EVIDENCE_STALE';
  })());

  // --- Homepage Top-10 gated CTA binding (real data → canonical gate) ---
  const bybit = m.homepageTop10.find((e) => e.slug === 'bybit');       // verified offer
  const mexc = m.homepageTop10.find((e) => e.slug === 'mexc');         // public-preview offer
  const binance = m.homepageTop10.find((e) => e.slug === 'binance');   // research row, no offer
  check('hp: verified+production emits /go/ affiliate', (() => {
    const b = m.resolveHomepageTop10Cta(bybit, 'production', 'en');
    return b.primary.isAffiliate && b.primary.href === '/go/bybit'
      && b.primary.rel.includes('sponsored') && b.primary.rel.includes('nofollow');
  })());
  check('hp: verified+preview stays internal (no /go/)', (() => {
    const b = m.resolveHomepageTop10Cta(bybit, 'preview', 'en');
    return !b.primary.isAffiliate && !b.primary.href.startsWith('/go/') && b.primary.href.endsWith('/');
  })());
  check('hp: public-preview offer never affiliate in production', (() => {
    const b = m.resolveHomepageTop10Cta(mexc, 'production', 'en');
    return !b.primary.isAffiliate && !b.primary.href.startsWith('/go/');
  })());
  check('hp: research row (no offer) is non-commercial review', (() => {
    const b = m.resolveHomepageTop10Cta(binance, 'production', 'en');
    return !b.primary.isAffiliate && !b.primary.href.startsWith('/go/') && !b.primary.disabled;
  })());
  check('hp: localized ru bonus label on verified row', (() => {
    const b = m.resolveHomepageTop10Cta(bybit, 'production', 'ru');
    return b.primary.label === 'Получить бонус';
  })());
  check('hp: profile facts derived from real records (bybit approved)', (() => {
    const p = m.buildCtaProfile(bybit);
    return p.approval === 'approved' && p.offerEligibility === 'approved' && p.availability === 'available';
  })());

  // Secondary-action contract (fail-closed, validated binding).
  const thr = (fn) => { try { fn(); return false; } catch { return true; } };
  const withSecondary = (href, label = 'Read more') => ({ ...bybit, secondaryAction: { href, label } });
  check('hp/secondary: valid internal secondary passes + is echoed in binding', (() => {
    const b = m.resolveHomepageTop10Cta(withSecondary('/exchanges/bybit/'), 'preview', 'en');
    return b.secondaryHref === '/exchanges/bybit/' && b.secondaryLabel === 'Read more';
  })());
  check('hp/secondary: affiliate /go/ rejected', thr(() => m.resolveHomepageTop10Cta(withSecondary('/go/bybit'), 'preview', 'en')));
  check('hp/secondary: external absolute URL rejected', thr(() => m.resolveHomepageTop10Cta(withSecondary('https://evil.example/x/'), 'preview', 'en')));
  check('hp/secondary: protocol-relative rejected', thr(() => m.resolveHomepageTop10Cta(withSecondary('//host/'), 'preview', 'en')));
  check('hp/secondary: malformed path rejected', thr(() => m.resolveHomepageTop10Cta(withSecondary('/exchanges/bybit'), 'preview', 'en')));
  check('hp/secondary: empty label rejected', thr(() => m.resolveHomepageTop10Cta(withSecondary('/exchanges/bybit/', '   '), 'preview', 'en')));
  check('hp/secondary: real data whole Top-10 all valid (build-time fail-closed)', (() => {
    const all = m.homepageTop10.map((e) => m.resolveHomepageTop10Cta(e, 'preview', 'en'));
    return all.every((b) => b.secondaryHref.startsWith('/') && !b.secondaryHref.startsWith('//') && !b.secondaryHref.startsWith('/go/') && b.secondaryLabel.trim().length > 0);
  })());

  // --- Canonical internal-path validator (adversarial) ---
  const throws = (fn) => { try { fn(); return false; } catch { return true; } };
  const ACCEPT_PATHS = ['/', '/methodology/', '/exchanges/bybit/', '/__design/cbw-v2/contracts/', '/bybit/'];
  const REJECT_PATHS = [
    '//host/', '///host/', 'https://host/path/', 'http://host/path/', 'javascript:alert(1)',
    '/\\evil/', '\\\\host\\', '/a//b/', '/../', '/foo/../bar/', '/foo?x=1/', '/foo#frag/',
    '/foo%2e%2e/', '/exchanges/bybit', 'exchanges/bybit/', '', '/CONTROL/', '/go/bybit', '/go/bybit/',
  ];
  check('path: all canonical ACCEPT cases pass', ACCEPT_PATHS.every((p) => m.isInternalPath(p)));
  check('path: all adversarial REJECT cases fail', REJECT_PATHS.every((p) => !m.isInternalPath(p)));
  check('path: protocol-relative //host/ rejected', !m.isInternalPath('//host/'));
  check('path: external absolute URL rejected', !m.isInternalPath('https://evil.example/x/'));
  check('path: /go/* rejected for internal (default)', !m.isInternalPath('/go/bybit/'));
  check('path: /go/* allowed only with allowGo', m.isInternalPath('/go/bybit/', { allowGo: true }));
  check('path: non-string rejected', !m.isInternalPath(null) && !m.isInternalPath(undefined) && !m.isInternalPath(42));
  check('path: assertInternalPath throws on protocol-relative', throws(() => m.assertInternalPath('//host/', 'x')));

  // Downstream contracts must inherit the strict validator.
  check('path: CTA review href rejects protocol-relative', throws(() =>
    m.resolveCommercialCta('get_bonus', 'en', 'preview', { exchangeId: 'e', slug: 'e', availability: 'available', offerEligibility: 'approved', approval: 'approved', reviewHref: '//host/' })));
  check('path: disclosure rejects protocol-relative methodology', throws(() =>
    m.resolveDisclosure({ tone: 'verified', isAffiliate: false, methodologyHref: '//host/' }, 'en')));
  check('path: ContentPackage rejects protocol-relative preview route', !m.validateContentPackage({ packageId: 'ct:1', countryCode: 'KZ', approvedClaimIds: [], editorialBlocks: ['b'], sourcePacketIds: ['src:1'], localeReadiness: { en: 'draft' }, previewRoute: '//host/', approval: 'draft' }).ok);
  check('path: route guard rejects protocol-relative review path', throws(() =>
    m.assertPortalRouteRecord({ routeId: 'x', reviewPath: '//host/', publicationState: 'draft', indexabilityAuthorized: false })));
  check('path: public emission never returns protocol-relative output', (() => {
    // A route whose publicPath is protocol-relative must fail the guard → excluded.
    const prof = { profileId: 'mp:1', exchangeId: 'ex', countryCode: 'KZ', availability: 'available', offerEligibility: 'approved', claimIds: ['clm:1'], limitations: [], lastCheckedAt: daysAgo(5), nextReviewAt: '2026-09-30T00:00:00Z', approval: 'approved' };
    const snap = { snapshotId: 'rk:x', countryCode: 'KZ', methodologyVersion: 'v1', rows: [{ position: 1, exchangeId: 'ex', marketProfileId: 'mp:1', rationaleClaimIds: ['clm:1'] }], excludedExchangeIds: [], underReviewExchangeIds: [], evidenceCheckedAt: daysAgo(5), approval: 'approved', approvedBy: 'owner' };
    // A protocol-relative publicPath cannot even be constructed (assert throws), so emission has no valid route → row blocked.
    let guardThrew = false;
    try { m.assertPortalRouteRecord({ routeId: 'ex', reviewPath: '/__design/ex/', publicPath: '//host/', publicationState: 'approved', indexabilityAuthorized: true }); } catch { guardThrew = true; }
    const r = m.emitPublicRankingRoutes({ snapshot: snap, profiles: { 'mp:1': prof }, routes: {}, now: NOW });
    return guardThrew && r.published.length === 0 && !r.published.some((p) => String(p.publicPath).startsWith('//'));
  })());

  // --- Route guard + real public emission path ---

  const okRoute = { routeId: 'ex', reviewPath: '/__design/exchanges/ex/', publicPath: '/exchanges/ex/', publicationState: 'approved', indexabilityAuthorized: true };
  check('route: review mode returns review path', m.resolvePortalRoute(okRoute, 'review') === '/__design/exchanges/ex/');
  check('route: approved+indexable public path emitted', m.resolvePortalRoute(okRoute, 'public') === '/exchanges/ex/');
  check('route: draft cannot resolve public (throws)', throws(() => m.resolvePortalRoute({ ...okRoute, publicationState: 'draft', indexabilityAuthorized: false }, 'public')));
  check('route: approved but not indexable cannot resolve public', throws(() => m.resolvePortalRoute({ ...okRoute, indexabilityAuthorized: false }, 'public')));
  check('route: blocked cannot resolve public', throws(() => m.resolvePortalRoute({ ...okRoute, publicationState: 'blocked', indexabilityAuthorized: false }, 'public')));
  check('route: review path outside /__design/ rejected', throws(() => m.assertPortalRouteRecord({ ...okRoute, reviewPath: '/exchanges/ex/' })));
  check('route: public path in review namespace rejected', throws(() => m.assertPortalRouteRecord({ ...okRoute, publicPath: '/__design/x/' })));
  check('route: indexable without approval rejected', throws(() => m.assertPortalRouteRecord({ ...okRoute, publicationState: 'reviewed', indexabilityAuthorized: true })));
  check('route: approved without public path rejected', throws(() => m.assertPortalRouteRecord({ ...okRoute, publicPath: undefined })));

  // Composed emission fixtures.
  const pubProfile = { profileId: 'mp:1', exchangeId: 'ex', countryCode: 'KZ', availability: 'available', offerEligibility: 'approved', claimIds: ['clm:1'], limitations: [], lastCheckedAt: daysAgo(5), nextReviewAt: '2026-09-30T00:00:00Z', approval: 'approved' };
  const pubRow = { position: 1, exchangeId: 'ex', marketProfileId: 'mp:1', rationaleClaimIds: ['clm:1'] };
  const pubSnap = { snapshotId: 'rk:pub', countryCode: 'KZ', methodologyVersion: 'v1', rows: [pubRow], excludedExchangeIds: [], underReviewExchangeIds: [], evidenceCheckedAt: daysAgo(5), approval: 'approved', approvedBy: 'owner' };
  const baseInput = { snapshot: pubSnap, profiles: { 'mp:1': pubProfile }, routes: { ex: okRoute }, now: NOW };

  const okRes = m.emitPublicRankingRoutes(baseInput);
  check('emit: valid approved row is published', okRes.snapshotPublishable && okRes.published.length === 1 && okRes.published[0].publicPath === '/exchanges/ex/' && okRes.blocked.length === 0);

  check('emit: unapproved snapshot emits zero public routes', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, snapshot: { ...pubSnap, approval: 'draft', approvedBy: undefined } });
    return !r.snapshotPublishable && r.published.length === 0 && r.blocked.every((b) => b.reasons.includes('SNAPSHOT_NOT_PUBLISHABLE'));
  })());
  check('emit: stale snapshot emits zero public routes', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, snapshot: { ...pubSnap, evidenceCheckedAt: daysAgo(120) } });
    return !r.snapshotPublishable && r.published.length === 0;
  })());
  check('emit: malformed country blocks the whole snapshot', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, snapshot: { ...pubSnap, countryCode: 'kazakhstan' } });
    return !r.snapshotPublishable && r.published.length === 0;
  })());
  check('emit: blocked route excluded from list (not published)', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, routes: { ex: { ...okRoute, publicationState: 'blocked', indexabilityAuthorized: false } } });
    return r.published.length === 0 && r.blocked.some((b) => b.exchangeId === 'ex' && b.reasons.includes('ROUTE_NOT_AUTHORIZED'));
  })());
  check('emit: non-indexable route excluded', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, routes: { ex: { ...okRoute, indexabilityAuthorized: false } } });
    return r.published.length === 0 && r.blocked.length === 1;
  })());
  check('emit: unapproved profile excludes row', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, profiles: { 'mp:1': { ...pubProfile, approval: 'validated', offerEligibility: 'under_review' } } });
    return r.published.length === 0 && r.blocked.some((b) => b.reasons.includes('PROFILE_NOT_APPROVED'));
  })());
  check('emit: unavailable profile excludes row', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, profiles: { 'mp:1': { ...pubProfile, availability: 'unavailable', offerEligibility: 'not_eligible' } } });
    return r.published.length === 0 && r.blocked.some((b) => b.reasons.includes('PROFILE_NOT_AVAILABLE'));
  })());
  check('emit: negative combination (missing profile + bad route) blocks with multiple reasons', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, profiles: {}, routes: { ex: { ...okRoute, publicationState: 'blocked', indexabilityAuthorized: false } } });
    const b = r.blocked.find((x) => x.exchangeId === 'ex');
    return r.published.length === 0 && b && b.reasons.includes('PROFILE_MISSING') && b.reasons.includes('ROUTE_NOT_AUTHORIZED');
  })());
  check('emit: alternate locale yields identical published set (facts language-independent)', (() => {
    const en = m.emitPublicRankingRoutes({ ...baseInput, locale: 'en' });
    const ru = m.emitPublicRankingRoutes({ ...baseInput, locale: 'ru' });
    return JSON.stringify(en.published) === JSON.stringify(ru.published) && JSON.stringify(en.blocked) === JSON.stringify(ru.blocked);
  })());
  check('emit: published never intersects blocked (invariant holds under mixed input)', (() => {
    const twoRow = { ...pubSnap, rows: [pubRow, { position: 2, exchangeId: 'ex2', marketProfileId: 'mp:2', rationaleClaimIds: ['clm:2'] }] };
    const r = m.emitPublicRankingRoutes({ snapshot: twoRow, profiles: { 'mp:1': pubProfile }, routes: { ex: okRoute }, now: NOW });
    const pub = new Set(r.published.map((p) => p.exchangeId));
    const blk = new Set(r.blocked.map((b) => b.exchangeId));
    return r.published.length === 1 && pub.has('ex') && blk.has('ex2') && ![...pub].some((id) => blk.has(id));
  })());

  // --- Evidence disclosure (fail-closed, localized) ---
  const discBase = { tone: 'verified', lastChecked: 'June 2026', sourceHref: 'https://ex.com/promo', isAffiliate: true, methodologyHref: '/methodology/' };
  const disc = m.resolveDisclosure(discBase, 'en');
  check('disc: verified tone + https source + affiliate note', disc.tone === 'verified' && disc.sourceHref === 'https://ex.com/promo' && disc.affiliateNote && disc.lastChecked === 'June 2026');
  check('disc: non-affiliate has no affiliate note', m.resolveDisclosure({ ...discBase, isAffiliate: false }, 'en').affiliateNote === null);
  check('disc: non-https source is dropped (not shown)', m.resolveDisclosure({ ...discBase, sourceHref: 'http://ex.com/x' }, 'en').sourceHref === null);
  check('disc: missing source not fabricated', m.resolveDisclosure({ ...discBase, sourceHref: undefined }, 'en').sourceHref === null);
  check('disc: missing checked date -> null (not invented)', m.resolveDisclosure({ ...discBase, lastChecked: undefined }, 'en').lastChecked === null);
  check('disc: unknown tone fails closed to missing', m.resolveDisclosure({ ...discBase, tone: 'totally-unknown' }, 'en').tone === 'missing');
  check('disc: research tone preserved', m.resolveDisclosure({ ...discBase, tone: 'research', sourceHref: undefined }, 'en').tone === 'research');
  check('disc: non-local methodology href throws', throws(() => m.resolveDisclosure({ ...discBase, methodologyHref: 'https://x.com/m' }, 'en')));
  check('disc: localized tone label (ru) differs from en', m.resolveDisclosure(discBase, 'ru').toneLabel !== m.resolveDisclosure(discBase, 'en').toneLabel);
  check('disc: locale changes labels only, source/facts unchanged', (() => {
    const en = m.resolveDisclosure(discBase, 'en');
    const ru = m.resolveDisclosure(discBase, 'ru');
    return en.sourceHref === ru.sourceHref && en.tone === ru.tone && en.lastChecked === ru.lastChecked && en.affiliateNote !== ru.affiliateNote;
  })());

  // --- Invariant: a non-commercial model may never point at /go/ ---
  let threw = false;
  try { m.assertCommercialCtaModel({ ...goModel, isAffiliate: false, visualState: 'review' }); } catch { threw = true; }
  check('cta: invariant throws on non-commercial /go/ leak', threw);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(results.join('\n'));
console.log(`\nportal contracts: ${results.length - failures} passed, ${failures} failed`);
if (failures) { console.error('FAIL: portal contract fail-closed guarantees regressed'); process.exit(1); }
console.log('PASS: portal contracts are fail-closed');
