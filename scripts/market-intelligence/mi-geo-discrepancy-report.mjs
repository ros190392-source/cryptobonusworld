#!/usr/bin/env node
/**
 * CBW MIGRATION_3B — MI ↔ production discrepancy report (READ-ONLY, OFFLINE, stdout-only)
 *
 * Compares, per exchange:
 *   - the COMMITTED production availability snapshot
 *       (owner-ops/market-intelligence/snapshots/production-geo-availability-<code>.json,
 *        produced by MIGRATION_3A from src/data/geoRankings.ts MANUAL_OVERRIDES.<country>), and
 *   - the MI projection produced by the shared MIGRATION_1 core (./lib/geo-mi-adapter-core.mjs).
 *
 * The production-ranking dimension that MIGRATION_2 had to mark INCOMPARABLE (geoRankings.ts is
 * TypeScript, no committed eval tooling) is now comparable BECAUSE we read the tracked snapshot
 * instead of re-parsing the TypeScript. This script never re-parses or evaluates geoRankings.ts;
 * it only hashes that file for the staleness gate.
 *
 * SHADOW / DISCREPANCY ONLY: identifies production-vs-evidence differences; never changes GEO data,
 * geoRankings, homepage, rankings, availability, eligibility, CTA, promo, routes or pages. No write,
 * no network, no proxy, no git, no child process, no deploy. productionPosition is source declaration
 * order only — never interpreted as legal availability evidence.
 *
 * Reuse: MI mapping is NOT duplicated — projectCountry()/projectCell() from the shared core is the
 * single GEO→MI mapping implementation (same as MIGRATION_1 and MIGRATION_2).
 *
 * Usage:
 *   node scripts/market-intelligence/mi-geo-discrepancy-report.mjs --country KZ --dry-run --format summary
 *   node scripts/market-intelligence/mi-geo-discrepancy-report.mjs --country KZ --dry-run --format json
 *   node scripts/market-intelligence/mi-geo-discrepancy-report.mjs --country KZ --exchange bybit --dry-run --format json
 *   node scripts/market-intelligence/mi-geo-discrepancy-report.mjs --help
 *
 * Exit codes: 0 success · 1 validation/input/source error · 2 unsafe mode / missing --dry-run / stale snapshot
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { err, resolveCountryConfig, projectCountry, REPO_ROOT } from './lib/geo-mi-adapter-core.mjs';

const MIGRATION_PHASE = 'MIGRATION_3B';
const MODE = 'DISCREPANCY_READ_ONLY';
const PROD_AVAILABILITY = ['available', 'restricted', 'unknown'];

function refuse(msg) { console.error(`REFUSED: ${msg}`); process.exit(2); }

function help(code = 0) {
  console.log(`CBW ${MIGRATION_PHASE} — MI ↔ production discrepancy report (read-only, offline, stdout-only)

  --country <ISO-2>      required (e.g. KZ)
  --exchange <slug>      optional filter (e.g. bybit)
  --format summary|json  default summary
  --dry-run              REQUIRED (no write mode exists)
  --help                 this help

Reads the committed MIGRATION_3A snapshot as the production side and the shared-core MI projection as
the evidence side. Refuses (SNAPSHOT_STALE, exit 2) if the snapshot's sourceSha256 no longer matches
the live source. Never changes production/rankings/CTA/routes; never re-parses geoRankings.ts.
Exit: 0 success · 1 input/source error · 2 unsafe mode / missing --dry-run / stale snapshot.`);
  process.exit(code);
}

function parseArgs(argv) {
  const a = { country: null, exchange: null, format: 'summary', dryRun: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--help' || t === '-h') a.help = true;
    else if (t === '--dry-run') a.dryRun = true;
    else if (t === '--country') a.country = argv[++i];
    else if (t === '--exchange') a.exchange = argv[++i];
    else if (t === '--format') a.format = argv[++i];
    else if (t.startsWith('--country=')) a.country = t.slice(10);
    else if (t.startsWith('--exchange=')) a.exchange = t.slice(11);
    else if (t.startsWith('--format=')) a.format = t.slice(9);
    else err(`unknown argument: ${t} (use --help)`);
  }
  return a;
}

/* ---------------- comparison logic (pure, deterministic; exported for fixture tests) ---------------- */

