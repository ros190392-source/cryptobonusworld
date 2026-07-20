#!/usr/bin/env node
/**
 * CBW MIGRATION_1 — GEO → Market Intelligence cell adapter (READ-ONLY, in-memory)
 *
 * Projects the existing legacy GEO exchange passports (research/geo/{country}/exchanges/*.json)
 * into in-memory Market Intelligence cell shapes (schemas/market-intelligence/exchange-market-cell.schema.json)
 * for inspection and compatibility testing ONLY.
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
 * Authorities: owner-ops/market-intelligence/CBW_MI_GEO_RECONCILIATION_STANDARD_v1.md,
 *              CBW_EXCHANGE_MARKET_INTELLIGENCE_BRAIN_v1.md, schemas/market-intelligence/*,
 *              docs/geo-research/NO-PROXY-RESEARCH-MODE-v1.md.
 *
 * Usage:
 *   node scripts/market-intelligence/geo-to-mi-adapter.mjs --country KZ --dry-run --format summary
 *   node scripts/market-intelligence/geo-to-mi-adapter.mjs --country KZ --exchange bybit --dry-run --format json
 *   node scripts/market-intelligence/geo-to-mi-adapter.mjs --help
 *
 * Exit codes: 0 success · 1 validation/input/source error · 2 unsafe/unsupported mode
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ADAPTER_VERSION = 'MIGRATION_1';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG_GEO = join(REPO_ROOT, 'config', 'geo');
const RESEARCH_GEO = join(REPO_ROOT, 'research', 'geo');

// Target contract enums (from schemas/market-intelligence/exchange-market-cell.schema.json)
const AVAILABILITY = ['AVAILABLE', 'AVAILABLE_WITH_LIMITS', 'RESTRICTED', 'UNAVAILABLE', 'UNDER_REVIEW', 'CONFLICTING', 'UNKNOWN', 'STALE'];
const CONFIDENCE = ['LOW', 'MEDIUM', 'HIGH'];
const FRESHNESS = ['CURRENT', 'DUE_SOON', 'STALE', 'UNDER_REVIEW', 'CONFLICTING'];
const LIVE = ['LIVE_VERIFIED', 'NOT_LIVE_VERIFIED', 'NOT_APPLICABLE', 'UNKNOWN'];

function err(msg) { console.error(`ERROR: ${msg}`); process.exit(1); }
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

function readJSON(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { err(`could not read/parse ${path}: ${e.message}`); }
}

// Resolve an ISO-2 country code to its config/geo/{slug}.json (deterministic; no assumptions).
function resolveCountryConfig(code) {
  if (!/^[A-Za-z]{2}$/.test(code || '')) err(`invalid --country: "${code}" (expected ISO-2)`);
  const want = code.toUpperCase();
  if (!existsSync(CONFIG_GEO)) err('config/geo not found');
  const files = readdirSync(CONFIG_GEO).filter((f) => f.endsWith('.json')).sort();
  for (const f of files) {
    const cfg = readJSON(join(CONFIG_GEO, f));
    if (cfg && String(cfg.country).toUpperCase() === want) {
      return { file: `config/geo/${f}`, cfg };
    }
  }
  err(`no config/geo entry for country "${want}" (found: ${files.join(', ') || 'none'})`);
}

/* ---------------- mapping rules (explicit, non-fabricating) ---------------- */

// registration tri + conflict presence → MI overallAvailability. registration NO (explicit exclusion) wins over conflict.
function mapAvailability(reg, hasConflict) {
  const explicit = { NO: 'RESTRICTED', YES: 'AVAILABLE', PARTIAL: 'AVAILABLE_WITH_LIMITS', THIRD_PARTY: 'AVAILABLE_WITH_LIMITS', P2P_ONLY: 'AVAILABLE_WITH_LIMITS' };
  if (Object.prototype.hasOwnProperty.call(explicit, reg)) return { state: explicit[reg], unsupported: false };
  if (reg === 'UNKNOWN') return { state: hasConflict ? 'CONFLICTING' : 'UNKNOWN', unsupported: false };
  return { state: 'UNKNOWN', unsupported: true }; // unexpected legacy value → UNKNOWN + diagnostic (never silently guess)
}

