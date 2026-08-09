#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-marketprofile-registry-guard-'));
const OUT = join(TMP, 'registry-guard.mjs');
const NOW = Date.parse('2026-08-09T20:45:00Z');
let checks = 0;
const failures = [];
function check(name, ok, detail = '') { checks += 1; if (!ok) failures.push(detail ? `${name}: ${detail}` : name); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

try {
  await build({
    stdin: {
      contents: [
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileRegistryMutationGuard.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfileImportDryRun.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfilePromotionPreflight.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfileReviewPreflight.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfileCandidateInventory.ts'))};`,
        `export { validateMarketProfile } from ${JSON.stringify(join(ROOT, 'src/data/contracts/portalFactory.ts'))};`,
        `export { PUBLIC_MARKET_PROFILES } from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileRegistry.ts'))};`,
      ].join('\n'),
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'marketprofile-registry-guard-test-entry.ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: OUT,
    logLevel: 'silent',
  });
  const m = await import(`${pathToFileURL(OUT).href}?v=${Date.now()}`);
  const inventory = m.createPlKzMarketProfileCandidateInventory(NOW);
  const reviewPreflight = m.createPlKzMarketProfileReviewPreflight(NOW);
  const promotionPreflight = m.createPlKzMarketProfilePromotionPreflight(NOW);
  const sources = m.PL_KZ_MARKET_PROFILE_CANDIDATE_SOURCES;
  const dryRun = m.createPlKzMarketProfileImportDryRun(NOW);
  const upstream = { dryRun, inventory, reviewPreflight, promotionPreflight, sources };

  const syntheticPl = {
    profileId: 'test-only:okx:PL',
    exchangeId: 'okx',
    countryCode: 'PL',
    availability: 'available',
    offerEligibility: 'approved',
    claimIds: ['test-only-claim-okx-pl'],
    limitations: ['Synthetic structurally valid profile for registry-guard regression only.'],
    lastCheckedAt: '2026-08-09T00:00:00Z',
    nextReviewAt: '2026-08-10T00:00:00Z',
    approval: 'approved',
  };
  const syntheticKz = {
    profileId: 'test-only:binance:KZ',
    exchangeId: 'binance',
    countryCode: 'KZ',
    availability: 'limited',
    offerEligibility: 'under_review',
    claimIds: ['test-only-claim-binance-kz'],
    limitations: ['Second synthetic valid profile for reorder regression only.'],
    lastCheckedAt: '2026-08-09T00:00:00Z',
    nextReviewAt: '2026-08-10T00:00:00Z',
    approval: 'draft',
  };
  check('fixture/1: synthetic approved PL profile structurally valid', m.validateMarketProfile(syntheticPl).ok);
  check('fixture/2: synthetic KZ profile structurally valid', m.validateMarketProfile(syntheticKz).ok);

  const canonical = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, currentRegistry: m.PUBLIC_MARKET_PROFILES, proposedRegistry: [] });
  check('guard/1: canonical current empty registry frozen', Object.isFrozen(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);
  check('guard/2: [] -> [] no-op allowed', canonical.state === 'no_op_allowed' && canonical.allowed === true);
  check('guard/3: no mutation detected', canonical.mutationDetected === false && canonical.mutationCount === 0);
  check('guard/4: no mutation applied', canonical.mutationApplied === false);
  check('guard/5: no publication', canonical.publicationPerformed === false);
  check('guard/6: no deploy', canonical.deployRequired === false);
  check('guard/7: no public authority', canonical.publicAuthority === false);
  check('guard/8: exact no-op reason', canonical.reasons.includes('EXACT_REGISTRY_NO_OP'));
  check('guard/9: current/proposed empty digests equal', canonical.currentRegistryDigest === canonical.proposedRegistryDigest);
  check('guard/10: decision validates', m.validateMarketProfileRegistryMutationGuardDecision(canonical, { ...upstream, currentRegistry: m.PUBLIC_MARKET_PROFILES, proposedRegistry: [] }).ok);

  const add = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, currentRegistry: [], proposedRegistry: [syntheticPl] });
  check('add/1: structurally valid approved profile still blocked', add.state === 'blocked' && add.allowed === false);
  check('add/2: mutation detected', add.mutationDetected === true && add.mutationCount >= 1);
  check('add/3: zero-import reason', add.reasons.includes('ZERO_IMPORT_DRY_RUN_FORBIDS_REGISTRY_MUTATION'));
  check('add/4: blocked guard still applies nothing', !add.mutationApplied && !add.publicationPerformed && !add.deployRequired && !add.publicAuthority);

  const remove = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, currentRegistry: [syntheticPl], proposedRegistry: [] });
  check('remove/1: removal blocked', remove.state === 'blocked' && remove.mutationDetected);

  const replaceProfile = { ...syntheticPl, profileId: 'test-only:okx:PL:replacement', limitations: ['Changed synthetic profile.'] };
  check('replace/fixture: replacement structurally valid', m.validateMarketProfile(replaceProfile).ok);
  const replace = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, currentRegistry: [syntheticPl], proposedRegistry: [replaceProfile] });
  check('replace/1: replacement blocked', replace.state === 'blocked' && replace.mutationCount >= 1);

  const reorder = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, currentRegistry: [syntheticPl, syntheticKz], proposedRegistry: [syntheticKz, syntheticPl] });
  check('reorder/1: reorder is material and blocked', reorder.state === 'blocked' && reorder.mutationDetected && reorder.mutationCount >= 1);

  const nonEmptyNoOp = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, currentRegistry: [syntheticPl], proposedRegistry: [clone(syntheticPl)] });
  check('noop/1: exact non-empty no-op allowed by pure guard', nonEmptyNoOp.state === 'no_op_allowed' && nonEmptyNoOp.mutationCount === 0);

  const malformedProposed = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, currentRegistry: [], proposedRegistry: null });
  check('invalid/1: null proposed invalid', malformedProposed.state === 'invalid' && malformedProposed.reasons.includes('PROPOSED_REGISTRY_NOT_ARRAY'));
  const primitiveEntry = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, currentRegistry: [], proposedRegistry: [42] });
  check('invalid/2: primitive profile invalid', primitiveEntry.state === 'invalid');
  const invalidProfile = { ...syntheticPl, approval: 'approved', availability: 'unknown' };
  check('invalid/fixture: malformed approved unknown profile rejected', !m.validateMarketProfile(invalidProfile).ok);
  const invalidProfileDecision = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, currentRegistry: [], proposedRegistry: [invalidProfile] });
  check('invalid/3: invalid profile registry invalid', invalidProfileDecision.state === 'invalid');
  const duplicate = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, currentRegistry: [], proposedRegistry: [syntheticPl, clone(syntheticPl)] });
  check('invalid/4: duplicate pair invalid atomically', duplicate.state === 'invalid' && duplicate.reasons.some((x) => /DUPLICATE_PAIR/.test(x)));
  const malformedCurrent = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, currentRegistry: {}, proposedRegistry: [] });
  check('invalid/5: malformed current invalid', malformedCurrent.state === 'invalid');

  const dryRunDigestTamper = clone(dryRun);
  dryRunDigestTamper.dryRunDigest = 'fnv1a64:0000000000000000';
  const badDryRunDigest = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, dryRun: dryRunDigestTamper, currentRegistry: [], proposedRegistry: [] });
  check('dryrun-mut/1: dry-run digest tamper invalid', badDryRunDigest.state === 'invalid');
  const dryRunImportTamper = clone(dryRun);
  dryRunImportTamper.plannedImports.push({ exchangeId: 'okx', countryCode: 'PL' });
  const badDryRunImport = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, dryRun: dryRunImportTamper, currentRegistry: [], proposedRegistry: [] });
  check('dryrun-mut/2: planned import injection invalid', badDryRunImport.state === 'invalid');
  const dryRunRegistryTamper = clone(dryRun);
  dryRunRegistryTamper.registryMutations.push({ op: 'add' });
  const badDryRunRegistry = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, dryRun: dryRunRegistryTamper, currentRegistry: [], proposedRegistry: [] });
  check('dryrun-mut/3: dry-run registry mutation injection invalid', badDryRunRegistry.state === 'invalid');
  const dryRunActionTamper = clone(dryRun);
  dryRunActionTamper.entries[0].plannedAction = 'import';
  const badDryRunAction = m.evaluateMarketProfileRegistryMutationGuard({ ...upstream, dryRun: dryRunActionTamper, currentRegistry: [], proposedRegistry: [] });
  check('dryrun-mut/4: action mutation invalid', badDryRunAction.state === 'invalid');

  const stateTamper = clone(add);
  stateTamper.state = 'no_op_allowed';
  stateTamper.allowed = true;
  check('decision-mut/1: blocked -> allowed tamper invalid', !m.validateMarketProfileRegistryMutationGuardDecision(stateTamper, { ...upstream, currentRegistry: [], proposedRegistry: [syntheticPl] }).ok);
  const appliedTamper = clone(canonical);
  appliedTamper.mutationApplied = true;
  check('decision-mut/2: mutationApplied=true invalid', !m.validateMarketProfileRegistryMutationGuardDecision(appliedTamper, { ...upstream, currentRegistry: [], proposedRegistry: [] }).ok);
  const publishTamper = clone(canonical);
  publishTamper.publicationPerformed = true;
  check('decision-mut/3: publicationPerformed=true invalid', !m.validateMarketProfileRegistryMutationGuardDecision(publishTamper, { ...upstream, currentRegistry: [], proposedRegistry: [] }).ok);
  const deployTamper = clone(canonical);
  deployTamper.deployRequired = true;
  check('decision-mut/4: deployRequired=true invalid', !m.validateMarketProfileRegistryMutationGuardDecision(deployTamper, { ...upstream, currentRegistry: [], proposedRegistry: [] }).ok);
  const authorityTamper = clone(canonical);
  authorityTamper.publicAuthority = true;
  check('decision-mut/5: publicAuthority=true invalid', !m.validateMarketProfileRegistryMutationGuardDecision(authorityTamper, { ...upstream, currentRegistry: [], proposedRegistry: [] }).ok);
  const digestTamper = clone(canonical);
  digestTamper.guardDigest = 'fnv1a64:0000000000000000';
  check('decision-mut/6: guard digest tamper invalid', !m.validateMarketProfileRegistryMutationGuardDecision(digestTamper, { ...upstream, currentRegistry: [], proposedRegistry: [] }).ok);

  const source = readFileSync(join(ROOT, 'src/data/contracts/marketProfileRegistryMutationGuard.ts'), 'utf8');
  check('code/1: guard does not import marketProfileRegistry', !/(?:from\s*['"][^'"]*marketProfileRegistry['"]|import\s*['"][^'"]*marketProfileRegistry['"])/.test(source));
  check('code/2: guard does not reference PUBLIC_MARKET_PROFILES', !/PUBLIC_MARKET_PROFILES/.test(source));
  check('code/3: no registry write/deploy executor', !/performImport|executeImport|writeRegistry|registry\.push|triggerDeploy|publicationExecutor/i.test(source));
  check('public/1: live public registry remains frozen empty after all guard calls', Object.isFrozen(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);

  if (failures.length) {
    console.error(`CBW MARKETPROFILE REGISTRY GUARD: FAIL (${failures.length}/${checks})`);
    for (const f of failures) console.error(` - ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`CBW MARKETPROFILE REGISTRY GUARD: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW MARKETPROFILE REGISTRY GUARD: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
