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
      contents: `export * from ${JSON.stringify(factory)};\nexport * from ${JSON.stringify(cta)};`,
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
