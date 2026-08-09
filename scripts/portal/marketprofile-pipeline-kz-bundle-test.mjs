#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-marketprofile-kz-set-'));
const OUT = join(TMP, 'kz-set.mjs');
let checks = 0;
const failures = [];
function check(name, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${name}: ${detail}` : name);
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function allFalse(candidate) { return Object.values(candidate.source.authorizations).every((v) => v === false); }
function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
}
function fnv1a64(input) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const byte of new TextEncoder().encode(input)) { hash ^= BigInt(byte); hash = (hash * prime) & mask; }
  return hash.toString(16).padStart(16, '0');
}

try {
  await build({
    stdin: {
      contents: [
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/researchToMarketProfileV1Bridge.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/legacyGovernedMarketProfileCandidate.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/kzP0MarketProfileCandidates.ts'))};`,
        `export { PUBLIC_MARKET_PROFILES } from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileRegistry.ts'))};`,
      ].join('\n'),
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'kz-marketprofile-set-entry.ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: OUT,
    logLevel: 'silent',
  });
  const m = await import(`${pathToFileURL(OUT).href}?v=${Date.now()}`);
  const set = m.KZ_P0_MARKET_PROFILE_CANDIDATE_SET;
  const [binance, bybit, okx] = set.entries;

  check('set/1: exact three entries', set.entries.length === 3, `count=${set.entries.length}`);
  check('set/2: exact exchange order', set.entries.map((x) => x.exchangeId).join(',') === 'binance,bybit,okx');
  check('set/3: unique KZ pairs', new Set(set.entries.map((x) => `${x.exchangeId}:${x.countryCode}`)).size === 3);
  check('set/4: all country KZ', set.entries.every((x) => x.countryCode === 'KZ'));
  check('set/5: exact provenance classes', set.entries.map((x) => x.provenanceClass).join(',') === 'modern_research_main,legacy_portal_review_master,legacy_research_pilot_main');
  const { setDigest, ...setBase } = set;
  check('set/6: set digest recomputes', setDigest === `fnv1a64:${fnv1a64(canonicalize(setBase))}`);

  const binanceRecomputed = m.buildCountryMarketProfileV1Candidate(m.KZ_BINANCE_MODERN_REQUEST);
  check('binance/1: modern candidate recomputes exact', canonicalize(binanceRecomputed) === canonicalize(binance.candidate));
  check('binance/2: modern provenance uses research main', binance.candidate.source.sourceBranch === 'main');
  check('binance/3: modern lifecycle exact', binance.candidate.source.researchState === 'RESEARCH_RECORD_MERGED_TO_MAIN');
  check('binance/4: candidate state', binance.candidate.state === 'candidate');
  check('binance/5: availability limited', binance.candidate.proposedProfile?.availability === 'limited');
  check('binance/6: regulation licensed', binance.candidate.proposedProfile?.regulation.state === 'licensed');
  check('binance/7: KYC supported', binance.candidate.proposedProfile?.kyc.state === 'supported');
  check('binance/8: direct deposit under review', binance.candidate.proposedProfile?.deposits.state === 'under_review');
  check('binance/9: direct withdrawal under review', binance.candidate.proposedProfile?.withdrawals.state === 'under_review');
  check('binance/10: KZT P2P preserved limited', binance.candidate.proposedProfile?.fiatPayments.state === 'limited' && binance.candidate.proposedProfile?.fiatPayments.methods.includes('KZT P2P escrow marketplace'));
  check('binance/11: bonus under review', binance.candidate.proposedProfile?.bonusAvailability.state === 'under_review');
  check('binance/12: all auth false', allFalse(binance.candidate));
  check('binance/13: promotion ceiling false', binance.candidate.authorizationCeilingAllowsLaterPromotion === false);
  check('binance/14: no public/import authority', !binance.candidate.importable && !binance.candidate.publicAuthority);

  const bybitRecomputed = m.buildLegacyGovernedMarketProfileV1Candidate(m.KZ_BYBIT_LEGACY_REQUEST);
  check('bybit/1: legacy candidate recomputes exact', canonicalize(bybitRecomputed) === canonicalize(bybit.candidate));
  check('bybit/2: exact legacy master provenance', bybit.candidate.source.sourceBranch === 'master' && bybit.candidate.source.sourceCommitSha === '41d7b5a59b6b08f521e9fe79a9f71753d5d7a361');
  check('bybit/3: lifecycle visibly legacy', /^LEGACY_GOVERNED:portal_review_master:/.test(bybit.candidate.source.researchState));
  check('bybit/4: candidate state', bybit.candidate.state === 'candidate');
  check('bybit/5: expired availability not carried forward', bybit.candidate.proposedProfile?.availability === 'unknown');
  check('bybit/6: AFSA licence retained', bybit.candidate.proposedProfile?.regulation.state === 'licensed');
  check('bybit/7: KYC retained supported', bybit.candidate.proposedProfile?.kyc.state === 'supported');
  check('bybit/8: P2P evidence only under review', bybit.candidate.proposedProfile?.fiatPayments.state === 'under_review');
  check('bybit/9: KZT P2P label retained', bybit.candidate.proposedProfile?.fiatPayments.methods.includes('KZT P2P'));
  check('bybit/10: bonus under review', bybit.candidate.proposedProfile?.bonusAvailability.state === 'under_review');
  check('bybit/11: all auth hard false', allFalse(bybit.candidate));
  check('bybit/12: promotion ceiling hard false', bybit.candidate.authorizationCeilingAllowsLaterPromotion === false);
  check('bybit/13: no public/import authority', !bybit.candidate.importable && !bybit.candidate.publicAuthority);
  check('bybit/14: source claim expiry limitation visible', bybit.candidate.proposedProfile?.limitations.some((x) => /expired on 2026-08-03/i.test(x)));

  const okxRecomputed = m.buildLegacyGovernedMarketProfileV1Candidate(m.KZ_OKX_LEGACY_REQUEST);
  check('okx/1: legacy blocked candidate recomputes exact', canonicalize(okxRecomputed) === canonicalize(okx.candidate));
  check('okx/2: exact research-pilot main provenance', okx.candidate.source.sourceBranch === 'main');
  check('okx/3: lifecycle visibly legacy pilot', /^LEGACY_GOVERNED:research_pilot_main:/.test(okx.candidate.source.researchState));
  check('okx/4: source recommendation conflicting', /CONFLICT/i.test(okx.candidate.source.overallRecommendation));
  check('okx/5: source import readiness blocked', /BLOCKED/i.test(okx.candidate.source.importReadiness));
  check('okx/6: state blocked', okx.candidate.state === 'blocked');
  check('okx/7: blocked profile null', okx.candidate.proposedProfile === null);
  check('okx/8: all auth hard false', allFalse(okx.candidate));
  check('okx/9: promotion ceiling hard false', okx.candidate.authorizationCeilingAllowsLaterPromotion === false);
  check('okx/10: no public/import authority', !okx.candidate.importable && !okx.candidate.publicAuthority);
  check('okx/11: conflict limitation retained', okx.candidate.limitations.some((x) => /BLOCKED_OR_CONFLICTING/i.test(x)));

  const fakeModernBybit = clone(m.KZ_BINANCE_MODERN_REQUEST);
  fakeModernBybit.expected.sourceCommitSha = m.KZ_BYBIT_PORTAL_REVIEW_SHA;
  fakeModernBybit.expected.taskId = 'CBW-052C';
  fakeModernBybit.expected.exchangeId = 'bybit';
  fakeModernBybit.expected.artifactBindings = clone(m.KZ_BYBIT_LEGACY_REQUEST.expected.artifactBindings).map((x) => ({ ...x, digest: x.digest.replace(/^gitblob:/, 'sha256:').replace(/[a-f0-9]{40}$/, '0'.repeat(64)) }));
  fakeModernBybit.packet.provenance.repository = 'ros190392-source/cryptobonusworld';
  fakeModernBybit.packet.provenance.sourceBranch = 'master';
  fakeModernBybit.packet.provenance.sourceCommitSha = m.KZ_BYBIT_PORTAL_REVIEW_SHA;
  fakeModernBybit.packet.provenance.taskId = 'CBW-052C';
  fakeModernBybit.packet.provenance.exchangeId = 'bybit';
  fakeModernBybit.packet.provenance.researchState = 'LEGACY_GOVERNED_PORTAL_REVIEW';
  fakeModernBybit.packet.provenance.artifactBindings = fakeModernBybit.expected.artifactBindings;
  const modernRejectsBybit = m.buildCountryMarketProfileV1Candidate(fakeModernBybit);
  check('boundary/1: modern bridge rejects legacy Bybit', modernRejectsBybit.state === 'invalid');
  check('boundary/2: source-branch boundary explicit', modernRejectsBybit.validationIssues.includes('SOURCE_BRANCH_NOT_RESEARCH_MAIN'));
  check('boundary/3: research-state boundary explicit', modernRejectsBybit.validationIssues.includes('RESEARCH_NOT_MERGED_TO_MAIN'));

  const legacyWrongBranch = clone(m.KZ_BYBIT_LEGACY_REQUEST);
  legacyWrongBranch.packet.provenance.sourceBranch = 'main';
  check('legacy-mut/1: portal review cannot masquerade as main', m.buildLegacyGovernedMarketProfileV1Candidate(legacyWrongBranch).state === 'invalid');
  const legacyWrongCommit = clone(m.KZ_BYBIT_LEGACY_REQUEST);
  legacyWrongCommit.packet.provenance.sourceCommitSha = 'a'.repeat(40);
  check('legacy-mut/2: commit mismatch invalid', m.buildLegacyGovernedMarketProfileV1Candidate(legacyWrongCommit).state === 'invalid');
  const legacyWrongBlob = clone(m.KZ_BYBIT_LEGACY_REQUEST);
  legacyWrongBlob.packet.provenance.artifactBindings[0].digest = `gitblob:${'a'.repeat(40)}`;
  check('legacy-mut/3: artifact binding substitution invalid', m.buildLegacyGovernedMarketProfileV1Candidate(legacyWrongBlob).state === 'invalid');
  const legacyUnsafePath = clone(m.KZ_BYBIT_LEGACY_REQUEST);
  legacyUnsafePath.packet.provenance.artifactBindings[0].path = '../unsafe';
  legacyUnsafePath.expected.artifactBindings[0].path = '../unsafe';
  check('legacy-mut/4: unsafe artifact path invalid', m.buildLegacyGovernedMarketProfileV1Candidate(legacyUnsafePath).state === 'invalid');
  const legacyWrongKind = clone(m.KZ_BYBIT_LEGACY_REQUEST);
  legacyWrongKind.packet.provenance.governanceKind = 'research_pilot_main';
  check('legacy-mut/5: governance kind mismatch invalid', m.buildLegacyGovernedMarketProfileV1Candidate(legacyWrongKind).state === 'invalid');

  const okxUnblockedText = clone(m.KZ_OKX_LEGACY_REQUEST);
  okxUnblockedText.packet.provenance.importReadiness = 'CANDIDATE_ONLY';
  okxUnblockedText.packet.provenance.overallRecommendation = 'AVAILABLE_WITH_LIMITS';
  check('okx-mut/1: conflicting signals still force blocked', m.buildLegacyGovernedMarketProfileV1Candidate(okxUnblockedText).state === 'blocked');

  check('authority/1: every KZ entry non-importable', set.entries.every((x) => x.candidate.importable === false));
  check('authority/2: every KZ entry non-public', set.entries.every((x) => x.candidate.publicAuthority === false));
  check('authority/3: every KZ entry promotion ceiling false', set.entries.every((x) => x.candidate.authorizationCeilingAllowsLaterPromotion === false));
  check('authority/4: every KZ source authorization false', set.entries.every((x) => allFalse(x.candidate)));
  check('public/1: PUBLIC_MARKET_PROFILES frozen empty', Object.isFrozen(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);
  check('public/2: legacy adapter never imports public registry', !/marketProfileRegistry|PUBLIC_MARKET_PROFILES/.test(readFileSync(join(ROOT, 'src/data/contracts/legacyGovernedMarketProfileCandidate.ts'), 'utf8')));
  check('public/3: KZ candidate module never imports public registry', !/marketProfileRegistry|PUBLIC_MARKET_PROFILES/.test(readFileSync(join(ROOT, 'src/data/candidates/kzP0MarketProfileCandidates.ts'), 'utf8')));
  check('public/4: modern bridge source unchanged by this PR scope', !readFileSync(join(ROOT, 'src/data/contracts/legacyGovernedMarketProfileCandidate.ts'), 'utf8').includes('SOURCE_BRANCH_NOT_RESEARCH_MAIN'));

  if (failures.length) {
    console.error(`CBW MARKETPROFILE KZ P0 MIXED SET: FAIL (${failures.length}/${checks})`);
    for (const f of failures) console.error(` - ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`CBW MARKETPROFILE KZ P0 MIXED SET: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW MARKETPROFILE KZ P0 MIXED SET: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
