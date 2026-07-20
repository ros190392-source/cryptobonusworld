/**
 * CBW GEO → MI adapter CORE (pure mapping + discovery, read-only).
 *
 * Extracted from geo-to-mi-adapter.mjs so the MIGRATION_1 CLI and the MIGRATION_2
 * shadow comparison share ONE mapping implementation (no duplication).
 * Read-only: reads config/geo + research/geo JSON; never writes/execs/networks.
 * The MIGRATION_1 CLI output must remain byte-identical after this extraction.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// core lives at scripts/market-intelligence/lib/ → repo root is three levels up.
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const CONFIG_GEO = join(REPO_ROOT, 'config', 'geo');
export const RESEARCH_GEO = join(REPO_ROOT, 'research', 'geo');

// Target contract enums (schemas/market-intelligence/exchange-market-cell.schema.json)
export const AVAILABILITY = ['AVAILABLE', 'AVAILABLE_WITH_LIMITS', 'RESTRICTED', 'UNAVAILABLE', 'UNDER_REVIEW', 'CONFLICTING', 'UNKNOWN', 'STALE'];
export const CONFIDENCE = ['LOW', 'MEDIUM', 'HIGH'];
export const FRESHNESS = ['CURRENT', 'DUE_SOON', 'STALE', 'UNDER_REVIEW', 'CONFLICTING'];
export const LIVE = ['LIVE_VERIFIED', 'NOT_LIVE_VERIFIED', 'NOT_APPLICABLE', 'UNKNOWN'];

export function err(msg) { console.error(`ERROR: ${msg}`); process.exit(1); }

export function readJSON(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { err(`could not read/parse ${path}: ${e.message}`); }
}

// Resolve an ISO-2 country code to its config/geo/{slug}.json (deterministic; no assumptions).
export function resolveCountryConfig(code) {
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
export function mapAvailability(reg, hasConflict) {
  const explicit = { NO: 'RESTRICTED', YES: 'AVAILABLE', PARTIAL: 'AVAILABLE_WITH_LIMITS', THIRD_PARTY: 'AVAILABLE_WITH_LIMITS', P2P_ONLY: 'AVAILABLE_WITH_LIMITS' };
  if (Object.prototype.hasOwnProperty.call(explicit, reg)) return { state: explicit[reg], unsupported: false };
  if (reg === 'UNKNOWN') return { state: hasConflict ? 'CONFLICTING' : 'UNKNOWN', unsupported: false };
  return { state: 'UNKNOWN', unsupported: true }; // unexpected legacy value → UNKNOWN + diagnostic (never silently guess)
}

export function projectCell(passport, diag) {
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
export function structuralValidate(cell) {
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

// Project all (or one) exchange for a country from tracked GEO passports (read-only).
export function projectCountry(cfg, filterExchange) {
  const slug = cfg.country_slug;
  let exchanges = Array.isArray(cfg.exchanges) ? cfg.exchanges.slice() : [];
  if (exchanges.length === 0) err(`config for ${cfg.country} defines no exchanges`);
  if (filterExchange) {
    if (!exchanges.includes(filterExchange)) err(`exchange "${filterExchange}" not in ${slug} universe [${exchanges.join(', ')}]`);
    exchanges = [filterExchange];
  }
  const exDir = join(RESEARCH_GEO, slug, 'exchanges');
  const cells = [], diagnostics = [], validation = [], discovered = [];
  for (const ex of exchanges) { // config order = deterministic
    const p = join(exDir, `${ex}.json`);
    const rel = `research/geo/${slug}/exchanges/${ex}.json`;
    if (!existsSync(p)) err(`missing legacy passport: ${rel}`);
    discovered.push(rel);
    const passport = readJSON(p);
    const cell = projectCell(passport, diagnostics);
    const problems = structuralValidate(cell);
    validation.push({ exchangeId: ex, ok: problems.length === 0, problems });
    cells.push({ cell, passport });
  }
  return { slug, cells, diagnostics, validation, discovered };
}
