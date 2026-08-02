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
const homepageCta = join(ROOT, 'src/data/homepageTop10Cta.ts');
const homepageData = join(ROOT, 'src/data/homepageTop10.ts');

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
        `export { resolveHomepageTop10Cta, buildCtaProfile } from ${JSON.stringify(homepageCta)};\n` +
        `export { homepageTop10 } from ${JSON.stringify(homepageData)};`,
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
