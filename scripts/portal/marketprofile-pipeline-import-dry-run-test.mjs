#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-marketprofile-import-dry-run-'));
const OUT = join(TMP, 'import-dry-run.mjs');
const NOW_ISO = '2026-08-09T20:45:00Z';
const NOW = Date.parse(NOW_ISO);
let checks = 0;
const failures = [];
function check(name, ok, detail = '') { checks += 1; if (!ok) failures.push(detail ? `${name}: ${detail}` : name); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function throws(fn) { try { fn(); return false; } catch { return true; } }
function importsMarketProfileRegistry(source) {
  return /(?:from\s*['"][^'"]*marketProfileRegistry['"]|import\s*['"][^'"]*marketProfileRegistry['"])/.test(source);
}

try {
  await build({
    stdin: {
      contents: [
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileImportDryRun.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfileImportDryRun.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfilePromotionPreflight.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfileReviewPreflight.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfileCandidateInventory.ts'))};`,
        `export { PUBLIC_MARKET_PROFILES } from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileRegistry.ts'))};`,
      ].join('\n'),
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'marketprofile-import-dry-run-test-entry.ts',
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
  const byPair = new Map(dryRun.entries.map((entry) => [`${entry.exchangeId}:${entry.countryCode}`, entry]));

  check('dryrun/1: canonical dry-run validates', m.validateMarketProfileImportDryRun(dryRun, { inventory, reviewPreflight, promotionPreflight, sources }).ok);
  check('dryrun/2: promotion digest exact', dryRun.promotionPreflightDigest === promotionPreflight.preflightDigest);
  check('dryrun/3: promotion time exact', dryRun.promotionPreflightEvaluatedAt === NOW_ISO);
  check('dryrun/4: generatedAt exact', dryRun.generatedAt === NOW_ISO);
  check('dryrun/5: exactly six entries', dryRun.entries.length === 6);
  check('dryrun/6: every planned action none', dryRun.entries.every((x) => x.plannedAction === 'none'));
  check('dryrun/7: no per-entry import planned', dryRun.entries.every((x) => x.importPlanned === false));
  check('dryrun/8: no per-entry registry mutation planned', dryRun.entries.every((x) => x.registryMutationPlanned === false));
  check('dryrun/9: no per-entry publication planned', dryRun.entries.every((x) => x.publicationPlanned === false));
  check('dryrun/10: no per-entry deploy planned', dryRun.entries.every((x) => x.deployPlanned === false));
  check('dryrun/11: plannedImports exactly empty', Array.isArray(dryRun.plannedImports) && dryRun.plannedImports.length === 0);
  check('dryrun/12: registryMutations exactly empty', Array.isArray(dryRun.registryMutations) && dryRun.registryMutations.length === 0);
  check('dryrun/13: publications exactly empty', Array.isArray(dryRun.publications) && dryRun.publications.length === 0);
  check('dryrun/14: deploy false', dryRun.deployRequired === false);
  check('dryrun/15: importPerformed false', dryRun.importPerformed === false);
  check('dryrun/16: publicAuthority false', dryRun.publicAuthority === false);
  check('dryrun/17: digest format', /^fnv1a64:[a-f0-9]{16}$/.test(dryRun.dryRunDigest));
  const { dryRunDigest, ...base } = dryRun;
  check('dryrun/18: digest recomputes', m.computeMarketProfileImportDryRunDigest(base) === dryRunDigest);
  check('dryrun/19: promotion ready count inherited zero', promotionPreflight.readyForSeparateImportCount === 0);
  check('dryrun/20: owner receipt count inherited zero', promotionPreflight.ownerReceiptCount === 0);

  for (const pair of ['okx:PL', 'bybit:KZ']) {
    check(`${pair}/reason governed review not ready`, byPair.get(pair)?.reasons.includes('GOVERNED_REVIEW_NOT_READY'));
  }
  for (const pair of ['binance:PL', 'bybit:PL', 'binance:KZ']) {
    check(`${pair}/reason fresh evidence`, byPair.get(pair)?.reasons.includes('FRESH_EVIDENCE_REQUIRED'));
  }
  check('okx:KZ/reason blocked', byPair.get('okx:KZ')?.reasons.includes('CANDIDATE_BLOCKED'));
  for (const promotionEntry of promotionPreflight.entries) {
    const pair = `${promotionEntry.exchangeId}:${promotionEntry.countryCode}`;
    const entry = byPair.get(pair);
    check(`${pair}/promotion state bound`, entry?.promotionPreflightState === promotionEntry.state);
    check(`${pair}/candidate digest bound`, entry?.candidateDigest === promotionEntry.candidateDigest);
    check(`${pair}/source SHA bound`, entry?.sourceCommitSha === promotionEntry.sourceCommitSha);
    check(`${pair}/task bound`, entry?.taskId === promotionEntry.taskId);
  }

  check('clock/1: wrapper rejects NaN', throws(() => m.createPlKzMarketProfileImportDryRun(Number.NaN)));
  check('clock/2: generatedAt before promotion rejected', throws(() => m.buildMarketProfileImportDryRun({ dryRunId: 'past', inventory, reviewPreflight, promotionPreflight, sources, generatedAt: '2026-08-09T20:44:59Z' })));
  check('clock/3: malformed generatedAt rejected', throws(() => m.buildMarketProfileImportDryRun({ dryRunId: 'bad', inventory, reviewPreflight, promotionPreflight, sources, generatedAt: '2026-08-09' })));
  check('clock/4: deterministic same input', m.createPlKzMarketProfileImportDryRun(NOW).dryRunDigest === dryRun.dryRunDigest);

  const promotionTamper = clone(promotionPreflight);
  promotionTamper.entries[2].promotionReady = true;
  check('mut/1: promotion-preflight authority tamper blocks build', throws(() => m.buildMarketProfileImportDryRun({ dryRunId: 'promotion-tamper', inventory, reviewPreflight, promotionPreflight: promotionTamper, sources, generatedAt: NOW_ISO })));

  const promotionReadyCountTamper = clone(promotionPreflight);
  promotionReadyCountTamper.readyForSeparateImportCount = 1;
  check('mut/2: nonzero ready count blocks build', throws(() => m.buildMarketProfileImportDryRun({ dryRunId: 'ready-count', inventory, reviewPreflight, promotionPreflight: promotionReadyCountTamper, sources, generatedAt: NOW_ISO })));

  const actionTamper = clone(dryRun);
  actionTamper.entries[0].plannedAction = 'import';
  actionTamper.entries[0].importPlanned = true;
  check('mut/3: action/import mutation invalid', !m.validateMarketProfileImportDryRun(actionTamper, { inventory, reviewPreflight, promotionPreflight, sources }).ok);

  const importListTamper = clone(dryRun);
  importListTamper.plannedImports.push({ exchangeId: 'okx', countryCode: 'PL' });
  check('mut/4: planned import injection invalid', !m.validateMarketProfileImportDryRun(importListTamper, { inventory, reviewPreflight, promotionPreflight, sources }).ok);

  const registryTamper = clone(dryRun);
  registryTamper.registryMutations.push({ op: 'add', pair: 'okx:PL' });
  check('mut/5: registry mutation injection invalid', !m.validateMarketProfileImportDryRun(registryTamper, { inventory, reviewPreflight, promotionPreflight, sources }).ok);

  const publicationTamper = clone(dryRun);
  publicationTamper.publications.push({ pair: 'okx:PL' });
  check('mut/6: publication injection invalid', !m.validateMarketProfileImportDryRun(publicationTamper, { inventory, reviewPreflight, promotionPreflight, sources }).ok);

  const deployTamper = clone(dryRun);
  deployTamper.deployRequired = true;
  check('mut/7: deploy=true invalid', !m.validateMarketProfileImportDryRun(deployTamper, { inventory, reviewPreflight, promotionPreflight, sources }).ok);

  const performedTamper = clone(dryRun);
  performedTamper.importPerformed = true;
  check('mut/8: importPerformed=true invalid', !m.validateMarketProfileImportDryRun(performedTamper, { inventory, reviewPreflight, promotionPreflight, sources }).ok);

  const publicTamper = clone(dryRun);
  publicTamper.publicAuthority = true;
  check('mut/9: publicAuthority=true invalid', !m.validateMarketProfileImportDryRun(publicTamper, { inventory, reviewPreflight, promotionPreflight, sources }).ok);

  const digestTamper = clone(dryRun);
  digestTamper.dryRunDigest = 'fnv1a64:0000000000000000';
  check('mut/10: dry-run digest tamper invalid', !m.validateMarketProfileImportDryRun(digestTamper, { inventory, reviewPreflight, promotionPreflight, sources }).ok);

  const extraOverride = clone(dryRun);
  extraOverride.override = { allowImport: true };
  check('mut/11: extra override invalid via deterministic recompute', !m.validateMarketProfileImportDryRun(extraOverride, { inventory, reviewPreflight, promotionPreflight, sources }).ok);

  check('public/1: PUBLIC_MARKET_PROFILES frozen empty', Object.isFrozen(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);
  const contractSource = readFileSync(join(ROOT, 'src/data/contracts/marketProfileImportDryRun.ts'), 'utf8');
  const dataSource = readFileSync(join(ROOT, 'src/data/candidates/plKzMarketProfileImportDryRun.ts'), 'utf8');
  check('public/2: contract never imports registry', !importsMarketProfileRegistry(contractSource));
  check('public/3: data module never imports registry', !importsMarketProfileRegistry(dataSource));
  check('public/4: no import executor or deploy trigger', !/performImport|executeImport|writeRegistry|mutateRegistry|registry\.push|triggerDeploy|deploy\(/i.test(`${contractSource}\n${dataSource}`));
  check('api/1: no override input', !/override|allowImport|forceImport|onImport|callback/i.test(contractSource));

  if (failures.length) {
    console.error(`CBW MARKETPROFILE IMPORT DRY RUN: FAIL (${failures.length}/${checks})`);
    for (const f of failures) console.error(` - ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`CBW MARKETPROFILE IMPORT DRY RUN: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW MARKETPROFILE IMPORT DRY RUN: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
