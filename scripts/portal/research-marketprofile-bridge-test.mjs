#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-research-marketprofile-'));
const OUT = join(TMP, 'bridge.mjs');

let checks = 0;
const failures = [];
function check(name, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

try {
  await build({
    stdin: {
      contents: [
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/researchToMarketProfileV1Bridge.ts'))};`,
        `export { validateCountryMarketProfileV1 } from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileV1.ts'))};`,
        `export { PUBLIC_MARKET_PROFILES } from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileRegistry.ts'))};`,
      ].join('\n'),
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'bridge-test-entry.ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: OUT,
    logLevel: 'silent',
  });
  const m = await import(`${pathToFileURL(OUT).href}?v=${Date.now()}`);

  const allFalse = Object.freeze({
    researchImportAuthorized: false,
    stagingImportAuthorized: false,
    canonicalImportAuthorized: false,
    productionChangeAuthorized: false,
    productionBindingAuthorized: false,
    publicationAuthorized: false,
    masterChangeAuthorized: false,
  });

  const binanceBinding = Object.freeze([{
    path: 'research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001/60-correction/20-corrected-output/MANIFEST.txt',
    digest: 'sha256:72d6ae137a2fc0e057a803e869b2591d41f8d1d2d79dc3942b4efae5772062d1',
  }]);

  const binancePacket = {
    schemaVersion: 1,
    provenance: {
      repository: 'ros190392-source/cryptobonusworld',
      sourceBranch: 'main',
      sourceCommitSha: '0da6189acb994030df832c2ecb778c074ec68403',
      taskId: 'CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001',
      exchangeId: 'binance',
      countryCode: 'KZ',
      researchState: 'RESEARCH_RECORD_MERGED_TO_MAIN',
      importReadiness: 'CANDIDATE_ONLY_AUTHORIZATION_FALSE',
      overallRecommendation: 'AVAILABLE_WITH_LIMITS_CANDIDATE',
      confidence: 'high',
      lastCheckedAt: '2026-07-29T00:00:00Z',
      nextReviewAt: '2026-08-29T00:00:00Z',
      artifactBindings: binanceBinding,
      authorizations: allFalse,
    },
    signals: {
      availability: { signal: 'supported_with_limits', claimIds: ['CLM001'], limitations: ['Country/product eligibility remains conditional.'] },
      regulation: { signal: 'licensed', legalEntityClaimIds: ['CLM010'], licenseClaimIds: ['CLM011'], limitations: ['Licence scope must not be generalized beyond cited activities.'] },
      kyc: { signal: 'supported_with_limits', claimIds: ['CLM018'], limitations: ['Account-level compliance remains conditional.'] },
      deposits: { signal: 'supported_with_limits', claimIds: ['CLM045'], limitations: ['On-chain deposits are distinct from current KZT bank rails.'] },
      withdrawals: { signal: 'supported_with_limits', claimIds: ['CLM045'], limitations: ['Network/account conditions apply.'] },
      fiatPayments: {
        signal: 'current_operational_availability_not_independently_confirmed',
        claimIds: ['CLM021', 'CLM022', 'CLM024', 'CLM025'],
        limitations: ['Freedom Bank/Mastercard current operational status not independently confirmed.', 'Named P2P methods prove surfaces, not active offers/directions/resident eligibility.'],
        methods: ['KZT P2P escrow marketplace', 'Freedom Bank KZT online banking', 'Kazakhstan-issued Mastercard cash-out'],
      },
      products: { signal: 'under_review', claimIds: ['CLM028', 'CLM029', 'CLM030'], limitations: ['Public product visibility does not prove universal account eligibility.'] },
      bonusAvailability: { signal: 'under_review', claimIds: ['CLM040'], limitations: ['Referral visibility does not prove Kazakhstan eligibility for the governed campaign.'] },
      restrictions: { signal: 'under_review', claimIds: [], limitations: ['Product/resident restrictions remain unresolved at candidate stage.'] },
    },
  };

  const binanceExpected = {
    repository: binancePacket.provenance.repository,
    sourceCommitSha: binancePacket.provenance.sourceCommitSha,
    taskId: binancePacket.provenance.taskId,
    exchangeId: binancePacket.provenance.exchangeId,
    countryCode: binancePacket.provenance.countryCode,
    artifactBindings: binanceBinding,
  };

  const candidate = m.buildCountryMarketProfileV1Candidate({ expected: binanceExpected, packet: binancePacket });
  check('Binance KZ exact source => draft candidate', candidate.state === 'candidate');
  check('candidate has profile', candidate.proposedProfile !== null);
  check('candidate profile validates structurally', m.validateCountryMarketProfileV1(candidate.proposedProfile).ok);
  check('candidate is never importable', candidate.importable === false);
  check('candidate carries no public authority', candidate.publicAuthority === false);
  check('candidate approval stays draft', candidate.proposedProfile?.approval === 'draft');
  check('candidate offer stays under review', candidate.proposedProfile?.offerEligibility === 'under_review');
  check('available-with-limits maps to limited', candidate.proposedProfile?.availability === 'limited');
  check('licensed regulation preserved', candidate.proposedProfile?.regulation.state === 'licensed');
  check('unconfirmed KZT rails are not supported', candidate.proposedProfile?.fiatPayments.state === 'under_review');
  check('unconfirmed method labels preserved for review', candidate.proposedProfile?.fiatPayments.methods.includes('Freedom Bank KZT online banking'));
  check('products with eligibility caveats remain under review', candidate.proposedProfile?.products.state === 'under_review');
  check('referral visibility remains under review', candidate.proposedProfile?.bonusAvailability.state === 'under_review');
  check('research auth false blocks later-promotion ceiling', candidate.authorizationCeilingAllowsLaterPromotion === false);
  check('unresolved dimensions explicitly reported', ['fiatPayments', 'products', 'bonusAvailability', 'restrictions'].every(x => candidate.unresolvedDimensions.includes(x)));
  check('candidate has deterministic labelled digest', /^fnv1a64:[a-f0-9]{16}$/.test(candidate.candidateDigest));

  const candidateAgain = m.buildCountryMarketProfileV1Candidate({ expected: clone(binanceExpected), packet: clone(binancePacket) });
  check('digest deterministic across equivalent packets', candidateAgain.candidateDigest === candidate.candidateDigest);

  const reversedExpected = clone(binanceExpected);
  reversedExpected.artifactBindings = [...reversedExpected.artifactBindings].reverse();
  check('artifact order does not affect result', m.buildCountryMarketProfileV1Candidate({ expected: reversedExpected, packet: clone(binancePacket) }).candidateDigest === candidate.candidateDigest);

  const localeDecorated = clone(binancePacket);
  localeDecorated.locale = 'pl';
  check('locale decoration cannot alter candidate facts/digest', m.buildCountryMarketProfileV1Candidate({ expected: clone(binanceExpected), packet: localeDecorated }).candidateDigest === candidate.candidateDigest);

  const wrongSha = clone(binanceExpected);
  wrongSha.sourceCommitSha = '1111111111111111111111111111111111111111';
  check('changed expected source SHA => invalid', m.buildCountryMarketProfileV1Candidate({ expected: wrongSha, packet: clone(binancePacket) }).state === 'invalid');

  const wrongDigest = clone(binanceExpected);
  wrongDigest.artifactBindings[0].digest = `sha256:${'1'.repeat(64)}`;
  check('artifact digest mismatch => invalid', m.buildCountryMarketProfileV1Candidate({ expected: wrongDigest, packet: clone(binancePacket) }).state === 'invalid');

  const wrongTask = clone(binanceExpected);
  wrongTask.taskId = 'CBW-KZ-WRONG';
  check('wrong task identity => invalid', m.buildCountryMarketProfileV1Candidate({ expected: wrongTask, packet: clone(binancePacket) }).state === 'invalid');
  const wrongExchange = clone(binanceExpected);
  wrongExchange.exchangeId = 'okx';
  check('wrong exchange identity => invalid', m.buildCountryMarketProfileV1Candidate({ expected: wrongExchange, packet: clone(binancePacket) }).state === 'invalid');
  const wrongCountry = clone(binanceExpected);
  wrongCountry.countryCode = 'PL';
  check('wrong country identity => invalid', m.buildCountryMarketProfileV1Candidate({ expected: wrongCountry, packet: clone(binancePacket) }).state === 'invalid');

  const wrongRepoPacket = clone(binancePacket);
  wrongRepoPacket.provenance.repository = 'example/other';
  check('wrong repository => invalid', m.buildCountryMarketProfileV1Candidate({ expected: clone(binanceExpected), packet: wrongRepoPacket }).state === 'invalid');
  const wrongBranchPacket = clone(binancePacket);
  wrongBranchPacket.provenance.sourceBranch = 'master';
  check('runtime/product branch cannot masquerade as research source', m.buildCountryMarketProfileV1Candidate({ expected: clone(binanceExpected), packet: wrongBranchPacket }).state === 'invalid');
  const unmergedPacket = clone(binancePacket);
  unmergedPacket.provenance.researchState = 'VALIDATED';
  check('unmerged research state => invalid', m.buildCountryMarketProfileV1Candidate({ expected: clone(binanceExpected), packet: unmergedPacket }).state === 'invalid');

  const traversalPacket = clone(binancePacket);
  traversalPacket.provenance.artifactBindings[0].path = '../MANIFEST.txt';
  check('artifact traversal => invalid', m.buildCountryMarketProfileV1Candidate({ expected: clone(binanceExpected), packet: traversalPacket }).state === 'invalid');
  const duplicatePacket = clone(binancePacket);
  duplicatePacket.provenance.artifactBindings.push(clone(duplicatePacket.provenance.artifactBindings[0]));
  check('duplicate artifact path => invalid', m.buildCountryMarketProfileV1Candidate({ expected: clone(binanceExpected), packet: duplicatePacket }).state === 'invalid');

  const badWindow = clone(binancePacket);
  badWindow.provenance.nextReviewAt = badWindow.provenance.lastCheckedAt;
  check('invalid review window => invalid', m.buildCountryMarketProfileV1Candidate({ expected: clone(binanceExpected), packet: badWindow }).state === 'invalid');

  const unknownStatus = clone(binancePacket);
  unknownStatus.signals.products.signal = 'FUTURE_UNKNOWN_VENDOR_STATUS';
  const unknownResult = m.buildCountryMarketProfileV1Candidate({ expected: clone(binanceExpected), packet: unknownStatus });
  check('unknown product status fails conservative, never supported', unknownResult.state === 'candidate' && unknownResult.proposedProfile?.products.state === 'unknown');

  const supportedBonus = clone(binancePacket);
  supportedBonus.signals.bonusAvailability.signal = 'supported';
  const supportedBonusResult = m.buildCountryMarketProfileV1Candidate({ expected: clone(binanceExpected), packet: supportedBonus });
  check('even supported bonus signal cannot approve offer', supportedBonusResult.proposedProfile?.offerEligibility === 'under_review');

  const allTruePacket = clone(binancePacket);
  for (const key of Object.keys(allTruePacket.provenance.authorizations)) allTruePacket.provenance.authorizations[key] = true;
  const allTrueResult = m.buildCountryMarketProfileV1Candidate({ expected: clone(binanceExpected), packet: allTruePacket });
  check('all source ceilings true only marks later review ceiling', allTrueResult.authorizationCeilingAllowsLaterPromotion === true);
  check('bridge still cannot import even with all ceilings true', allTrueResult.importable === false && allTrueResult.publicAuthority === false && allTrueResult.proposedProfile?.approval === 'draft');

  const okxPacket = clone(binancePacket);
  okxPacket.provenance.sourceCommitSha = '2222222222222222222222222222222222222222';
  okxPacket.provenance.taskId = 'CBW-KZ-OKX-P0-C-DEEP-RESEARCH-003-HANDOFF-V1';
  okxPacket.provenance.exchangeId = 'okx';
  okxPacket.provenance.importReadiness = 'BLOCKED';
  okxPacket.provenance.overallRecommendation = 'CONFLICTING';
  okxPacket.provenance.confidence = 'medium';
  okxPacket.provenance.artifactBindings = [{
    path: 'research-ops/handoffs/okx-kz/normalized-package.json',
    digest: `sha256:${'2'.repeat(64)}`,
  }];
  okxPacket.signals.availability.signal = 'conflicting';
  okxPacket.signals.regulation.signal = 'conflicting';
  const okxExpected = {
    repository: okxPacket.provenance.repository,
    sourceCommitSha: okxPacket.provenance.sourceCommitSha,
    taskId: okxPacket.provenance.taskId,
    exchangeId: okxPacket.provenance.exchangeId,
    countryCode: okxPacket.provenance.countryCode,
    artifactBindings: clone(okxPacket.provenance.artifactBindings),
  };
  const okxBlocked = m.buildCountryMarketProfileV1Candidate({ expected: okxExpected, packet: okxPacket });
  check('OKX KZ BLOCKED/CONFLICTING => blocked', okxBlocked.state === 'blocked');
  check('blocked research emits no proposed MarketProfile', okxBlocked.proposedProfile === null);
  check('blocked result never importable/public', okxBlocked.importable === false && okxBlocked.publicAuthority === false);

  const noClaims = clone(binancePacket);
  for (const key of ['availability', 'kyc', 'deposits', 'withdrawals', 'fiatPayments', 'products', 'bonusAvailability']) noClaims.signals[key].claimIds = [];
  noClaims.signals.regulation.legalEntityClaimIds = [];
  noClaims.signals.regulation.licenseClaimIds = [];
  noClaims.signals.restrictions.claimIds = [];
  noClaims.signals.regulation.signal = 'unknown';
  noClaims.signals.availability.signal = 'unknown';
  noClaims.signals.kyc.signal = 'unknown';
  noClaims.signals.deposits.signal = 'unknown';
  noClaims.signals.withdrawals.signal = 'unknown';
  noClaims.signals.fiatPayments.signal = 'unknown';
  noClaims.signals.products.signal = 'unknown';
  noClaims.signals.bonusAvailability.signal = 'unknown';
  check('no evidence claims => invalid, not empty profile', m.buildCountryMarketProfileV1Candidate({ expected: clone(binanceExpected), packet: noClaims }).state === 'invalid');

  check('PUBLIC_MARKET_PROFILES remains frozen empty', Object.isFrozen(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);

  const bridgeSource = readFileSync(join(ROOT, 'src/data/contracts/researchToMarketProfileV1Bridge.ts'), 'utf8');
  check('bridge has no research-branch runtime fetch/import', !bridgeSource.includes('research-ops/tasks/') && !/fetch\s*\(/.test(bridgeSource));
  check('bridge never imports public registry', !bridgeSource.includes('marketProfileRegistry'));
  check('bridge hardcodes draft/non-authorizing floor', bridgeSource.includes("approval: 'draft'") && bridgeSource.includes("offerEligibility: 'under_review'") && bridgeSource.includes('importable: false') && bridgeSource.includes('publicAuthority: false'));

  if (failures.length) {
    console.error(`CBW RESEARCH→MARKETPROFILE BRIDGE: FAIL (${failures.length}/${checks})`);
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`CBW RESEARCH→MARKETPROFILE BRIDGE: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW RESEARCH→MARKETPROFILE BRIDGE: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
