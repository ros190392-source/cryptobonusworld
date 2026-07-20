#!/usr/bin/env node
/**
 * CBW MIGRATION_1 — GEO → Market Intelligence cell adapter (READ-ONLY, in-memory)
 *
 * Projects the existing legacy GEO exchange passports (research/geo/{country}/exchanges/*.json)
 * into in-memory Market Intelligence cell shapes (schemas/market-intelligence/exchange-market-cell.schema.json)
 * for inspection and compatibility testing ONLY.
 *
 * Mapping/discovery logic lives in ./lib/geo-mi-adapter-core.mjs (shared with the MIGRATION_2 shadow
 * comparison so there is ONE mapping implementation). This file is the MIGRATION_1 CLI only.
 *
 * Guarantees (MIGRATION_1):
 *  - reads only; never writes/renames/removes/creates files or directories;
 *  - no network, no child process, no git, no publish/deploy;
 *  - --dry-run is mandatory; running without it refuses safely (exit 2);
 *  - never fabricates data; missing evidence → UNKNOWN / neutral + diagnostic;
 *  - never infers CTA/ranking/promo eligibility from availability;
 *  - affiliate/offer facts are NOT copied into the MI cell (Offer Registry owns them);
 *  - website access is never treated as availability; no proxy/VPN/live-IP; unverified → NOT_LIVE_VERIFIED.
 *
 * Usage:
 *   node scripts/market-intelligence/geo-to-mi-adapter.mjs --country KZ --dry-run --format summary
 *   node scripts/market-intelligence/geo-to-mi-adapter.mjs --country KZ --exchange bybit --dry-run --format json
 *   node scripts/market-intelligence/geo-to-mi-adapter.mjs --help
 *
 * Exit codes: 0 success · 1 validation/input/source error · 2 unsafe/unsupported mode
 */

import { err, resolveCountryConfig, projectCountry } from './lib/geo-mi-adapter-core.mjs';

const ADAPTER_VERSION = 'MIGRATION_1';

function refuse(msg) { console.error(`REFUSED: ${msg}`); process.exit(2); }

function help(code = 0) {
  console.log(`CBW MIGRATION_1 — GEO → MI cell adapter (read-only, in-memory)

  --country <ISO-2>    required (e.g. KZ)
  --exchange <slug>    optional filter (e.g. bybit)
  --format summary|json  default summary
  --dry-run            REQUIRED in MIGRATION_1 (no write mode exists)
  --help               this help

Reads only research/geo, config/geo, schemas. Writes nothing. Never uses proxy/VPN/network.
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) help(0);
  if (!args.country) err('--country is required (use --help)');
  if (!['summary', 'json'].includes(args.format)) err(`invalid --format "${args.format}" (summary|json)`);
  if (!args.dryRun) refuse('MIGRATION_1 is read-only inspection: --dry-run is mandatory (no write mode exists)');

  const { file: configPath, cfg } = resolveCountryConfig(args.country);
  const code = cfg.country.toUpperCase();
  const { cells, diagnostics, validation, discovered } = projectCountry(cfg, args.exchange);
  const projectedCells = cells.map((c) => c.cell);

  const byState = {};
  for (const c of projectedCells) byState[c.overallAvailability] = (byState[c.overallAvailability] || 0) + 1;

  const summary = {
    adapterVersion: ADAPTER_VERSION,
    countryCode: code,
    countrySlug: cfg.country_slug,
    configPath,
    discoveredPassports: discovered,
    projectedCount: projectedCells.length,
    availabilityBreakdown: byState,
    validationMethod: 'STRUCTURAL CONTRACT VALIDATION (no committed JSON Schema validator dependency; full JSON Schema validation DEFERRED)',
    structurallyValid: validation.every((v) => v.ok),
    writes: 'NONE (read-only, in-memory)',
    liveVerification: 'NOT_LIVE_VERIFIED for all (NO-PROXY mode; legacy captures are null)',
  };

  if (args.format === 'json') {
    const out = { adapterVersion: ADAPTER_VERSION, countryCode: code, projectedCells, diagnostics, validation, summary };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    process.exit(summary.structurallyValid ? 0 : 1);
  }

  // summary format
  const L = [];
  L.push(`CBW GEO→MI adapter · ${ADAPTER_VERSION} · read-only · dry-run`);
  L.push(`Country: ${code} (${cfg.country_slug}) · config: ${configPath}`);
  L.push(`Validation: ${summary.validationMethod}`);
  L.push(`Discovered passports (${discovered.length}): ${discovered.join(', ')}`);
  L.push('');
  L.push('exchange   overallAvailability     conf   fresh          reg      rank  cta   promo  live');
  L.push('--------   --------------------    ----   -----------    ------   ----  ----  -----  -----------------');
  for (const c of projectedCells) {
    L.push([
      c.exchangeId.padEnd(9),
      c.overallAvailability.padEnd(22),
      c.confidence.padEnd(5),
      String(c.freshness).padEnd(13),
      String(c.registrationStatus).padEnd(7),
      String(c.rankingEligibility).padEnd(5),
      String(c.ctaEligibility).padEnd(5),
      String(c.promoEligibility).padEnd(6),
      c.liveVerificationState,
    ].join(' '));
  }
  L.push('');
  L.push(`Availability breakdown: ${JSON.stringify(byState)}`);
  L.push(`Structurally valid: ${summary.structurallyValid} · Writes: NONE`);
  L.push('');
  L.push('Eligibility separation (invariants): availability ≠ rankingEligibility ≠ ctaEligibility ≠ promoEligibility.');
  L.push('  rankingEligibility=false (RANKING_ENGINE owns; not computed) · ctaEligibility=false (gate03+owner) · promoEligibility=null (OFFER_REGISTRY owns; affiliate not copied).');
  L.push('  Affiliate value never affects ranking. Website access is not availability. No proxy/VPN/live-IP.');
  L.push('');
  L.push('Per-exchange diagnostics (unmapped / defaulted / conflicting / unsupported / missing):');
  for (const d of diagnostics) {
    L.push(`  ${d.exchangeId} → ${d.overallAvailability}`);
    if (d.conflictingFields.length) L.push(`    conflicting:  ${d.conflictingFields.join(' | ')}`);
    if (d.unsupportedLegacyValues.length) L.push(`    unsupported:  ${d.unsupportedLegacyValues.join(' | ')}`);
    L.push(`    defaulted:    ${d.defaultedFields.join(' | ')}`);
    L.push(`    unmapped:     ${d.unmappedFields.length} fields (offer/scores/status/prose — not copied)`);
    L.push(`    missing evid: ${d.missingEvidence.length} product fields = UNKNOWN`);
  }
  process.stdout.write(L.join('\n') + '\n');
  process.exit(summary.structurallyValid ? 0 : 1);
}

main();
