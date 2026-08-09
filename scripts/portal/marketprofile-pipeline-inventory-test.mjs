#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-marketprofile-inventory-'));
const OUT = join(TMP, 'inventory.mjs');
const NOW_ISO = '2026-08-09T20:45:00Z';
const NOW = Date.parse(NOW_ISO);
let checks = 0;
const failures = [];
function check(name, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${name}: ${detail}` : name);
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function throws(fn) { try { fn(); return false; } catch { return true; } }
function importsMarketProfileRegistry(source) {
  return /(?:from\s*['"][^'"]*marketProfileRegistry['"]|import\s*['"][^'"]*marketProfileRegistry['"])/.test(source);
}

try {
  await build({
    stdin: {
      contents: [
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileCandidateInventory.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfileCandidateInventory.ts'))};`,
        `export { PUBLIC_MARKET_PROFILES } from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileRegistry.ts'))};`,
      ].join('\n'),
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'marketprofile-inventory-test-entry.ts',
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
  const sources = m.PL_KZ_MARKET_PROFILE_CANDIDATE_SOURCES;
  const byPair = new Map(inventory.entries.map((entry) => [`${entry.exchangeId}:${entry.countryCode}`, entry]));
  const sourceByPair = new Map(sources.map((source) => [`${source.exchangeId}:${source.countryCode}`, source]));

  check('inventory/1: validates', m.validateMarketProfileCandidateInventory(inventory).ok);
  check('inventory/2: explicit clock serialized exact', inventory.evaluatedAt === NOW_ISO, inventory.evaluatedAt);
  check('inventory/3: exactly six entries', inventory.entries.length === 6, `count=${inventory.entries.length}`);
  check('inventory/4: exact pair set', [...byPair.keys()].sort().join(',') === ['binance:KZ','binance:PL','bybit:KZ','bybit:PL','okx:KZ','okx:PL'].sort().join(','));
  check('inventory/5: unique pair set', byPair.size === 6);
  check('inventory/6: inventory digest format', /^fnv1a64:[a-f0-9]{16}$/.test(inventory.inventoryDigest));
  const { inventoryDigest, ...inventoryBase } = inventory;
  check('inventory/7: inventory digest recomputes', m.computeMarketProfileCandidateInventoryDigest(inventoryBase) === inventoryDigest);

  const expectedStates = new Map([
    ['binance:PL', 'stale_review_required'],
    ['bybit:PL', 'stale_review_required'],
    ['okx:PL', 'reviewable'],
    ['binance:KZ', 'stale_review_required'],
    ['bybit:KZ', 'reviewable'],
    ['okx:KZ', 'blocked'],
  ]);
  for (const [pair, expected] of expectedStates) {
    const entry = byPair.get(pair);
    check(`${pair}/state: ${expected}`, entry?.state === expected, `actual=${entry?.state}`);
    check(`${pair}/review flag exact`, entry?.reviewAllowed === (expected === 'reviewable'));
    check(`${pair}/promotion false`, entry?.promotionAllowed === false);
    check(`${pair}/import false`, entry?.importAllowed === false);
    check(`${pair}/registry mutation false`, entry?.registryMutation === false);
    check(`${pair}/public authority false`, entry?.publicAuthority === false);
    check(`${pair}/unresolved count bound`, entry?.unresolvedDimensionCount === entry?.unresolvedDimensions.length);
    const source = sourceByPair.get(pair);
    check(`${pair}/candidate digest recomputes`, m.recomputeCountryMarketProfileV1CandidateDigest(source.candidate) === source.candidate.candidateDigest);
    check(`${pair}/inventory binds candidate digest`, entry?.candidateDigest === source.candidate.candidateDigest);
    check(`${pair}/inventory binds source SHA`, entry?.sourceCommitSha === source.candidate.source.sourceCommitSha);
    check(`${pair}/inventory binds task`, entry?.taskId === source.candidate.source.taskId);
  }

  check('summary/1: exactly two reviewable', inventory.entries.filter((x) => x.state === 'reviewable').length === 2);
  check('summary/2: exactly three stale', inventory.entries.filter((x) => x.state === 'stale_review_required').length === 3);
  check('summary/3: exactly one blocked', inventory.entries.filter((x) => x.state === 'blocked').length === 1);
  check('summary/4: no invalid canonical entries', inventory.entries.every((x) => x.state !== 'invalid'));
  check('summary/5: stale reasons explicit', inventory.entries.filter((x) => x.state === 'stale_review_required').every((x) => x.reasons.includes('SOURCE_REVIEW_OVERDUE')));
  check('summary/6: reviewable reasons explicit', inventory.entries.filter((x) => x.state === 'reviewable').every((x) => x.reasons.includes('SOURCE_REVIEW_WINDOW_CURRENT')));
  check('summary/7: blocked precedence explicit', byPair.get('okx:KZ')?.reasons.includes('CANDIDATE_BLOCKED') && byPair.get('okx:KZ')?.state === 'blocked');

  const okxPl = sourceByPair.get('okx:PL').candidate;
  check('facts/1: reviewable OKX PL stays draft', okxPl.proposedProfile?.approval === 'draft');
  check('facts/2: reviewable OKX PL offer stays under review', okxPl.proposedProfile?.offerEligibility === 'under_review');
  check('facts/3: reviewable does not alter OKX PL regulation', okxPl.proposedProfile?.regulation.state === 'under_review');
  const bybitKz = sourceByPair.get('bybit:KZ').candidate;
  check('facts/4: reviewable Bybit KZ availability remains unknown', bybitKz.proposedProfile?.availability === 'unknown');
  check('facts/5: reviewable Bybit KZ bonus remains under review', bybitKz.proposedProfile?.bonusAvailability.state === 'under_review');
  check('facts/6: blocked OKX KZ profile remains null', sourceByPair.get('okx:KZ').candidate.proposedProfile === null);

  check('clock/1: NaN rejected', throws(() => m.buildMarketProfileCandidateInventory({ inventoryId: 'x', now: Number.NaN, sources })));
  check('clock/2: Infinity rejected', throws(() => m.buildMarketProfileCandidateInventory({ inventoryId: 'x', now: Number.POSITIVE_INFINITY, sources })));
  check('clock/3: earlier clock changes freshness deterministically', m.createPlKzMarketProfileCandidateInventory(Date.parse('2026-08-08T20:45:00Z')).inventoryDigest !== inventory.inventoryDigest);
  check('clock/4: same clock deterministic', m.createPlKzMarketProfileCandidateInventory(NOW).inventoryDigest === inventory.inventoryDigest);

  const duplicateSources = clone(sources);
  duplicateSources[5] = clone(duplicateSources[4]);
  check('mut/1: duplicate pair rejected', throws(() => m.buildMarketProfileCandidateInventory({ inventoryId: 'dup', now: NOW, sources: duplicateSources })));
  check('mut/2: missing pair rejected', throws(() => m.buildMarketProfileCandidateInventory({ inventoryId: 'missing', now: NOW, sources: clone(sources).slice(0, 5) })));
  const unexpectedSources = clone(sources);
  unexpectedSources[5].exchangeId = 'mexc';
  check('mut/3: unexpected pair rejected', throws(() => m.buildMarketProfileCandidateInventory({ inventoryId: 'unexpected', now: NOW, sources: unexpectedSources })));

  const digestTamperSources = clone(sources);
  digestTamperSources[0].candidate.candidateDigest = 'fnv1a64:0000000000000000';
  const digestTamperInventory = m.buildMarketProfileCandidateInventory({ inventoryId: 'tamper-digest', now: NOW, sources: digestTamperSources });
  check('mut/4: candidate digest tamper classified invalid', digestTamperInventory.entries[0].state === 'invalid' && digestTamperInventory.entries[0].reasons.includes('CANDIDATE_DIGEST_MISMATCH'));

  const sourceTamperSources = clone(sources);
  sourceTamperSources[1].candidate.source.taskId = 'CBW-TAMPERED-TASK-001';
  const sourceTamperInventory = m.buildMarketProfileCandidateInventory({ inventoryId: 'tamper-source', now: NOW, sources: sourceTamperSources });
  check('mut/5: source identity mutation invalid via digest binding', sourceTamperInventory.entries[1].state === 'invalid' && sourceTamperInventory.entries[1].reasons.includes('CANDIDATE_DIGEST_MISMATCH'));

  const authorityTamperSources = clone(sources);
  authorityTamperSources[2].candidate.publicAuthority = true;
  const authorityTamperInventory = m.buildMarketProfileCandidateInventory({ inventoryId: 'tamper-authority', now: NOW, sources: authorityTamperSources });
  check('mut/6: candidate public authority mutation invalid', authorityTamperInventory.entries[2].state === 'invalid');

  const inventoryDigestTamper = clone(inventory);
  inventoryDigestTamper.inventoryDigest = 'fnv1a64:0000000000000000';
  check('mut/7: inventory digest tamper invalid', !m.validateMarketProfileCandidateInventory(inventoryDigestTamper).ok);
  const reviewFlagTamper = clone(inventory);
  reviewFlagTamper.entries[0].reviewAllowed = true;
  check('mut/8: stale reviewAllowed=true invalid', !m.validateMarketProfileCandidateInventory(reviewFlagTamper).ok);
  const outputAuthorityTamper = clone(inventory);
  outputAuthorityTamper.entries[2].importAllowed = true;
  check('mut/9: inventory authority leak invalid', !m.validateMarketProfileCandidateInventory(outputAuthorityTamper).ok);
  const unresolvedTamper = clone(inventory);
  unresolvedTamper.entries[4].unresolvedDimensionCount += 1;
  check('mut/10: unresolved count tamper invalid', !m.validateMarketProfileCandidateInventory(unresolvedTamper).ok);

  check('public/1: PUBLIC_MARKET_PROFILES remains frozen empty', Object.isFrozen(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);
  const contractSource = readFileSync(join(ROOT, 'src/data/contracts/marketProfileCandidateInventory.ts'), 'utf8');
  const dataSource = readFileSync(join(ROOT, 'src/data/candidates/plKzMarketProfileCandidateInventory.ts'), 'utf8');
  check('public/2: inventory contract never imports registry', !importsMarketProfileRegistry(contractSource));
  check('public/3: inventory data module never imports registry', !importsMarketProfileRegistry(dataSource));
  check('public/4: inventory code has no import executor', !/performImport|executeImport|mutateRegistry|registry\.push/i.test(`${contractSource}\n${dataSource}`));

  if (failures.length) {
    console.error(`CBW MARKETPROFILE PL+KZ INVENTORY: FAIL (${failures.length}/${checks})`);
    for (const f of failures) console.error(` - ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`CBW MARKETPROFILE PL+KZ INVENTORY: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW MARKETPROFILE PL+KZ INVENTORY: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
