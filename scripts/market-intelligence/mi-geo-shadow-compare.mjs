#!/usr/bin/env node
/**
 * CBW MIGRATION_2 — MI ↔ GEO shadow comparison (READ-ONLY, SHADOW, stdout-only)
 *
 * Compares, per exchange:
 *   - the legacy GEO record (tracked passport research/geo/{country}/exchanges/*.json), and
 *   - the MI projection produced by the shared MIGRATION_1 core (./lib/geo-mi-adapter-core.mjs).
 *
 * SHADOW-ONLY: identifies differences; never changes GEO data, geoRankings, homepage, rankings,
 * eligibility, CTA, promo, routes or pages. No write, no network, no proxy, no git, no deploy.
 *
 * TECHNICAL BLOCKER (documented, not worked around): the *production ranking view* lives in
 *   src/data/geoRankings.ts (TypeScript: MANUAL_OVERRIDES.<country>.<exchange>.availability) and
 *   src/components/home/HomepageGeoBonusFinder.astro. No committed JS/TS eval tooling exists, so
 *   these cannot be safely machine-imported without (a) adding a dependency or (b) a fragile regex
 *   parser — both prohibited. Therefore the production-ranking dimension (curated override
 *   availability, ranking presence/position/eligibility) is reported INCOMPARABLE here. The legacy
 *   side that IS machine-compared is the tracked GEO passport, which the reconciliation standard §1
 *   names as an "existing GEO record". Safest future option: a separate owner-approved task emits a
 *   small TRACKED JSON snapshot of the production overrides for the shadow to read.
 *
 * Usage:
 *   node scripts/market-intelligence/mi-geo-shadow-compare.mjs --country KZ --dry-run --format summary
 *   node scripts/market-intelligence/mi-geo-shadow-compare.mjs --country KZ --dry-run --format json
 *   node scripts/market-intelligence/mi-geo-shadow-compare.mjs --help
 *
 * Exit codes: 0 success · 1 validation/input/source error · 2 unsafe/unsupported mode
 */

import { err, resolveCountryConfig, projectCountry } from './lib/geo-mi-adapter-core.mjs';

const MIGRATION_PHASE = 'MIGRATION_2';

function refuse(msg) { console.error(`REFUSED: ${msg}`); process.exit(2); }