// production makes NO explicit availability claim when "unknown" (absence of a restriction ≠ availability).
const PROD_RANK = { available: 4, unknown: 2, restricted: 0 };
const MI_RANK = { AVAILABLE: 4, AVAILABLE_WITH_LIMITS: 3, UNDER_REVIEW: 2, UNKNOWN: 2, CONFLICTING: 1, STALE: 1, RESTRICTED: 0, UNAVAILABLE: 0 };

// Exact required rules first; then a deterministic fallback for combinations outside the table.
const EXPLICIT_RULES = {
  'available|AVAILABLE': ['MATCH', 'NO_ACTION_SHADOW'],
  'available|UNKNOWN': ['LEGACY_MORE_PERMISSIVE', 'HOLD_REVIEW'],
  'available|CONFLICTING': ['LEGACY_MORE_PERMISSIVE', 'HOLD_CONFLICTING'],
  'available|RESTRICTED': ['LEGACY_MORE_PERMISSIVE', 'HOLD_CONFLICTING'],
  'available|UNAVAILABLE': ['LEGACY_MORE_PERMISSIVE', 'HOLD_CONFLICTING'],
  'restricted|RESTRICTED': ['MATCH', 'NO_ACTION_SHADOW'],
  'unknown|UNKNOWN': ['MATCH', 'NEEDS_EVIDENCE'],
  'unknown|CONFLICTING': ['INCOMPARABLE', 'HOLD_CONFLICTING'],
  'unknown|AVAILABLE': ['MI_MORE_PERMISSIVE', 'HOLD_REVIEW'],
  'unknown|AVAILABLE_WITH_LIMITS': ['MI_MORE_PERMISSIVE', 'HOLD_REVIEW'],
};

export function decide(prod, mi) {
  const explicit = EXPLICIT_RULES[`${prod}|${mi}`];
  if (explicit) return { comparisonState: explicit[0], shadowOutcome: explicit[1], ruleBasis: 'EXPLICIT' };

  let comparisonState;
  if (prod === 'unknown') {
    // production is silent — never "more permissive"; only a definite positive MI claim moves it,
    // which is already covered by the explicit table. Everything else is INCOMPARABLE.
    comparisonState = 'INCOMPARABLE';
  } else {
    const pr = PROD_RANK[prod], mr = MI_RANK[mi];
    if (pr === undefined || mr === undefined) comparisonState = 'INCOMPARABLE';
    else if (pr === mr) comparisonState = 'MATCH';
    else comparisonState = pr > mr ? 'LEGACY_MORE_PERMISSIVE' : 'MI_MORE_PERMISSIVE';
  }

  let shadowOutcome;
  if (mi === 'CONFLICTING') shadowOutcome = 'HOLD_CONFLICTING';
  else if (comparisonState === 'MATCH') shadowOutcome = prod === 'unknown' ? 'NEEDS_EVIDENCE' : 'NO_ACTION_SHADOW';
  else if (comparisonState === 'LEGACY_MORE_PERMISSIVE') shadowOutcome = (mi === 'RESTRICTED' || mi === 'UNAVAILABLE') ? 'HOLD_CONFLICTING' : 'HOLD_REVIEW';
  else if (comparisonState === 'MI_MORE_PERMISSIVE') shadowOutcome = prod === 'restricted' ? 'HOLD_CONFLICTING' : 'HOLD_REVIEW';
  else shadowOutcome = 'NEEDS_EVIDENCE'; // INCOMPARABLE
  return { comparisonState, shadowOutcome, ruleBasis: 'FALLBACK' };
}

