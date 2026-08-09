#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-marketprofile-review-preflight-'));
const OUT = join(TMP, 'review-preflight.mjs');
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
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileReviewPreflight.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileCandidateReview.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfileReviewPreflight.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfileCandidateInventory.ts'))};`,
        `export { PUBLIC_MARKET_PROFILES } from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileRegistry.ts'))};`,
      ].join('\n'),
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'marketprofile-review-preflight-test-entry.ts',
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
  const preflight = m.createPlKzMarketProfileReviewPreflight(NOW);
  const byPair = new Map(preflight.entries.map((entry) => [`${entry.exchangeId}:${entry.countryCode}`, entry]));
  const sourceByPair = new Map(sources.map((source) => [`${source.exchangeId}:${source.countryCode}`, source]));

  check('preflight/1: canonical preflight validates', m.validateMarketProfileReviewPreflight(preflight, inventory, sources).ok);
  check('preflight/2: exact inventory digest bound', preflight.inventoryDigest === inventory.inventoryDigest);
  check('preflight/3: exact inventory time bound', preflight.inventoryEvaluatedAt === NOW_ISO);
  check('preflight/4: exact reviewedAt', preflight.reviewedAt === NOW_ISO);
  check('preflight/5: reviewer hard-coded system identity', preflight.reviewerId === 'system:owner-loop-preflight');
  check('preflight/6: exactly six entries', preflight.entries.length === 6);
  check('preflight/7: preflight digest format', /^fnv1a64:[a-f0-9]{16}$/.test(preflight.preflightDigest));
  const { preflightDigest, ...preflightBase } = preflight;
  check('preflight/8: digest recomputes', m.computeMarketProfileReviewPreflightDigest(preflightBase) === preflightDigest);

  const expectedStates = new Map([
    ['binance:PL', 'refresh_required'],
    ['bybit:PL', 'refresh_required'],
    ['okx:PL', 'needs_research'],
    ['binance:KZ', 'refresh_required'],
    ['bybit:KZ', 'needs_research'],
    ['okx:KZ', 'blocked'],
  ]);
  for (const [pair, state] of expectedStates) {
    const entry = byPair.get(pair);
    check(`${pair}/state: ${state}`, entry?.state === state, `actual=${entry?.state}`);
    check(`${pair}/promotion false`, entry?.promotionAllowed === false);
    check(`${pair}/import false`, entry?.importAllowed === false);
    check(`${pair}/registry false`, entry?.registryMutation === false);
    check(`${pair}/public false`, entry?.publicAuthority === false);
    const source = sourceByPair.get(pair);
    check(`${pair}/candidate bound`, entry?.candidateDigest === source?.candidate.candidateDigest);
    check(`${pair}/source SHA bound`, entry?.sourceCommitSha === source?.candidate.source.sourceCommitSha);
    check(`${pair}/task bound`, entry?.taskId === source?.candidate.source.taskId);
  }

  const packets = preflight.entries.filter((entry) => entry.reviewPacket !== null);
  check('review/1: exactly two automated review packets', packets.length === 2, `count=${packets.length}`);
  check('review/2: packets only for OKX PL + Bybit KZ', packets.map((x) => `${x.exchangeId}:${x.countryCode}`).sort().join(',') === ['bybit:KZ','okx:PL'].sort().join(','));
  check('review/3: automated decisions only needs_research', packets.every((x) => x.reviewPacket.decision === 'needs_research'));
  check('review/4: automated reviewer never owner', packets.every((x) => x.reviewPacket.reviewerId === 'system:owner-loop-preflight' && x.reviewPacket.reviewerId !== 'owner'));
  check('review/5: packet promotion authority false', packets.every((x) => x.reviewPacket.promotionAuthorized === false));
  check('review/6: packet import authority false', packets.every((x) => x.reviewPacket.importAuthorized === false));
  check('review/7: packet public authority false', packets.every((x) => x.reviewPacket.publicAuthority === false));
  check('review/8: reviewDigest bound', packets.every((x) => x.reviewDigest === x.reviewPacket.reviewDigest));
  check('review/9: packets record unresolved dimensions', packets.every((x) => x.reviewPacket.unresolvedDimensions.length > 0));
  check('review/10: packets explicitly record source ceiling incomplete', packets.every((x) => x.reviewPacket.notes.includes('SOURCE_AUTHORIZATION_CEILING_INCOMPLETE')));
  check('review/11: no ready_for_promotion_review anywhere', preflight.entries.every((x) => x.reviewPacket?.decision !== 'ready_for_promotion_review'));

  for (const entry of packets) {
    const pair = `${entry.exchangeId}:${entry.countryCode}`;
    const source = sourceByPair.get(pair);
    const validation = m.validateMarketProfileCandidateReviewPacket(entry.reviewPacket, source.candidate, {
      candidateDigest: source.candidate.candidateDigest,
      sourceCommitSha: source.candidate.source.sourceCommitSha,
      taskId: source.candidate.source.taskId,
      exchangeId: source.candidate.source.exchangeId,
      countryCode: source.candidate.source.countryCode,
    });
    check(`${pair}/review packet validates against exact candidate`, validation.ok, validation.ok ? '' : validation.issues.join(','));
  }

  check('stale/1: Binance PL has no packet', byPair.get('binance:PL')?.reviewPacket === null);
  check('stale/2: Bybit PL has no packet', byPair.get('bybit:PL')?.reviewPacket === null);
  check('stale/3: Binance KZ has no packet', byPair.get('binance:KZ')?.reviewPacket === null);
  check('blocked/1: OKX KZ has no packet', byPair.get('okx:KZ')?.reviewPacket === null);
  check('blocked/2: OKX KZ stays blocked', byPair.get('okx:KZ')?.state === 'blocked');

  const later = m.buildMarketProfileReviewPreflight({
    preflightId: 'later-review',
    inventory,
    sources,
    reviewedAt: '2026-08-10T00:00:01Z',
  });
  const laterMap = new Map(later.entries.map((entry) => [`${entry.exchangeId}:${entry.countryCode}`, entry]));
  check('time/1: OKX PL expires between inventory and later review', laterMap.get('okx:PL')?.state === 'refresh_required');
  check('time/2: expired OKX PL gets no review packet', laterMap.get('okx:PL')?.reviewPacket === null);
  check('time/3: Bybit KZ remains current at later review', laterMap.get('bybit:KZ')?.state === 'needs_research');
  check('time/4: review cannot predate inventory', throws(() => m.buildMarketProfileReviewPreflight({ preflightId: 'past', inventory, sources, reviewedAt: '2026-08-09T20:44:59Z' })));
  check('time/5: malformed reviewedAt rejected', throws(() => m.buildMarketProfileReviewPreflight({ preflightId: 'bad', inventory, sources, reviewedAt: '2026-08-09' })));
  check('time/6: wrapper rejects NaN clock', throws(() => m.createPlKzMarketProfileReviewPreflight(Number.NaN)));

  const packetDecisionTamper = clone(preflight);
  const packetEntry = packetDecisionTamper.entries.find((x) => x.reviewPacket);
  packetEntry.reviewPacket.decision = 'ready_for_promotion_review';
  check('mut/1: automated decision escalation invalid', !m.validateMarketProfileReviewPreflight(packetDecisionTamper, inventory, sources).ok);

  const reviewerTamper = clone(preflight);
  reviewerTamper.reviewerId = 'owner';
  reviewerTamper.entries.find((x) => x.reviewPacket).reviewPacket.reviewerId = 'owner';
  check('mut/2: owner impersonation invalid', !m.validateMarketProfileReviewPreflight(reviewerTamper, inventory, sources).ok);

  const packetDigestTamper = clone(preflight);
  packetDigestTamper.entries.find((x) => x.reviewPacket).reviewPacket.reviewDigest = 'fnv1a64:0000000000000000';
  check('mut/3: review packet digest tamper invalid', !m.validateMarketProfileReviewPreflight(packetDigestTamper, inventory, sources).ok);

  const authorityTamper = clone(preflight);
  authorityTamper.entries[2].promotionAllowed = true;
  check('mut/4: preflight authority leak invalid', !m.validateMarketProfileReviewPreflight(authorityTamper, inventory, sources).ok);

  const preflightDigestTamper = clone(preflight);
  preflightDigestTamper.preflightDigest = 'fnv1a64:0000000000000000';
  check('mut/5: preflight digest tamper invalid', !m.validateMarketProfileReviewPreflight(preflightDigestTamper, inventory, sources).ok);

  const sourceTamper = clone(sources);
  sourceTamper[2].candidate.source.taskId = 'CBW-TAMPERED-001';
  check('mut/6: candidate source tamper invalidates preflight', !m.validateMarketProfileReviewPreflight(preflight, inventory, sourceTamper).ok);

  const candidateDigestTamper = clone(sources);
  candidateDigestTamper[4].candidate.candidateDigest = 'fnv1a64:0000000000000000';
  check('mut/7: candidate digest tamper invalidates preflight', !m.validateMarketProfileReviewPreflight(preflight, inventory, candidateDigestTamper).ok);

  const inventoryTamper = clone(inventory);
  inventoryTamper.inventoryDigest = 'fnv1a64:0000000000000000';
  check('mut/8: inventory digest tamper invalidates preflight', !m.validateMarketProfileReviewPreflight(preflight, inventoryTamper, sources).ok);

  check('source-auth/1: all six source authorization ceilings incomplete', sources.every((source) => Object.values(source.candidate.source.authorizations).some((value) => value === false)));
  check('source-auth/2: automated review never changes source candidates', sources.every((source) => source.candidate.importable === false && source.candidate.publicAuthority === false));

  check('public/1: PUBLIC_MARKET_PROFILES frozen empty', Object.isFrozen(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);
  const contractSource = readFileSync(join(ROOT, 'src/data/contracts/marketProfileReviewPreflight.ts'), 'utf8');
  const dataSource = readFileSync(join(ROOT, 'src/data/candidates/plKzMarketProfileReviewPreflight.ts'), 'utf8');
  check('public/2: preflight contract never imports registry', !importsMarketProfileRegistry(contractSource));
  check('public/3: preflight data module never imports registry', !importsMarketProfileRegistry(dataSource));
  check('public/4: preflight has no import executor', !/performImport|executeImport|mutateRegistry|registry\.push/i.test(`${contractSource}\n${dataSource}`));

  if (failures.length) {
    console.error(`CBW MARKETPROFILE REVIEW PREFLIGHT: FAIL (${failures.length}/${checks})`);
    for (const f of failures) console.error(` - ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`CBW MARKETPROFILE REVIEW PREFLIGHT: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW MARKETPROFILE REVIEW PREFLIGHT: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