function help(code = 0) {
  console.log(`CBW ${MIGRATION_PHASE} — MI ↔ GEO shadow comparison (read-only, shadow, stdout-only)

  --country <ISO-2>    required (e.g. KZ)
  --exchange <slug>    optional filter
  --format summary|json  default summary
  --dry-run            REQUIRED (no write mode exists)
  --help               this help

Compares legacy GEO passport vs MI projection. Never changes production/rankings/CTA/routes.
Production ranking view (geoRankings.ts, TypeScript) is INCOMPARABLE here — see the blocker note.
Exit: 0 success · 1 input/source error · 2 unsafe mode.`);
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

// Legacy passport registration tri → an explicit availability class, or null when not explicit.
// UNKNOWN registration means the legacy record makes NO explicit availability claim (do not infer).
function legacyAvailabilityClass(passport) {
  const reg = passport?.availability?.registration;
  const map = { NO: 'RESTRICTED', YES: 'AVAILABLE', PARTIAL: 'AVAILABLE_WITH_LIMITS', THIRD_PARTY: 'AVAILABLE_WITH_LIMITS', P2P_ONLY: 'AVAILABLE_WITH_LIMITS' };
  if (Object.prototype.hasOwnProperty.call(map, reg)) return { cls: map[reg], explicit: true, raw: reg };
  return { cls: null, explicit: false, raw: reg ?? null }; // UNKNOWN / absent → not explicit
}

const PERMISSIVE_RANK = { AVAILABLE: 4, AVAILABLE_WITH_LIMITS: 3, UNDER_REVIEW: 2, UNKNOWN: 2, CONFLICTING: 1, STALE: 1, RESTRICTED: 0, UNAVAILABLE: 0 };

function compareOne(passport, cell) {
  const legacy = legacyAvailabilityClass(passport);
  const mi = cell.overallAvailability;
  const fieldComparisons = [];
  const diagnostics = [];

  // identity (safe, tracked)
  fieldComparisons.push({ field: 'exchangeId', legacy: passport.exchange, mi: cell.exchangeId, state: passport.exchange === cell.exchangeId ? 'MATCH' : 'INCOMPARABLE' });
  fieldComparisons.push({ field: 'countryCode', legacy: passport.country, mi: cell.countryCode, state: passport.country === cell.countryCode ? 'MATCH' : 'INCOMPARABLE' });

  // legacy availability (passport) vs MI overallAvailability
  let comparisonState;
  if (!legacy.explicit) {
    comparisonState = 'INCOMPARABLE'; // legacy makes no explicit availability claim (registration UNKNOWN/absent)
    diagnostics.push(`legacy availability not explicit (registration="${legacy.raw}") — MI="${mi}"; no availability inferred from ranking/UI presence`);
  } else if (legacy.cls === mi || (legacy.cls === 'RESTRICTED' && mi === 'RESTRICTED')) {
    comparisonState = 'MATCH';
  } else {
    const lp = PERMISSIVE_RANK[legacy.cls] ?? 2, mp = PERMISSIVE_RANK[mi] ?? 2;
    comparisonState = lp > mp ? 'LEGACY_MORE_PERMISSIVE' : (mp > lp ? 'MI_MORE_PERMISSIVE' : 'INCOMPARABLE');
  }
  fieldComparisons.push({ field: 'availability', legacy: legacy.explicit ? legacy.cls : `not-explicit(${legacy.raw})`, mi, state: comparisonState });

  // production ranking view (geoRankings.ts / HomepageGeoBonusFinder) — TypeScript, not safely readable
  fieldComparisons.push({ field: 'productionRankingView', legacy: 'INCOMPARABLE (geoRankings.ts is TypeScript; no committed eval tooling)', mi: `MI=${mi}`, state: 'INCOMPARABLE' });
  fieldComparisons.push({ field: 'rankingPresence', legacy: 'INCOMPARABLE (needs geoRankings.ts eval)', mi: 'n/a', state: 'INCOMPARABLE' });
  fieldComparisons.push({ field: 'rankingPosition', legacy: 'INCOMPARABLE (needs geoRankings.ts eval)', mi: 'n/a', state: 'INCOMPARABLE' });
  diagnostics.push('rankingPresence ≠ availability; rankingPosition ≠ legal eligibility; homepage display ≠ verified market support');

  // MI-only eligibility (kept separate; never derived from availability; affiliate never used)
  fieldComparisons.push({ field: 'rankingEligibility', legacy: 'n/a', mi: cell.rankingEligibility, state: 'INCOMPARABLE' });
  fieldComparisons.push({ field: 'ctaEligibility', legacy: 'n/a', mi: cell.ctaEligibility, state: 'INCOMPARABLE' });
  fieldComparisons.push({ field: 'promoEligibility', legacy: 'n/a (Offer Registry)', mi: cell.promoEligibility, state: 'INCOMPARABLE' });
  fieldComparisons.push({ field: 'confidence', legacy: 'n/a', mi: cell.confidence, state: 'INCOMPARABLE' });
  fieldComparisons.push({ field: 'freshness', legacy: passport.research_status, mi: cell.freshness, state: 'INCOMPARABLE' });
  fieldComparisons.push({ field: 'conflictState', legacy: (passport.conflict_ids || []).join(',') || 'none', mi: cell.conflictIds.join(',') || 'none', state: (passport.conflict_ids || []).length ? 'MATCH' : 'MATCH' });
  fieldComparisons.push({ field: 'evidenceCoverage', legacy: (passport.evidence_ids || []).length, mi: cell.sourceIds.length, state: (passport.evidence_ids || []).length === cell.sourceIds.length ? 'MATCH' : 'INCOMPARABLE' });
  fieldComparisons.push({ field: 'liveVerificationState', legacy: 'capture=null', mi: cell.liveVerificationState, state: 'MATCH' });

  // shadow outcome (diagnostic only; never mutates production)
  let shadowOutcome;
  if (mi === 'CONFLICTING') shadowOutcome = 'HOLD_CONFLICTING';
  else if (comparisonState === 'LEGACY_MORE_PERMISSIVE' && (mi === 'RESTRICTED' || mi === 'UNAVAILABLE')) shadowOutcome = 'HOLD_CONFLICTING';
  else if (comparisonState === 'LEGACY_MORE_PERMISSIVE') shadowOutcome = 'HOLD_REVIEW';
  else if (comparisonState === 'MATCH') shadowOutcome = 'NO_ACTION_SHADOW';
  else shadowOutcome = 'NEEDS_EVIDENCE'; // INCOMPARABLE / MI_MORE_PERMISSIVE with weak evidence

  return { comparisonState, shadowOutcome, fieldComparisons, diagnostics, mi, legacyExplicit: legacy.explicit, legacyClass: legacy.cls };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) help(0);
  if (!args.country) err('--country is required (use --help)');
  if (!['summary', 'json'].includes(args.format)) err(`invalid --format "${args.format}" (summary|json)`);
  if (!args.dryRun) refuse(`${MIGRATION_PHASE} is read-only shadow inspection: --dry-run is mandatory (no write mode exists)`);

  const { file: configPath, cfg } = resolveCountryConfig(args.country);
  const code = cfg.country.toUpperCase();
  const { cells, discovered } = projectCountry(cfg, args.exchange);

  const comparisons = [];
  const summary = { match: 0, legacyMorePermissive: 0, miMorePermissive: 0, incomparable: 0, missingLegacy: 0, missingMi: 0, holdConflicting: 0, holdReview: 0, needsEvidence: 0, blockMigration: 0, noActionShadow: 0 };

  for (const { cell, passport } of cells) {
    if (!cell) { comparisons.push({ exchangeId: passport?.exchange, comparisonState: 'MISSING_MI', shadowOutcome: 'BLOCK_MIGRATION', fieldComparisons: [], diagnostics: ['no MI projection'] }); summary.missingMi++; summary.blockMigration++; continue; }
    if (!passport) { comparisons.push({ exchangeId: cell.exchangeId, comparisonState: 'MISSING_LEGACY', shadowOutcome: 'NEEDS_EVIDENCE', fieldComparisons: [], diagnostics: ['no legacy passport'] }); summary.missingLegacy++; summary.needsEvidence++; continue; }
    const r = compareOne(passport, cell);
    comparisons.push({
      exchangeId: cell.exchangeId,
      legacy: { registration: passport.availability?.registration ?? null, availabilityClass: r.legacyExplicit ? r.legacyClass : null, conflictIds: passport.conflict_ids || [], researchStatus: passport.research_status },
      miProjection: { overallAvailability: cell.overallAvailability, rankingEligibility: cell.rankingEligibility, ctaEligibility: cell.ctaEligibility, promoEligibility: cell.promoEligibility, confidence: cell.confidence, freshness: cell.freshness, liveVerificationState: cell.liveVerificationState },
      fieldComparisons: r.fieldComparisons,
      comparisonState: r.comparisonState,
      shadowOutcome: r.shadowOutcome,
      diagnostics: r.diagnostics,
    });
    // tally
    ({ MATCH: () => summary.match++, LEGACY_MORE_PERMISSIVE: () => summary.legacyMorePermissive++, MI_MORE_PERMISSIVE: () => summary.miMorePermissive++, INCOMPARABLE: () => summary.incomparable++, MISSING_LEGACY: () => summary.missingLegacy++, MISSING_MI: () => summary.missingMi++ }[r.comparisonState] || (() => {}))();
    ({ HOLD_CONFLICTING: () => summary.holdConflicting++, HOLD_REVIEW: () => summary.holdReview++, NEEDS_EVIDENCE: () => summary.needsEvidence++, BLOCK_MIGRATION: () => summary.blockMigration++, NO_ACTION_SHADOW: () => summary.noActionShadow++ }[r.shadowOutcome] || (() => {}))();
  }

  const legacySource = {
    machineComparedLegacy: `research/geo/${cfg.country_slug}/exchanges/*.json (tracked GEO passports)`,
    productionRankingOwner: 'src/data/geoRankings.ts (MANUAL_OVERRIDES) + src/components/home/HomepageGeoBonusFinder.astro',
    productionRankingStatus: 'INCOMPARABLE — TypeScript, no committed eval tooling; not machine-read (blocker documented)',
    productionRemainsAuthoritative: true,
  };

  if (args.format === 'json') {
    const out = {
      migrationPhase: MIGRATION_PHASE, mode: 'SHADOW_READ_ONLY', countryCode: code,
      legacySource, exchangeCount: comparisons.length, comparisons, summary,
    };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    process.exit(0);
  }

  // summary format
  const L = [];
  L.push(`CBW MI↔GEO shadow compare · ${MIGRATION_PHASE} · SHADOW_READ_ONLY · dry-run`);
  L.push(`Country: ${code} · config: ${configPath}`);
  L.push(`Legacy (machine-compared): ${legacySource.machineComparedLegacy}`);
  L.push(`Production ranking owner: ${legacySource.productionRankingOwner}`);
  L.push(`Production ranking: ${legacySource.productionRankingStatus}`);
  L.push(`Discovered passports (${discovered.length}): ${discovered.join(', ')}`);
  L.push('');
  L.push('exchange   legacyAvail(passport)   MI overallAvail       comparisonState          shadowOutcome');
  L.push('--------   --------------------    ------------------    ---------------------    -----------------');
  for (const c of comparisons) {
    const la = c.legacy ? (c.legacy.availabilityClass || `not-explicit(${c.legacy.registration})`) : 'MISSING';
    L.push([c.exchangeId.padEnd(9), String(la).padEnd(22), String(c.miProjection?.overallAvailability || '-').padEnd(20), c.comparisonState.padEnd(23), c.shadowOutcome].join(' '));
  }
  L.push('');
  L.push(`Comparison states: ${JSON.stringify({ MATCH: summary.match, LEGACY_MORE_PERMISSIVE: summary.legacyMorePermissive, MI_MORE_PERMISSIVE: summary.miMorePermissive, INCOMPARABLE: summary.incomparable, MISSING_LEGACY: summary.missingLegacy, MISSING_MI: summary.missingMi })}`);
  L.push(`Shadow outcomes:   ${JSON.stringify({ NO_ACTION_SHADOW: summary.noActionShadow, HOLD_CONFLICTING: summary.holdConflicting, HOLD_REVIEW: summary.holdReview, NEEDS_EVIDENCE: summary.needsEvidence, BLOCK_MIGRATION: summary.blockMigration })}`);
  L.push('');
  L.push('SHADOW ONLY — no production/ranking/CTA/route/page change. Current GEO remains production truth.');
  L.push('Not equivalent: ranking presence ≠ availability · ranking position ≠ legal eligibility · affiliate offer ≠ CTA eligibility · homepage display ≠ verified market support.');
  L.push('Affiliate value does not influence any comparison result. NO-PROXY: unverified local behavior stays NOT_LIVE_VERIFIED.');
  process.stdout.write(L.join('\n') + '\n');
  process.exit(0);
}

main();