// Snapshot staleness gate (pure). Returns true only when the snapshot's recorded source hash equals
// the live source hash. Never uses a stale snapshot.
export function snapshotHashMatches(snapshot, actualSourceSha256) {
  return typeof snapshot?.sourceSha256 === 'string' && snapshot.sourceSha256 === actualSourceSha256;
}

const EMPTY_SUMMARY = () => ({
  exchangeCount: 0,
  MATCH: 0, LEGACY_MORE_PERMISSIVE: 0, MI_MORE_PERMISSIVE: 0, INCOMPARABLE: 0, MISSING_PRODUCTION: 0, MISSING_MI: 0,
  NO_ACTION_SHADOW: 0, HOLD_CONFLICTING: 0, HOLD_REVIEW: 0, NEEDS_EVIDENCE: 0, BLOCK_MIGRATION: 0,
});

// Build discrepancy rows from an ordered production list + an MI map. Pure — exported for fixtures.
// prodExchanges: [{ exchangeId, productionAvailability, productionPosition }] (already filtered/ordered)
// miByExchange:  Map<exchangeId, { overallAvailability, confidence, freshness, liveVerificationState, conflictIds }>
export function buildDiscrepancies(prodExchanges, miByExchange) {
  const summary = EMPTY_SUMMARY();
  const discrepancies = [];
  const seen = new Set();

  for (const p of prodExchanges) {
    seen.add(p.exchangeId);
    const mi = miByExchange.get(p.exchangeId);
    const posNote = `productionPosition ${p.productionPosition} is source declaration order only — not legal availability evidence`;
    if (!mi) {
      discrepancies.push({
        exchangeId: p.exchangeId, productionPosition: p.productionPosition ?? null,
        productionAvailability: p.productionAvailability, miAvailability: null, miConfidence: null,
        miFreshness: null, liveVerificationState: null, comparisonState: 'MISSING_MI', shadowOutcome: 'BLOCK_MIGRATION',
        diagnostics: ['no MI projection for this exchange (no GEO passport / not in country universe)', posNote],
      });
      summary.MISSING_MI++; summary.BLOCK_MIGRATION++; summary.exchangeCount++;
      continue;
    }
    if (!PROD_AVAILABILITY.includes(p.productionAvailability)) {
      err(`production availability "${p.productionAvailability}" for ${p.exchangeId} is not one of {${PROD_AVAILABILITY.join(', ')}}`);
    }
    const { comparisonState, shadowOutcome, ruleBasis } = decide(p.productionAvailability, mi.overallAvailability);
    const diagnostics = [
      `MI overallAvailability=${mi.overallAvailability} · confidence=${mi.confidence} · freshness=${mi.freshness}`,
      posNote,
    ];
    if (p.productionAvailability === 'unknown') diagnostics.push("production 'unknown' is not an explicit availability claim (absence of a restriction ≠ availability)");
    if (mi.overallAvailability === 'CONFLICTING') diagnostics.push(`MI conflict_ids: ${(mi.conflictIds || []).join(', ') || 'none'}`);
    if (comparisonState === 'LEGACY_MORE_PERMISSIVE') diagnostics.push(`production asserts more availability than current MI evidence (${p.productionAvailability} vs MI ${mi.overallAvailability})`);
    if (comparisonState === 'MI_MORE_PERMISSIVE') diagnostics.push(`MI evidence asserts more availability than production (${mi.overallAvailability} vs production ${p.productionAvailability})`);
    diagnostics.push(`rule=${ruleBasis}`);

    discrepancies.push({
      exchangeId: p.exchangeId, productionPosition: p.productionPosition ?? null,
      productionAvailability: p.productionAvailability, miAvailability: mi.overallAvailability,
      miConfidence: mi.confidence, miFreshness: mi.freshness, liveVerificationState: mi.liveVerificationState,
      comparisonState, shadowOutcome, diagnostics,
    });
    summary[comparisonState]++; summary[shadowOutcome]++; summary.exchangeCount++;
  }

  // MI-only exchanges (present in evidence, absent from production snapshot) → MISSING_PRODUCTION.
  for (const [exchangeId, mi] of miByExchange) {
    if (seen.has(exchangeId)) continue;
    discrepancies.push({
      exchangeId, productionPosition: null, productionAvailability: null,
      miAvailability: mi.overallAvailability, miConfidence: mi.confidence, miFreshness: mi.freshness,
      liveVerificationState: mi.liveVerificationState, comparisonState: 'MISSING_PRODUCTION', shadowOutcome: 'BLOCK_MIGRATION',
      diagnostics: ['exchange present in MI evidence but absent from the production snapshot'],
    });
    summary.MISSING_PRODUCTION++; summary.BLOCK_MIGRATION++; summary.exchangeCount++;
  }

  return { discrepancies, summary };
}