function projectCell(passport, diag) {
  const av = passport.availability || {};
  const pr = passport.products || {};
  const conflicts = Array.isArray(passport.conflict_ids) ? passport.conflict_ids : [];
  const hasConflict = conflicts.length > 0;

  const mapped = [], unmapped = [], defaulted = [], conflicting = [], unsupported = [], missing = [];

  const availMap = mapAvailability(av.registration, hasConflict);
  if (availMap.unsupported) unsupported.push(`availability.registration="${av.registration}" not in tri enum → UNKNOWN`);
  const overallAvailability = availMap.state;
  mapped.push(`overallAvailability ← availability.registration ("${av.registration}")${hasConflict ? ' + conflict_ids' : ''} = ${overallAvailability}`);
  if (hasConflict) conflicting.push(`conflict_ids present: ${conflicts.join(', ')}`);

  // product statuses (tri strings passed through; futures→derivatives; kyc from availability)
  const productStatuses = {
    spot: pr.spot ?? 'UNKNOWN',
    derivatives: pr.futures ?? 'UNKNOWN',
    p2p: pr.p2p ?? 'UNKNOWN',
    kyc: av.kyc ?? 'UNKNOWN',
    earn: pr.earn ?? 'UNKNOWN',
    card: pr.card ?? 'UNKNOWN',
    fiat_deposit: pr.fiat_deposit ?? 'UNKNOWN',
    fiat_withdrawal: pr.fiat_withdrawal ?? 'UNKNOWN',
    app_ios: av.app_ios ?? 'UNKNOWN',
    app_android: av.app_android ?? 'UNKNOWN',
  };
  mapped.push('productStatuses ← products{spot,futures→derivatives,p2p,earn,card,fiat_deposit,fiat_withdrawal} + availability{kyc,app_ios,app_android}');
  Object.entries(productStatuses).forEach(([k, v]) => { if (v === 'UNKNOWN') missing.push(`productStatuses.${k} = UNKNOWN (no legacy evidence)`); });

  // confidence: legacy scores.confidence is null → derive from research_status only; never fabricate HIGH.
  const confidence = passport.research_status === 'complete' ? 'MEDIUM' : 'LOW';
  defaulted.push(`confidence: legacy scores.confidence=${JSON.stringify(passport.scores?.confidence)} → defaulted "${confidence}" from research_status="${passport.research_status}"`);

  // freshness: deterministic, no wall-clock. STALE-vs-today deferred (needs a dated review-state policy).
  const freshness = hasConflict ? 'CONFLICTING' : (passport.research_status === 'complete' ? 'CURRENT' : 'UNDER_REVIEW');
  defaulted.push(`freshness = ${freshness} (from conflict_ids/research_status; STALE-vs-today deferred — no wall-clock, kept deterministic)`);

  // reason codes — only directly supported by passport fields
  const reasonCodes = [];
  if (overallAvailability === 'RESTRICTED' && av.registration === 'NO') reasonCodes.push('REGISTRATION_BLOCKED');
  if (overallAvailability === 'CONFLICTING') reasonCodes.push('SOURCE_CONFLICT');
  if (overallAvailability === 'UNKNOWN') reasonCodes.push('UNKNOWN_LIVE_STATE');
  if (reasonCodes.length) mapped.push(`reasonCodes = [${reasonCodes.join(', ')}] (from registration/conflict/no-live-state)`);

  // eligibility — kept strictly separate; never derived from availability
  const rankingEligibility = false; // owned by RANKING_ENGINE; not computed in MIGRATION_1
  const ctaEligibility = false;     // requires gate03 + owner approval; never inferred from AVAILABLE
  const promoEligibility = null;    // Offer Registry owns offer/affiliate facts; not copied here

  // live verification — all legacy evidence has capture:null (no permitted live test) → NOT_LIVE_VERIFIED
  const liveVerificationState = 'NOT_LIVE_VERIFIED';

  // intentionally NOT mapped (ownership elsewhere) — recorded as diagnostics, not copied
  unmapped.push('affiliate{promo_code, go_route, geo_eligible, code_status, bonus_claim_status} — Offer Registry owns; NOT copied into MI cell');
  unmapped.push('scores{usage,availability,user_fit,commercial,confidence,homepage} — all null in legacy; not projected');
  unmapped.push('status{editorial, index_eligible} — renderer/publication owned; not projected');
  unmapped.push('local_fit{payment_methods, local_banks, p2p_merchants} — prose/list detail; not projected in MIGRATION_1');
  unmapped.push('prior_findings (free prose) — not parsed; no fabrication');
  unmapped.push('unknown_claim_ids — tracked in evidence layer; not a cell field');

  const cell = {
    exchangeId: passport.exchange,
    countryCode: passport.country,
    exchangeLegalEntity: passport.identity?.legal_entity ?? null,
    overallAvailability,
    registrationStatus: av.registration ?? 'UNKNOWN',
    productStatuses,
    rankingEligibility,
    ctaEligibility,
    promoEligibility,
    confidence,
    freshness,
    checkedDate: passport.last_checked_at ?? null,
    nextReviewDate: passport.next_check_at ?? null,
    reasonCodes,
    limitations: [],
    sourceIds: Array.isArray(passport.evidence_ids) ? passport.evidence_ids.slice() : [],
    conflictIds: conflicts.slice(),
    alternativeExchangeIds: [],
    liveVerificationState,
  };
  mapped.push('exchangeId ← exchange · countryCode ← country · exchangeLegalEntity ← identity.legal_entity · registrationStatus ← availability.registration · checkedDate ← last_checked_at · nextReviewDate ← next_check_at · sourceIds ← evidence_ids · conflictIds ← conflict_ids');
  if (cell.limitations.length === 0) defaulted.push('limitations = [] (legacy limitation prose not parsed)');
  if (cell.alternativeExchangeIds.length === 0) defaulted.push('alternativeExchangeIds = [] (owned by Offer/Ranking layer; not projected)');

  diag.push({
    exchangeId: cell.exchangeId,
    overallAvailability,
    mappedFields: mapped,
    unmappedFields: unmapped,
    defaultedFields: defaulted,
    conflictingFields: conflicting,
    unsupportedLegacyValues: unsupported,
    missingEvidence: missing,
    liveVerification: `${liveVerificationState} (legacy evidence capture=null; NO-PROXY mode — no live/proxy/IP test)`,
    rankingEligibilitySource: 'RANKING_ENGINE (not computed in MIGRATION_1) → false; never derived from availability',
    ctaEligibilitySource: 'MI gate03 + owner approval (not asserted here) → false; never derived from AVAILABLE',
    promoEligibilitySource: 'OFFER_REGISTRY (offer/affiliate facts not copied) → null',
  });
  return cell;
}

