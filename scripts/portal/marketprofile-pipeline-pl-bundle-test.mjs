#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-marketprofile-pl-bundle-'));
const OUT = join(TMP, 'pl-bundle.mjs');

let checks = 0;
const failures = [];
function check(name, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function authAllFalse(entry) {
  return Object.values(entry.packet.provenance.authorizations).every((value) => value === false);
}

try {
  await build({
    stdin: {
      contents: [
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileCandidateBundle.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/researchToMarketProfileV1Bridge.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plP0MarketProfileCandidates.ts'))};`,
        `export { PUBLIC_MARKET_PROFILES } from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileRegistry.ts'))};`,
      ].join('\n'),
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'marketprofile-pl-bundle-test-entry.ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: OUT,
    logLevel: 'silent',
  });
  const m = await import(`${pathToFileURL(OUT).href}?v=${Date.now()}`);
  const bundle = m.PL_P0_MARKET_PROFILE_CANDIDATE_BUNDLE;

  const validation = m.validateMarketProfileCandidateBundle(bundle);
  check('bundle/1: canonical PL bundle validates', validation.ok, validation.ok ? '' : validation.issues.join(','));
  check('bundle/2: exact research main snapshot', bundle.researchSnapshotSha === 'cb4ee3e55cfc4e2fb48feefaa7b361d89ea14474');
  check('bundle/3: exact PL country', bundle.countryCode === 'PL');
  check('bundle/4: exactly three independent entries', bundle.entries.length === 3, `count=${bundle.entries.length}`);
  check('bundle/5: exact exchange order', bundle.entries.map((x) => x.expected.exchangeId).join(',') === 'binance,bybit,okx');
  check('bundle/6: unique exchange-country pairs', new Set(bundle.entries.map((x) => `${x.expected.exchangeId}:${x.expected.countryCode}`)).size === 3);
  check('bundle/7: every source state merged to main', bundle.entries.every((x) => x.packet.provenance.researchState === 'RESEARCH_RECORD_MERGED_TO_MAIN'));
  check('bundle/8: every source SHA equals bundle snapshot', bundle.entries.every((x) => x.packet.provenance.sourceCommitSha === bundle.researchSnapshotSha && x.expected.sourceCommitSha === bundle.researchSnapshotSha));
  check('bundle/9: all research authority snapshots false', bundle.entries.every(authAllFalse));
  check('bundle/10: every entry has non-empty exact artifact bindings', bundle.entries.every((x) => x.expected.artifactBindings.length >= 8 && x.expected.artifactBindings.every((b) => /^sha256:[a-f0-9]{64}$/.test(b.digest))));

  for (const entry of bundle.entries) {
    const slug = entry.expected.exchangeId;
    const recomputed = m.buildCountryMarketProfileV1Candidate({ expected: entry.expected, packet: entry.packet });
    check(`${slug}/recompute: candidate digest exact`, recomputed.candidateDigest === entry.candidate.candidateDigest);
    check(`${slug}/recompute: candidate state exact`, recomputed.state === entry.candidate.state);
    check(`${slug}/safe: materialized candidate not invalid`, entry.candidate.state !== 'invalid');
    check(`${slug}/safe: importable false`, entry.candidate.importable === false);
    check(`${slug}/safe: public authority false`, entry.candidate.publicAuthority === false);
    check(`${slug}/safe: source promotion ceiling false`, entry.candidate.authorizationCeilingAllowsLaterPromotion === false);
    check(`${slug}/safe: draft profile`, entry.candidate.proposedProfile?.approval === 'draft');
    check(`${slug}/safe: offer remains under review`, entry.candidate.proposedProfile?.offerEligibility === 'under_review');
  }

  const [binance, bybit, okx] = bundle.entries;
  check('binance/1: candidate state retained', binance.candidate.state === 'candidate');
  check('binance/2: country availability remains unknown', binance.candidate.proposedProfile?.availability === 'unknown', `actual=${binance.candidate.proposedProfile?.availability}`);
  check('binance/3: regulation under review', binance.candidate.proposedProfile?.regulation.state === 'under_review');
  check('binance/4: public PLN/P2P surfaces do not become supported fiat', binance.candidate.proposedProfile?.fiatPayments.state === 'under_review');
  check('binance/5: P2P surface labels preserved for review', binance.candidate.proposedProfile?.fiatPayments.methods.includes('PLN P2P surface') && binance.candidate.proposedProfile?.fiatPayments.methods.includes('Santander Poland P2P payment-method surface'));
  check('binance/6: bonus remains under review', binance.candidate.proposedProfile?.bonusAvailability.state === 'under_review');

  check('bybit/1: candidate state retained', bybit.candidate.state === 'candidate');
  check('bybit/2: core availability limited not blanket available', bybit.candidate.proposedProfile?.availability === 'limited');
  check('bybit/3: direct FMA MiCAR regulation retained licensed', bybit.candidate.proposedProfile?.regulation.state === 'licensed');
  check('bybit/4: KYC supported', bybit.candidate.proposedProfile?.kyc.state === 'supported');
  check('bybit/5: BLIK deposit limited', bybit.candidate.proposedProfile?.deposits.state === 'limited');
  check('bybit/6: exact PLN withdrawal remains under review', bybit.candidate.proposedProfile?.withdrawals.state === 'under_review');
  check('bybit/7: BLIK label preserved', bybit.candidate.proposedProfile?.fiatPayments.methods.includes('BLIK (PLN deposit)'));
  check('bybit/8: restrictions remain under review', bybit.candidate.proposedProfile?.restrictions.state === 'under_review');
  check('bybit/9: bonus remains under review', bybit.candidate.proposedProfile?.bonusAvailability.state === 'under_review');

  check('okx/1: candidate state retained', okx.candidate.state === 'candidate');
  check('okx/2: core availability limited not blanket available', okx.candidate.proposedProfile?.availability === 'limited');
  check('okx/3: separate KNF regimes not promoted to CASP licence', okx.candidate.proposedProfile?.regulation.state === 'under_review');
  check('okx/4: KYC supported', okx.candidate.proposedProfile?.kyc.state === 'supported');
  check('okx/5: EUR SEPA deposit limited', okx.candidate.proposedProfile?.deposits.state === 'limited');
  check('okx/6: EUR SEPA withdrawal limited', okx.candidate.proposedProfile?.withdrawals.state === 'limited');
  check('okx/7: PLN P2P + EUR SEPA methods preserved', ['PLN P2P', 'EUR SEPA deposit', 'EUR SEPA withdrawal'].every((method) => okx.candidate.proposedProfile?.fiatPayments.methods.includes(method)));
  check('okx/8: direct PLN bank uncertainty preserved in limitations', okx.candidate.proposedProfile?.fiatPayments.limitations.some((x) => /Direct PLN bank/i.test(x)));
  check('okx/9: restrictions remain under review', okx.candidate.proposedProfile?.restrictions.state === 'under_review');
  check('okx/10: bonus remains under review', okx.candidate.proposedProfile?.bonusAvailability.state === 'under_review');

  check('public/1: PUBLIC_MARKET_PROFILES remains frozen empty', Object.isFrozen(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);
  check('public/2: candidate data module does not import public registry', !/marketProfileRegistry|PUBLIC_MARKET_PROFILES/.test(readFileSync(join(ROOT, 'src/data/candidates/plP0MarketProfileCandidates.ts'), 'utf8')));
  check('public/3: bundle contract does not import public registry', !/marketProfileRegistry|PUBLIC_MARKET_PROFILES/.test(readFileSync(join(ROOT, 'src/data/contracts/marketProfileCandidateBundle.ts'), 'utf8')));

  const bundleTamper = clone(bundle);
  bundleTamper.bundleDigest = 'fnv1a64:0000000000000000';
  check('mut/1: bundle digest tamper invalid', !m.validateMarketProfileCandidateBundle(bundleTamper).ok);

  const sourceTamper = clone(bundle);
  sourceTamper.entries[0].packet.provenance.sourceCommitSha = 'a'.repeat(40);
  check('mut/2: packet source SHA tamper invalid', !m.validateMarketProfileCandidateBundle(sourceTamper).ok);

  const expectedTamper = clone(bundle);
  expectedTamper.entries[1].expected.sourceCommitSha = 'b'.repeat(40);
  check('mut/3: expected source SHA tamper invalid', !m.validateMarketProfileCandidateBundle(expectedTamper).ok);

  const artifactTamper = clone(bundle);
  artifactTamper.entries[1].packet.provenance.artifactBindings[0].digest = `sha256:${'0'.repeat(64)}`;
  check('mut/4: artifact digest substitution invalid', !m.validateMarketProfileCandidateBundle(artifactTamper).ok);

  const candidateDigestTamper = clone(bundle);
  candidateDigestTamper.entries[2].candidate.candidateDigest = 'fnv1a64:0000000000000000';
  check('mut/5: candidate digest tamper invalid', !m.validateMarketProfileCandidateBundle(candidateDigestTamper).ok);

  const candidateStateTamper = clone(bundle);
  candidateStateTamper.entries[0].candidate.importable = true;
  check('mut/6: importable=true invalid', !m.validateMarketProfileCandidateBundle(candidateStateTamper).ok);

  const publicTamper = clone(bundle);
  publicTamper.entries[0].candidate.publicAuthority = true;
  check('mut/7: publicAuthority=true invalid', !m.validateMarketProfileCandidateBundle(publicTamper).ok);

  const duplicatePair = clone(bundle);
  duplicatePair.entries[2].expected.exchangeId = duplicatePair.entries[1].expected.exchangeId;
  duplicatePair.entries[2].packet.provenance.exchangeId = duplicatePair.entries[1].packet.provenance.exchangeId;
  check('mut/8: duplicate Exchange×Country invalid', !m.validateMarketProfileCandidateBundle(duplicatePair).ok);

  const wrongCountry = clone(bundle);
  wrongCountry.entries[0].expected.countryCode = 'KZ';
  check('mut/9: cross-country binding invalid', !m.validateMarketProfileCandidateBundle(wrongCountry).ok);

  const wrongTask = clone(bundle);
  wrongTask.entries[0].packet.provenance.taskId = 'CBW-WRONG-TASK-001';
  check('mut/10: task identity tamper invalid', !m.validateMarketProfileCandidateBundle(wrongTask).ok);

  const localeDecoration = clone(bundle);
  localeDecoration.presentation = { locale: 'pl-PL', label: 'Polska' };
  check('locale/1: extra presentation decoration cannot validate as canonical bundle digest', !m.validateMarketProfileCandidateBundle(localeDecoration).ok);
  const originalAgain = m.validateMarketProfileCandidateBundle(bundle);
  check('locale/2: canonical bundle facts remain unchanged', originalAgain.ok && bundle.entries[1].candidate.proposedProfile?.availability === 'limited');

  if (failures.length) {
    console.error(`CBW MARKETPROFILE PL P0 BUNDLE: FAIL (${failures.length}/${checks})`);
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`CBW MARKETPROFILE PL P0 BUNDLE: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW MARKETPROFILE PL P0 BUNDLE: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