/* ---------------- main (I/O wiring) ---------------- */

function snapshotRelPath(code) {
  return `owner-ops/market-intelligence/snapshots/production-geo-availability-${code.toLowerCase()}.json`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) help(0);
  if (!args.country) err('--country is required (use --help)');
  if (!['summary', 'json'].includes(args.format)) err(`invalid --format "${args.format}" (summary|json)`);
  if (!args.dryRun) refuse(`${MIGRATION_PHASE} is read-only discrepancy inspection: --dry-run is mandatory (no write mode exists)`);

  const { cfg } = resolveCountryConfig(args.country);
  const code = String(cfg.country).toUpperCase();

  // --- load committed production snapshot ---
  const snapRel = snapshotRelPath(code);
  const snapAbs = join(REPO_ROOT, snapRel);
  if (!existsSync(snapAbs)) err(`production snapshot not found: ${snapRel} (run the MIGRATION_3A exporter --write first)`);
  let snapshot;
  try { snapshot = JSON.parse(readFileSync(snapAbs, 'utf8')); }
  catch (e) { err(`could not read/parse snapshot ${snapRel}: ${e.message}`); }
  if (String(snapshot.countryCode).toUpperCase() !== code) err(`snapshot countryCode "${snapshot.countryCode}" ≠ requested ${code}`);
  if (!Array.isArray(snapshot.exchanges)) err(`snapshot ${snapRel} has no exchanges array`);
  if (typeof snapshot.sourcePath !== 'string' || typeof snapshot.sourceSha256 !== 'string') err(`snapshot ${snapRel} missing sourcePath/sourceSha256`);

  // --- STALENESS GATE: hash the live source; refuse if it drifted from the snapshot ---
  const sourceAbs = join(REPO_ROOT, snapshot.sourcePath);
  if (!existsSync(sourceAbs)) err(`snapshot.sourcePath not found on disk: ${snapshot.sourcePath}`);
  const actualSourceSha = createHash('sha256').update(readFileSync(sourceAbs, 'utf8'), 'utf8').digest('hex');
  const hashMatches = snapshotHashMatches(snapshot, actualSourceSha);
  if (!hashMatches) {
    console.error('SNAPSHOT_STALE');
    console.error(`  snapshot.sourceSha256 = ${snapshot.sourceSha256}`);
    console.error(`  live ${snapshot.sourcePath} sha256 = ${actualSourceSha}`);
    console.error('  The MIGRATION_3A production snapshot is out of date. Refresh it (MIGRATION_3A exporter --write --force,');
    console.error('  under owner review) before running the discrepancy comparison. Comparison skipped.');
    process.exit(2);
  }

  // --- MI side: single shared-core projection (no duplicated mapping, no MANUAL_OVERRIDES re-parse) ---
  const { cells } = projectCountry(cfg, args.exchange);
  const miByExchange = new Map();
  for (const { cell } of cells) {
    miByExchange.set(cell.exchangeId, {
      overallAvailability: cell.overallAvailability, confidence: cell.confidence, freshness: cell.freshness,
      liveVerificationState: cell.liveVerificationState, conflictIds: cell.conflictIds || [],
    });
  }

  // --- production side: from snapshot, ordered by productionPosition; honor --exchange filter ---
  let prodExchanges = snapshot.exchanges
    .map((e) => ({ exchangeId: e.exchangeId, productionAvailability: e.productionAvailability, productionPosition: e.productionPosition }))
    .sort((a, b) => (a.productionPosition ?? 1e9) - (b.productionPosition ?? 1e9));
  if (args.exchange) prodExchanges = prodExchanges.filter((e) => e.exchangeId === args.exchange);

  const { discrepancies, summary } = buildDiscrepancies(prodExchanges, miByExchange);

  const productionSnapshot = {
    path: snapRel,
    sourcePath: snapshot.sourcePath,
    sourceSha256: snapshot.sourceSha256,
    sourceHashMatches: hashMatches,
  };

  if (args.format === 'json') {
    const out = {
      migrationPhase: MIGRATION_PHASE, mode: MODE, countryCode: code,
      productionSnapshot, productionRemainsAuthoritative: true,
      exchangeCount: discrepancies.length, discrepancies, summary,
    };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    process.exit(0);
  }

  // summary format
  const L = [];
  L.push(`CBW MI↔production discrepancy · ${MIGRATION_PHASE} · ${MODE} · dry-run`);
  L.push(`Country: ${code}`);
  L.push(`Production snapshot: ${snapRel}`);
  L.push(`Source: ${snapshot.sourcePath} · sha256 matches live source: ${hashMatches}`);
  L.push('');
  L.push('exchange   pos  productionAvail   MI overallAvail       comparisonState          shadowOutcome');
  L.push('--------   ---  ---------------   ------------------    ---------------------    -----------------');
  for (const d of discrepancies) {
    L.push([
      d.exchangeId.padEnd(9),
      String(d.productionPosition ?? '-').padEnd(3),
      String(d.productionAvailability ?? 'MISSING').padEnd(15),
      String(d.miAvailability ?? 'MISSING').padEnd(20),
      d.comparisonState.padEnd(23),
      d.shadowOutcome,
    ].join(' '));
  }
  L.push('');
  L.push(`Comparison states: ${JSON.stringify({ MATCH: summary.MATCH, LEGACY_MORE_PERMISSIVE: summary.LEGACY_MORE_PERMISSIVE, MI_MORE_PERMISSIVE: summary.MI_MORE_PERMISSIVE, INCOMPARABLE: summary.INCOMPARABLE, MISSING_PRODUCTION: summary.MISSING_PRODUCTION, MISSING_MI: summary.MISSING_MI })}`);
  L.push(`Shadow outcomes:   ${JSON.stringify({ NO_ACTION_SHADOW: summary.NO_ACTION_SHADOW, HOLD_CONFLICTING: summary.HOLD_CONFLICTING, HOLD_REVIEW: summary.HOLD_REVIEW, NEEDS_EVIDENCE: summary.NEEDS_EVIDENCE, BLOCK_MIGRATION: summary.BLOCK_MIGRATION })}`);
  L.push('');
  L.push('DISCREPANCY READ-ONLY — no production/ranking/CTA/route/page change. Production snapshot remains authoritative.');
  L.push('productionPosition = source declaration order only (not legal evidence). NO-PROXY: unverified local behavior stays NOT_LIVE_VERIFIED.');
  L.push('No production availability was changed; no MI cell, compiled decision, or migration decision was created.');
  process.stdout.write(L.join('\n') + '\n');
  process.exit(0);
}

// Run main() only when executed directly (so fixture harnesses can import the pure functions safely).
if (import.meta.url === pathToFileURL(process.argv[1] || '').href || process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