/* ---------------- structural contract validation (no dependency added) ---------------- */
function structuralValidate(cell) {
  const problems = [];
  const need = ['exchangeId', 'countryCode', 'overallAvailability', 'registrationStatus', 'productStatuses', 'rankingEligibility', 'ctaEligibility', 'confidence', 'checkedDate', 'sourceIds'];
  for (const k of need) if (cell[k] === undefined || cell[k] === null) if (!(k === 'checkedDate' && cell[k] === null)) problems.push(`missing required "${k}"`);
  if (typeof cell.exchangeId !== 'string') problems.push('exchangeId not string');
  if (typeof cell.countryCode !== 'string' || cell.countryCode.length !== 2) problems.push('countryCode not 2-char');
  if (!AVAILABILITY.includes(cell.overallAvailability)) problems.push(`overallAvailability "${cell.overallAvailability}" not in enum`);
  if (!CONFIDENCE.includes(cell.confidence)) problems.push(`confidence "${cell.confidence}" not in enum`);
  if (cell.freshness && !FRESHNESS.includes(cell.freshness)) problems.push(`freshness "${cell.freshness}" not in enum`);
  if (cell.liveVerificationState && !LIVE.includes(cell.liveVerificationState)) problems.push(`liveVerificationState not in enum`);
  if (typeof cell.rankingEligibility !== 'boolean') problems.push('rankingEligibility not boolean');
  if (typeof cell.ctaEligibility !== 'boolean') problems.push('ctaEligibility not boolean');
  if (!(cell.promoEligibility === null || typeof cell.promoEligibility === 'boolean')) problems.push('promoEligibility not boolean|null');
  if (typeof cell.productStatuses !== 'object' || cell.productStatuses === null) problems.push('productStatuses not object');
  else for (const [k, v] of Object.entries(cell.productStatuses)) if (typeof v !== 'string') problems.push(`productStatuses.${k} not string`);
  if (!Array.isArray(cell.sourceIds)) problems.push('sourceIds not array');
  if (cell.checkedDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(cell.checkedDate)) problems.push('checkedDate not ISO date');
  return problems;
}

/* ---------------- main ---------------- */
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) help(0);
  if (!args.country) err('--country is required (use --help)');
  if (!['summary', 'json'].includes(args.format)) err(`invalid --format "${args.format}" (summary|json)`);
  if (!args.dryRun) refuse('MIGRATION_1 is read-only inspection: --dry-run is mandatory (no write mode exists)');

  const { file: configPath, cfg } = resolveCountryConfig(args.country);
  const code = cfg.country.toUpperCase();
  const slug = cfg.country_slug;
  let exchanges = Array.isArray(cfg.exchanges) ? cfg.exchanges.slice() : [];
  if (exchanges.length === 0) err(`config ${configPath} defines no exchanges`);

  if (args.exchange) {
    if (!exchanges.includes(args.exchange)) err(`exchange "${args.exchange}" not in ${configPath} universe [${exchanges.join(', ')}]`);
    exchanges = [args.exchange];
  }

  const exDir = join(RESEARCH_GEO, slug, 'exchanges');
  const projectedCells = [];
  const diagnostics = [];
  const validation = [];
  const discovered = [];

  for (const ex of exchanges) { // config order = deterministic
    const p = join(exDir, `${ex}.json`);
    const rel = `research/geo/${slug}/exchanges/${ex}.json`;
    if (!existsSync(p)) { err(`missing legacy passport: ${rel}`); }
    discovered.push(rel);
    const passport = readJSON(p);
    const cell = projectCell(passport, diagnostics);
    const problems = structuralValidate(cell);
    validation.push({ exchangeId: ex, ok: problems.length === 0, problems });
    projectedCells.push(cell);
  }

  const byState = {};
  for (const c of projectedCells) byState[c.overallAvailability] = (byState[c.overallAvailability] || 0) + 1;

  const summary = {
    adapterVersion: ADAPTER_VERSION,
    countryCode: code,
    countrySlug: slug,
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
  L.push(`Country: ${code} (${slug}) · config: ${configPath}`);
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
