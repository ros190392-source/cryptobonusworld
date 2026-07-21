#!/usr/bin/env node
/**
 * CBW KZ×Bybit — MIGRATION_5 NON-PRODUCTION PREVIEW builder (read-only, deterministic).
 *
 * Projects the committed canonical MI facts toward the legacy GEO layer as a PREVIEW ONLY,
 * per owner decision CBW-KZ-BYBIT-P0A-MIGRATION-5-OWNER-DECISION-v1 (commit ec185cd…):
 * MIGRATION_5_SCOPE=APPROVED_WITH_LIMITS, preparation authorized, execution + production
 * activation NOT authorized. Writes only research/market-intelligence/staging/kz/bybit/p0a-v1/
 * migration5-preview/. Modifies/activates NOTHING. Node built-ins only; no wall-clock, no network,
 * no child process, no git; package.json unchanged.
 *
 * Usage:
 *   node scripts/market-intelligence/build-kz-bybit-migration5-preview.mjs --dry-run
 *   node scripts/market-intelligence/build-kz-bybit-migration5-preview.mjs --write-preview
 *   node scripts/market-intelligence/build-kz-bybit-migration5-preview.mjs --check
 *
 * Exit codes: 0 success · 1 input/validation failure · 2 unsafe mode / unexpected path / overwrite refusal
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PREVIEW_REL = 'research/market-intelligence/staging/kz/bybit/p0a-v1/migration5-preview';
const PREVIEW_ABS = join(REPO_ROOT, PREVIEW_REL);
const SCRIPT_REL = 'scripts/market-intelligence/build-kz-bybit-migration5-preview.mjs';

const DECISION_COMMIT = 'ec185cd7055b4ec26f5a8fcbba9ee1a040815c6e';
const CANONICAL_MI_COMMIT = '8a51bf21a5abf69b71593923ad681d3c7e95b099';
const DISCREPANCY_REVIEW_COMMIT = '8d5284d4c8870effe3b0fd25a3c2353e2182ac7b';
const BASELINE_HEAD = DECISION_COMMIT;

function err(m) { console.error(`ERROR: ${m}`); process.exit(1); }
function refuse(m) { console.error(`REFUSED: ${m}`); process.exit(2); }
function ser(o) { return JSON.stringify(o, null, 2) + '\n'; }
function sha256(s) { return createHash('sha256').update(Buffer.isBuffer(s) ? s : Buffer.from(s, 'utf8')).digest('hex'); }
function rd(rel) { const p = join(REPO_ROOT, rel); if (!existsSync(p)) err(`missing input: ${rel}`); try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { err(`parse ${rel}: ${e.message}`); } }

/* ---------------- read committed inputs (read-only) ---------------- */
const CELL = rd('data/market-intelligence/cells/by-country/kz/bybit.json');
const CONF = rd('data/market-intelligence/conflicts/by-country/kz/bybit.json');
const BND = rd('data/market-intelligence/bindings/by-country/kz/bybit.json');
const PROV = rd('data/market-intelligence/provenance/by-country/kz/bybit.json');
const SRC = rd('data/market-intelligence/sources/by-country/kz/bybit.json');
const LNK = rd('data/market-intelligence/linkages/by-country/kz/bybit.json');
const LEGACY = rd('research/geo/kazakhstan/exchanges/bybit.json');
const CFG = rd('config/geo/kazakhstan.json');
const SNAP = rd('owner-ops/market-intelligence/snapshots/production-geo-availability-kz.json');
const DISC = rd('owner-ops/market-intelligence/research-audits/CBW_KZ_BYBIT_P0A_MI_GEO_DISCREPANCY_REVIEW_v1.json');
const DEC = rd('owner-ops/market-intelligence/decisions/CBW_KZ_BYBIT_P0A_MIGRATION_5_OWNER_DECISION_v1.json');

const PROD = DISC.layer3_production;
const PROD_POS = (SNAP.exchanges || []).find((e) => e.exchangeId === 'bybit')?.productionPosition ?? null;
const PROD_AVAIL = (SNAP.exchanges || []).find((e) => e.exchangeId === 'bybit')?.productionAvailability ?? PROD.availability;

/* ---------------- baseline integrity ---------------- */
function baselineIntegrity() {
  const p = [];
  if (CELL.overallAvailability !== 'AVAILABLE_WITH_LIMITS') p.push('cell.overallAvailability');
  if (CELL.confidence !== 'MEDIUM') p.push('cell.confidence');
  if (CELL.liveVerificationState !== 'NOT_LIVE_VERIFIED') p.push('cell.liveVerificationState');
  if (CELL.rankingEligibility !== false || CELL.ctaEligibility !== false || CELL.promoEligibility !== false) p.push('cell eligibility');
  if (SRC.records.length !== 43 || LNK.links.length !== 77 || CONF.conflicts.length !== 2) p.push('counts 43/77/2');
  if (BND.ownerApproved !== false || BND.reviewStatus !== 'PROPOSED' || BND.canonicalRecord !== 'GEO_LEGACY' || BND.migrationPhase !== 'MIGRATION_4') p.push('binding state');
  if (DEC.migration5ScopeDecision.MIGRATION_5_SCOPE_DECISION !== 'APPROVED_WITH_LIMITS' || DEC.authorizationFlags.migration5PreparationAuthorized !== true || DEC.authorizationFlags.migration5ExecutionAuthorized !== false) p.push('owner decision scope');
  if (CFG.homepage_eligible !== false || CFG.publication_status !== 'blocked_by_missing_evidence') p.push('publication state');
  return p;
}

/* ---------------- product projection ---------------- */
const PRODUCTS = [
  { p: 'registration', legacy: LEGACY.availability.registration, prod: 'overall available (not per-product)', cf: ['cf-kz-bybit-001'], rc: ['REGISTRATION_SCOPE_PARTIAL'], limit: true, cls: 'MI_MORE_CONSERVATIVE' },
  { p: 'kyc', legacy: LEGACY.availability.kyc, prod: 'KYC required (note)', cf: ['cf-kz-bybit-001'], rc: [], limit: true, cls: 'PRIMARY_MATCH_MI_MORE_PRECISE' },
  { p: 'spot', legacy: LEGACY.products.spot, prod: 'not modeled', cf: [], rc: [], limit: false, cls: 'LEGACY_MORE_CONSERVATIVE' },
  { p: 'derivatives', legacy: LEGACY.products.futures, prod: 'not modeled', cf: [], rc: [], limit: true, cls: 'LEGACY_MORE_CONSERVATIVE' },
  { p: 'margin', legacy: null, prod: 'not modeled', cf: [], rc: [], limit: true, cls: 'MI_ONLY' },
  { p: 'p2p', legacy: LEGACY.products.p2p, prod: 'regulated P2P noted', cf: [], rc: [], limit: true, cls: 'PRIMARY_MATCH_MI_MORE_PRECISE' },
  { p: 'kzt_p2p', legacy: LEGACY.products.p2p, prod: 'regulated KZT P2P noted', cf: [], rc: [], limit: false, cls: 'PRIMARY_MATCH_MI_MORE_PRECISE' },
  { p: 'direct_kzt_deposit', legacy: LEGACY.products.fiat_deposit, prod: 'not modeled', cf: [], rc: [], limit: true, cls: 'LEGACY_MORE_CONSERVATIVE' },
  { p: 'direct_kzt_withdrawal', legacy: LEGACY.products.fiat_withdrawal, prod: 'not modeled', cf: [], rc: [], limit: true, cls: 'LEGACY_MORE_CONSERVATIVE' },
  { p: 'bank_card_purchase', legacy: LEGACY.products.card, prod: 'not modeled', cf: ['cf-kz-bybit-002'], rc: ['ROUTING_PARTIAL'], limit: true, cls: 'MI_MORE_CONSERVATIVE' },
  { p: 'bybit_card', legacy: LEGACY.products.card, prod: 'not modeled', cf: ['cf-kz-bybit-002'], rc: ['ROUTING_PARTIAL'], limit: true, cls: 'LEGACY_MORE_CONSERVATIVE' },
  { p: 'referral', legacy: LEGACY.affiliate.geo_eligible, prod: 'promo_code present; eligibility unknown', cf: ['cf-kz-bybit-002'], rc: ['OFFER_ELIGIBILITY_UNVERIFIED'], limit: true, cls: 'MATCH' },
  { p: 'promotions', legacy: LEGACY.affiliate.bonus_claim_status, prod: PROD.bonusAvailability, cf: ['cf-kz-bybit-002'], rc: ['OFFER_ELIGIBILITY_UNVERIFIED'], limit: true, cls: 'PRIMARY_MATCH_MI_MORE_PRECISE' },
];

function productProjectionRows() {
  return PRODUCTS.map((x) => ({
    product: x.p,
    canonicalStatus: CELL.productStatuses[x.p],
    legacyStatus: x.legacy,
    productionStatus: x.prod,
    proposedShadowStatus: CELL.productStatuses[x.p],
    legacyCanRepresentExactly: false,
    limitationDisclosureRequired: x.limit,
    blockedFromExecution: true,
    conflictIds: x.cf,
    reasonCodes: x.rc,
    notes: 'Legacy GEO passport enum (UNKNOWN/PARTIAL) cannot represent AVAILABLE_WITH_LIMITS/CONFLICTING exactly; preview projects the canonical status with limitation disclosure; not executed.',
  }));
}

/* ---------------- limitation disclosure ---------------- */
function limitations() {
  return [
    { limitationId: 'lim-residency-citizenship', publicSummary: 'Some registration eligibility limits apply (residency/citizenship).', internalDetail: 'Residency/citizenship/foreign-national scope remains partially resolved (cf-kz-bybit-001).', severity: 'MEDIUM', conflictIds: ['cf-kz-bybit-001'], affectedFields: ['availability-overall', 'product-registration', 'product-kyc'], requiredForFuturePresentation: true, blocksExecution: true, blocksProductionActivation: true },
    { limitationId: 'lim-entity-domain-routing', publicSummary: 'Some services route through separate local/global entities.', internalDetail: 'bybit.kz/bybit.com and legal-entity routing partially resolved (cf-kz-bybit-002).', severity: 'MEDIUM', conflictIds: ['cf-kz-bybit-002'], affectedFields: ['product-bank_card_purchase', 'product-bybit_card', 'product-referral', 'product-promotions'], requiredForFuturePresentation: true, blocksExecution: true, blocksProductionActivation: true },
    { limitationId: 'lim-bank-card-conflict', publicSummary: 'Bank-card purchase routing is unresolved.', internalDetail: 'bank_card_purchase = CONFLICTING (bybit.kz vs bybit.com routing, cf-kz-bybit-002).', severity: 'MEDIUM', conflictIds: ['cf-kz-bybit-002'], affectedFields: ['product-bank_card_purchase'], requiredForFuturePresentation: true, blocksExecution: true, blocksProductionActivation: true },
    { limitationId: 'lim-global-referral-unverified', publicSummary: 'Referral-code compatibility is not verified for Kazakhstan.', internalDetail: 'Global referral-code compatibility remains UNVERIFIED; /go/bybit + CRYPTOBONUSW not verified locally.', severity: 'HIGH', conflictIds: ['cf-kz-bybit-002'], affectedFields: ['global-referral-compatibility', 'affiliate-route', 'referral-code', 'eligibility-cta'], requiredForFuturePresentation: true, blocksExecution: true, blocksProductionActivation: true },
    { limitationId: 'lim-narrower-promo-eligibility', publicSummary: 'Local promotional eligibility is narrower than platform availability.', internalDetail: 'Local promo programs exist (1,032 USDT referral; 2,500 USDT campaign) but are campaign-specific; not a global maximum.', severity: 'MEDIUM', conflictIds: [], affectedFields: ['product-promotions', 'offer-local-referral-amount', 'offer-kazakhstan-campaign-amount', 'eligibility-promo'], requiredForFuturePresentation: true, blocksExecution: true, blocksProductionActivation: true },
    { limitationId: 'lim-not-live-verified', publicSummary: 'Live in-country behavior has not been verified.', internalDetail: 'liveVerificationState = NOT_LIVE_VERIFIED (NO-PROXY mode).', severity: 'MEDIUM', conflictIds: [], affectedFields: ['availability-live-verification', 'eligibility-ranking'], requiredForFuturePresentation: true, blocksExecution: true, blocksProductionActivation: true },
    { limitationId: 'lim-recovered-unverified', publicSummary: 'Underlying research package is recovered/unverified.', internalDetail: 'packageStatus = RECOVERED / UNVERIFIED (not byte-original).', severity: 'MEDIUM', conflictIds: [], affectedFields: ['availability-overall', 'availability-confidence'], requiredForFuturePresentation: true, blocksExecution: true, blocksProductionActivation: true },
  ];
}

/* ---------------- conflict projection ---------------- */
function conflictProjection() {
  const byId = Object.fromEntries(CONF.conflicts.map((c) => [c.conflictId, c]));
  return {
    'cf-kz-bybit-001': { canonicalStatus: byId['cf-kz-bybit-001'].status, legacyRepresentation: 'OMITTED (conflict_ids empty; unknown_claim_ids for registration)', productionRepresentation: 'OMITTED (restrictionNote silent on citizenship scope)', previewRepresentation: 'PRESERVED, PARTIALLY_RESOLVED, disclosed', unresolvedEvidence: byId['cf-kz-bybit-001'].unresolvedEvidence, affectedFields: ['availability-overall', 'product-registration', 'product-kyc'], hiddenRiskLevel: 'LOW_MEDIUM', blocksExecution: true, blocksProductionActivation: true },
    'cf-kz-bybit-002': { canonicalStatus: byId['cf-kz-bybit-002'].status, legacyRepresentation: 'PARTIAL (global-vs-local routing noted as unknown)', productionRepresentation: 'PARTIAL (separately licensed Bybit Kazakhstan vs global noted)', previewRepresentation: 'PRESERVED, PARTIALLY_RESOLVED, routingMatrix disclosed', unresolvedEvidence: byId['cf-kz-bybit-002'].unresolvedEvidence, affectedFields: ['product-bank_card_purchase', 'product-bybit_card', 'product-referral', 'product-promotions', 'global-referral-compatibility'], hiddenRiskLevel: 'MEDIUM', blocksExecution: true, blocksProductionActivation: true },
  };
}

/* ---------------- legacy-to-mi field map ---------------- */
function fieldMap() {
  const rows = [];
  const push = (r) => rows.push({
    fieldId: r.fieldId, canonicalPath: r.canonicalPath, canonicalValue: r.canonicalValue,
    legacyPath: r.legacyPath ?? null, legacyValue: r.legacyValue ?? null,
    productionPath: r.productionPath ?? null, productionValue: r.productionValue ?? null,
    classification: r.classification, approvedForPreview: r.approvedForPreview,
    approvedForExecution: false, approvedForProductionActivation: false,
    projectionRule: r.projectionRule, limitationDisclosureRequired: r.limitationDisclosureRequired,
    conflictIds: r.conflictIds || [], reasonCodes: r.reasonCodes || [], materiality: r.materiality, notes: r.notes,
  });
  const CELLP = 'data/market-intelligence/cells/by-country/kz/bybit.json';
  const LGP = 'research/geo/kazakhstan/exchanges/bybit.json';
  const GR = 'src/data/geoRankings.ts (MANUAL_OVERRIDES.kazakhstan.bybit)';

  push({ fieldId: 'availability-overall', canonicalPath: `${CELLP}#/overallAvailability`, canonicalValue: CELL.overallAvailability, legacyPath: `${LGP}#/availability`, legacyValue: 'UNKNOWN (in_progress)', productionPath: GR, productionValue: PROD_AVAIL, classification: 'PRIMARY_MATCH_MI_MORE_PRECISE', approvedForPreview: true, projectionRule: 'PROJECT_VALUE', limitationDisclosureRequired: true, conflictIds: ['cf-kz-bybit-001', 'cf-kz-bybit-002'], reasonCodes: CELL.reasonCodes, materiality: 'LOW', notes: 'AVAILABLE_WITH_LIMITS projects as positive GREEN/available with AMBER limitation layer; not restricted.' });
  push({ fieldId: 'availability-confidence', canonicalPath: `${CELLP}#/confidence`, canonicalValue: CELL.confidence, legacyPath: `${LGP}#/scores/confidence`, legacyValue: LEGACY.scores.confidence, productionPath: GR, productionValue: 'verified (license only)', classification: 'NOT_COMPARABLE', approvedForPreview: true, projectionRule: 'PROJECT_VALUE', limitationDisclosureRequired: false, conflictIds: [], reasonCodes: [], materiality: 'LOW', notes: 'Confidence scales differ; production "verified" = AFSA license verification, not overall availability confidence.' });
  push({ fieldId: 'availability-live-verification', canonicalPath: `${CELLP}#/liveVerificationState`, canonicalValue: CELL.liveVerificationState, legacyPath: null, legacyValue: null, productionPath: null, productionValue: null, classification: 'MI_ONLY', approvedForPreview: true, projectionRule: 'PROJECT_VALUE', limitationDisclosureRequired: true, conflictIds: [], reasonCodes: ['NOT_LIVE_VERIFIED'], materiality: 'MEDIUM', notes: 'Only MI records live-verification state.' });
  push({ fieldId: 'presentation-primary-state', canonicalPath: 'candidateMetadata.presentation.primaryState (staging) → GREEN', canonicalValue: 'GREEN / Available', legacyPath: null, legacyValue: null, productionPath: GR, productionValue: 'available (green)', classification: 'PRIMARY_MATCH_MI_MORE_PRECISE', approvedForPreview: true, projectionRule: 'PROJECT_VALUE', limitationDisclosureRequired: false, conflictIds: [], reasonCodes: [], materiality: 'LOW', notes: 'Positive primary presentation aligned.' });
  push({ fieldId: 'presentation-secondary-state', canonicalPath: 'candidateMetadata.presentation.secondaryState (staging) → AMBER', canonicalValue: 'AMBER / Some limits apply', legacyPath: null, legacyValue: null, productionPath: null, productionValue: null, classification: 'MI_ONLY', approvedForPreview: true, projectionRule: 'PROJECT_VALUE', limitationDisclosureRequired: true, conflictIds: ['cf-kz-bybit-001', 'cf-kz-bybit-002'], reasonCodes: [], materiality: 'LOW', notes: 'AMBER limitation marker exists only in MI; must be preserved on any projection.' });

  for (const x of PRODUCTS) {
    push({ fieldId: `product-${x.p}`, canonicalPath: `${CELLP}#/productStatuses/${x.p}`, canonicalValue: CELL.productStatuses[x.p], legacyPath: `${LGP} (partial model)`, legacyValue: x.legacy, productionPath: GR, productionValue: x.prod, classification: x.cls, approvedForPreview: true, projectionRule: 'PROJECT_VALUE', limitationDisclosureRequired: x.limit, conflictIds: x.cf, reasonCodes: x.rc, materiality: (x.p === 'registration' || x.p === 'bank_card_purchase' || x.p === 'referral' || x.p === 'promotions') ? 'MEDIUM' : 'LOW', notes: 'Product status preserved exactly; not upgraded/downgraded; not flattened into overall.' });
  }

  push({ fieldId: 'eligibility-ranking', canonicalPath: `${CELLP}#/rankingEligibility`, canonicalValue: false, legacyPath: `${LGP}#/status/index_eligible`, legacyValue: LEGACY.status.index_eligible, productionPath: GR, productionValue: `${PROD_AVAIL} (ranked, unpublished)`, classification: 'PRODUCTION_MORE_PERMISSIVE', approvedForPreview: true, projectionRule: 'PROJECT_AS_BLOCKED', limitationDisclosureRequired: true, conflictIds: [], reasonCodes: ['NOT_LIVE_VERIFIED'], materiality: 'HIGH', notes: 'Production data more permissive than MI eligibility; KZ unpublished; ranking not activated.' });
  push({ fieldId: 'ranking-position', canonicalPath: 'n/a (MI assigns no position)', canonicalValue: null, legacyPath: null, legacyValue: null, productionPath: `${GR} / production snapshot`, productionValue: PROD_POS, classification: 'PRODUCTION_ONLY', approvedForPreview: false, projectionRule: 'REFERENCE_ONLY_BLOCKED', limitationDisclosureRequired: false, conflictIds: [], reasonCodes: [], materiality: 'MEDIUM', notes: 'Production position (1) referenced for disclosure only; not projected as an MI value; ranking not changed.' });
  push({ fieldId: 'eligibility-cta', canonicalPath: `${CELLP}#/ctaEligibility`, canonicalValue: false, legacyPath: `${LGP}#/status/cta`, legacyValue: LEGACY.status.cta, productionPath: GR, productionValue: 'not published; bonusAvailability unknown', classification: 'MATCH', approvedForPreview: true, projectionRule: 'PROJECT_AS_BLOCKED', limitationDisclosureRequired: true, conflictIds: ['cf-kz-bybit-002'], reasonCodes: ['OFFER_ELIGIBILITY_UNVERIFIED'], materiality: 'MEDIUM', notes: 'No live CTA; MI ctaEligibility false; projected as blocked.' });
  push({ fieldId: 'eligibility-promo', canonicalPath: `${CELLP}#/promoEligibility`, canonicalValue: false, legacyPath: `${LGP}#/affiliate/bonus_claim_status`, legacyValue: LEGACY.affiliate.bonus_claim_status, productionPath: GR, productionValue: PROD.bonusAvailability, classification: 'MATCH', approvedForPreview: true, projectionRule: 'PROJECT_AS_BLOCKED', limitationDisclosureRequired: true, conflictIds: [], reasonCodes: ['OFFER_ELIGIBILITY_UNVERIFIED'], materiality: 'MEDIUM', notes: 'No live promo; MI promoEligibility false; projected as blocked.' });
  push({ fieldId: 'affiliate-route', canonicalPath: 'n/a (OFFER_REGISTRY-owned, not MI cell)', canonicalValue: null, legacyPath: `${LGP}#/affiliate/go_route`, legacyValue: LEGACY.affiliate.go_route, productionPath: GR, productionValue: PROD.affiliateRoute, classification: 'NOT_COMPARABLE', approvedForPreview: false, projectionRule: 'REFERENCE_ONLY_BLOCKED', limitationDisclosureRequired: true, conflictIds: ['cf-kz-bybit-002'], reasonCodes: [], materiality: 'MEDIUM', notes: 'Route is affiliate/offer-registry-owned; referenced only; not changed or verified.' });
  push({ fieldId: 'referral-code', canonicalPath: 'n/a (OFFER_REGISTRY-owned)', canonicalValue: null, legacyPath: `${LGP}#/affiliate/promo_code`, legacyValue: LEGACY.affiliate.promo_code, productionPath: GR, productionValue: PROD.promoCode, classification: 'NOT_COMPARABLE', approvedForPreview: false, projectionRule: 'REFERENCE_ONLY_BLOCKED', limitationDisclosureRequired: true, conflictIds: ['cf-kz-bybit-002'], reasonCodes: [], materiality: 'MEDIUM', notes: 'Code referenced only; not activated for KZ; global compatibility UNVERIFIED.' });
  push({ fieldId: 'global-referral-compatibility', canonicalPath: `${PROV.exchangeId ? 'data/market-intelligence/provenance/by-country/kz/bybit.json' : ''}#/offerBoundaries/globalReferralCodeCompatibility`, canonicalValue: PROV.offerBoundaries.globalReferralCodeCompatibility, legacyPath: `${LGP}#/affiliate/geo_eligible`, legacyValue: LEGACY.affiliate.geo_eligible, productionPath: GR, productionValue: 'global /go/bybit route present; unverified', classification: 'PRIMARY_MATCH_MI_MORE_PRECISE', approvedForPreview: true, projectionRule: 'PROJECT_VALUE', limitationDisclosureRequired: true, conflictIds: ['cf-kz-bybit-002'], reasonCodes: ['OFFER_ELIGIBILITY_UNVERIFIED'], materiality: 'HIGH', notes: 'UNVERIFIED preserved; must not be treated as verified before any CTA.' });
  push({ fieldId: 'offer-local-referral-amount', canonicalPath: 'data/market-intelligence/provenance/by-country/kz/bybit.json#/offerAmounts/localReferralUpToUsdt', canonicalValue: PROV.offerAmounts.localReferralUpToUsdt, legacyPath: null, legacyValue: null, productionPath: GR, productionValue: 'no amount claimed (bonusAvailability unknown)', classification: 'MI_ONLY', approvedForPreview: false, projectionRule: 'REFERENCE_ONLY_BLOCKED', limitationDisclosureRequired: true, conflictIds: [], reasonCodes: ['OFFER_ELIGIBILITY_UNVERIFIED'], materiality: 'MEDIUM', notes: '1,032 USDT is research evidence only; separate; not the global maximum; not placed in a production offer field.' });
  push({ fieldId: 'offer-kazakhstan-campaign-amount', canonicalPath: 'data/market-intelligence/provenance/by-country/kz/bybit.json#/offerAmounts/kazakhstanCampaignPrizePoolUsdt', canonicalValue: PROV.offerAmounts.kazakhstanCampaignPrizePoolUsdt, legacyPath: null, legacyValue: null, productionPath: GR, productionValue: 'no amount claimed', classification: 'MI_ONLY', approvedForPreview: false, projectionRule: 'REFERENCE_ONLY_BLOCKED', limitationDisclosureRequired: true, conflictIds: [], reasonCodes: ['OFFER_ELIGIBILITY_UNVERIFIED'], materiality: 'MEDIUM', notes: '2,500 USDT is a separate campaign pool; research evidence only; not combined; not a global maximum.' });
  push({ fieldId: 'conflict-ids', canonicalPath: 'data/market-intelligence/conflicts/by-country/kz/bybit.json', canonicalValue: CONF.conflicts.map((c) => `${c.conflictId}:${c.status}`), legacyPath: `${LGP}#/conflict_ids`, legacyValue: LEGACY.conflict_ids, productionPath: GR, productionValue: 'partial narrative only', classification: 'MI_ONLY', approvedForPreview: true, projectionRule: 'PROJECT_VALUE', limitationDisclosureRequired: true, conflictIds: ['cf-kz-bybit-001', 'cf-kz-bybit-002'], reasonCodes: ['ROUTING_PARTIAL', 'REGISTRATION_SCOPE_PARTIAL'], materiality: 'HIGH', notes: 'Both conflicts preserved PARTIALLY_RESOLVED; legacy omits; not resolved.' });
  push({ fieldId: 'binding-state', canonicalPath: 'data/market-intelligence/bindings/by-country/kz/bybit.json', canonicalValue: `${BND.reviewStatus}/${BND.canonicalRecord}/${BND.migrationPhase}`, legacyPath: null, legacyValue: 'production truth (no binding)', productionPath: GR, productionValue: 'production truth', classification: 'MI_ONLY', approvedForPreview: true, projectionRule: 'PROJECT_AS_BLOCKED', limitationDisclosureRequired: false, conflictIds: [], reasonCodes: [], materiality: 'NONE', notes: 'Binding WRITTEN_NON_ACTIVE, canonicalRecord GEO_LEGACY; activation not authorized.' });
  push({ fieldId: 'legacy-ownership', canonicalPath: 'binding.canonicalRecord = GEO_LEGACY', canonicalValue: 'cedes to GEO_LEGACY until migration', legacyPath: `${LGP}`, legacyValue: 'owns production availability', productionPath: GR, productionValue: 'owns ranking/CTA', classification: 'MATCH', approvedForPreview: true, projectionRule: 'PROJECT_VALUE', limitationDisclosureRequired: false, conflictIds: [], reasonCodes: [], materiality: 'NONE', notes: 'MI explicitly keeps legacy GEO as production truth.' });
  push({ fieldId: 'publication-eligibility', canonicalPath: 'MIGRATION_5 owner decision (publication blocked)', canonicalValue: false, legacyPath: 'config/geo/kazakhstan.json#/homepage_eligible', legacyValue: CFG.homepage_eligible, productionPath: 'config/geo/kazakhstan.json#/publication_status', productionValue: CFG.publication_status, classification: 'MATCH', approvedForPreview: true, projectionRule: 'PROJECT_AS_BLOCKED', limitationDisclosureRequired: false, conflictIds: [], reasonCodes: [], materiality: 'NONE', notes: 'Kazakhstan remains publication-blocked in all layers.' });

  rows.sort((a, b) => a.fieldId.localeCompare(b.fieldId));
  return rows;
}

/* ---------------- non-active adapter preview ---------------- */
function adapterPreview() {
  return {
    previewMetadata: {
      recordState: 'PREVIEW', nonProduction: true, runtimeConsumed: false,
      migration5PreparationAuthorized: true, migration5ExecutionAuthorized: false, migration5ProductionActivationAuthorized: false,
      sourceCommit: DECISION_COMMIT,
    },
    sourceOwnership: {
      canonicalResearchTruth: 'data/market-intelligence/cells/by-country/kz/bybit.json',
      legacyProductionTruth: 'research/geo/kazakhstan/exchanges/bybit.json',
      productionRankingTruth: 'src/data/geoRankings.ts',
      automaticSynchronizationAuthorized: false,
    },
    availabilityProjection: {
      canonicalAvailability: 'AVAILABLE_WITH_LIMITS', legacyCompatiblePrimaryAvailability: 'available',
      primaryState: 'GREEN', primaryLabel: 'Available', secondaryState: 'AMBER', secondaryLabel: 'Some limits apply',
      limitationDisclosureRequired: true, confidence: 'MEDIUM', liveVerificationState: 'NOT_LIVE_VERIFIED',
    },
    productProjection: productProjectionRows(),
    limitations: limitations(),
    conflicts: CONF.conflicts.map((c) => ({ conflictId: c.conflictId, status: c.status, autoResolved: c.autoResolved, ownerReviewRequired: c.ownerReviewRequired, previewRepresentation: 'PRESERVED (not resolved/flattened)' })),
    blockedFields: {
      ranking: true, cta: true, promo: true, affiliateRoute: true, referralCode: true, bonusAmount: true,
      publication: true, productionIntegration: true, bindingActivation: true, legacyGeoWrite: true, productionRankingWrite: true,
    },
    bindingProjection: {
      currentWriteState: 'WRITTEN_NON_ACTIVE', ownerApproved: false, reviewStatus: 'PROPOSED',
      canonicalRecord: 'GEO_LEGACY', migrationPhase: 'MIGRATION_4', proposedActivation: false,
    },
    publicationProjection: { homepageEligible: false, publicationStatus: 'blocked_by_missing_evidence', proposedPublication: false },
    safety: {
      productionFilesModified: false, canonicalFilesModified: false, legacyFilesModified: false, runtimeFilesModified: false,
      bindingActivated: false, rankingChanged: false, ctaChanged: false, promoChanged: false, publicationChanged: false, deployOccurred: false,
    },
    rankingProjection: { currentProductionPosition: PROD_POS, currentProductionRankingSafety: 'SAFE_WITH_DISCLOSED_GAP', futureRankingDecisionReadiness: 'READY_WITH_LIMITS', canonicalRankingEligibility: false, proposedRankingChange: 'NONE', rankingChangeAuthorized: false },
    ctaReferralProjection: { currentRoute: PROD.affiliateRoute, currentCode: PROD.promoCode, globalReferralCodeCompatibility: 'UNVERIFIED', canonicalCtaEligibility: false, currentProductionCtaSafety: 'SAFE_WITH_DISCLOSED_GAP', proposedCtaChange: 'NONE', proposedRouteChange: 'NONE', proposedCodeActivation: false, ctaChangeAuthorized: false, affiliateRouteChangeAuthorized: false, referralCodeActivationAuthorized: false },
    promoProjection: { localReferralProgram: { amount: 1032, currency: 'USDT' }, localCampaignPrizePool: { amount: 2500, currency: 'USDT' }, combined: false, globalMaximumVerified: false, canonicalPromoEligibility: false, currentProductionPromoSafety: 'SAFE_WITH_DISCLOSED_GAP', proposedPromoChange: 'NONE', promoChangeAuthorized: false },
  };
}

/* ---------------- shadow comparison ---------------- */
function shadowComparison(fmap) {
  return {
    sources: {
      canonicalMI: 'data/market-intelligence/cells/by-country/kz/bybit.json',
      legacyGeo: 'research/geo/kazakhstan/exchanges/bybit.json',
      production: 'src/data/geoRankings.ts',
      proposedPreview: `${PREVIEW_REL}/non-active-adapter.preview.json`,
    },
    sourceCommits: { canonicalMI: CANONICAL_MI_COMMIT, discrepancyReview: DISCREPANCY_REVIEW_COMMIT, migration5OwnerDecision: DECISION_COMMIT },
    comparisonRows: fmap.map((r) => ({ fieldId: r.fieldId, canonicalValue: r.canonicalValue, legacyValue: r.legacyValue, productionValue: r.productionValue, previewProjection: r.approvedForPreview ? r.canonicalValue : 'BLOCKED (reference only)', classification: r.classification, materiality: r.materiality })),
    primaryAvailabilityAlignment: 'MATCH_WITH_MI_LIMITATIONS',
    legacyGeoAlignment: 'ALIGNED_WITH_PRECISION_GAPS',
    productionAlignment: 'ALIGNED_WITH_PRECISION_GAPS',
    productLevelAlignment: productProjectionRows().map((r) => ({ product: r.product, canonical: r.canonicalStatus, legacy: r.legacyStatus, production: r.productionStatus, preview: r.proposedShadowStatus })),
    blockedFieldSummary: ['ranking', 'ranking-position', 'cta', 'promo', 'affiliate-route', 'referral-code', 'offer-amounts', 'publication', 'production-integration', 'binding-activation', 'legacy-geo-write', 'production-ranking-write'],
    ownershipSummary: { availability: 'MI', productStatuses: 'MI', offerEligibility: 'OFFER_REGISTRY', rankingEligibility: 'RANKING_ENGINE', currentProductionTruth: 'GEO_LEGACY + geoRankings' },
    userFacingImpact: 'NONE — Kazakhstan is publication-blocked; preview is non-runtime and changes nothing shown to users.',
    potentialFutureChange: 'A future owner-approved MIGRATION_5 execution could present GREEN Available + AMBER limitations, preserving product statuses, conflicts and blocked eligibility. Not performed here.',
    migrationExecuted: false,
    noChangeConfirmation: { canonicalFilesModified: false, legacyFilesModified: false, productionFilesModified: false, bindingActivated: false, deployOccurred: false },
  };
}

/* ---------------- validation ---------------- */
function validate(fmap, adapter, shadow) {
  const requiredFields = ['availability-overall', 'availability-confidence', 'availability-live-verification', 'presentation-primary-state', 'presentation-secondary-state', 'product-registration', 'product-kyc', 'product-spot', 'product-derivatives', 'product-margin', 'product-p2p', 'product-kzt_p2p', 'product-direct_kzt_deposit', 'product-direct_kzt_withdrawal', 'product-bank_card_purchase', 'product-bybit_card', 'product-referral', 'product-promotions', 'eligibility-ranking', 'ranking-position', 'eligibility-cta', 'eligibility-promo', 'affiliate-route', 'referral-code', 'global-referral-compatibility', 'offer-local-referral-amount', 'offer-kazakhstan-campaign-amount', 'conflict-ids', 'binding-state', 'legacy-ownership', 'publication-eligibility'];
  const ids = fmap.map((r) => r.fieldId);
  const CLASSES = new Set(['MATCH', 'PRIMARY_MATCH_MI_MORE_PRECISE', 'MI_MORE_CONSERVATIVE', 'MI_MORE_PERMISSIVE', 'LEGACY_MORE_CONSERVATIVE', 'LEGACY_MORE_PERMISSIVE', 'PRODUCTION_MORE_CONSERVATIVE', 'PRODUCTION_MORE_PERMISSIVE', 'MI_ONLY', 'LEGACY_ONLY', 'PRODUCTION_ONLY', 'CONFLICT', 'NOT_COMPARABLE']);
  const wps = { registration: 'AVAILABLE_WITH_LIMITS', kyc: 'AVAILABLE_WITH_LIMITS', spot: 'AVAILABLE', derivatives: 'AVAILABLE_WITH_LIMITS', margin: 'AVAILABLE_WITH_LIMITS', p2p: 'AVAILABLE_WITH_LIMITS', kzt_p2p: 'AVAILABLE', direct_kzt_deposit: 'AVAILABLE_WITH_LIMITS', direct_kzt_withdrawal: 'AVAILABLE_WITH_LIMITS', bank_card_purchase: 'CONFLICTING', bybit_card: 'AVAILABLE_WITH_LIMITS', referral: 'UNKNOWN', promotions: 'AVAILABLE_WITH_LIMITS' };

  const v = {};
  v.INPUT_INTEGRITY = baselineIntegrity().length === 0 ? 'PASS' : 'FAIL';
  v.FIELD_MAPPING_COMPLETENESS = (requiredFields.every((f) => ids.includes(f)) && fmap.every((r) => CLASSES.has(r.classification)) && ids.length === new Set(ids).size && JSON.stringify(ids) === JSON.stringify([...ids].sort())) ? 'PASS' : 'FAIL';
  v.PRIMARY_AVAILABILITY_SEMANTICS = (adapter.availabilityProjection.canonicalAvailability === 'AVAILABLE_WITH_LIMITS' && adapter.availabilityProjection.legacyCompatiblePrimaryAvailability === 'available' && adapter.availabilityProjection.primaryState === 'GREEN' && adapter.availabilityProjection.secondaryState === 'AMBER' && adapter.availabilityProjection.limitationDisclosureRequired === true) ? 'PASS' : 'FAIL';
  v.PRODUCT_STATUS_PRESERVATION = JSON.stringify(Object.fromEntries(adapter.productProjection.map((r) => [r.product, r.canonicalStatus]))) === JSON.stringify(wps) ? 'PASS' : 'FAIL';
  v.LIMITATION_DISCLOSURE = adapter.limitations.length === 7 && adapter.limitations.every((l) => l.blocksExecution && l.blocksProductionActivation) ? 'PASS' : 'FAIL';
  v.CONFLICT_PRESERVATION = adapter.conflicts.length === 2 && adapter.conflicts.every((c) => c.status === 'PARTIALLY_RESOLVED') ? 'PASS' : 'FAIL';
  v.BLOCKED_FIELD_ENFORCEMENT = Object.values(adapter.blockedFields).every((x) => x === true) && adapter.rankingProjection.rankingChangeAuthorized === false && adapter.ctaReferralProjection.ctaChangeAuthorized === false && adapter.promoProjection.promoChangeAuthorized === false ? 'PASS' : 'FAIL';
  v.ADAPTER_NON_ACTIVATION = (adapter.previewMetadata.recordState === 'PREVIEW' && adapter.previewMetadata.runtimeConsumed === false && adapter.bindingProjection.proposedActivation === false && adapter.publicationProjection.proposedPublication === false && Object.values(adapter.safety).every((x) => x === false)) ? 'PASS' : 'FAIL';
  v.NO_PRODUCTION_CHANGE = (shadow.migrationExecuted === false && Object.values(shadow.noChangeConfirmation).every((x) => x === false)) ? 'PASS' : 'FAIL';
  const allPass = Object.values(v).every((x) => x === 'PASS');
  v.PREVIEW_COMMIT_READINESS = allPass ? 'READY' : 'NOT_READY';
  return v;
}

function validationMd(v, manifestless) {
  const L = [];
  L.push('# CBW KZ × Bybit — MIGRATION_5 Non-Production Preview Validation Report');
  L.push('');
  L.push(`- Task \`CBW-KZ-BYBIT-P0A-MIGRATION-5-PREVIEW-IMPLEMENTATION-011\` · baseline HEAD \`${BASELINE_HEAD}\` · deterministic · non-production`);
  L.push('- Owner decision: MIGRATION_5 APPROVED_WITH_LIMITS (preparation only; execution + production activation NOT authorized).');
  L.push('');
  L.push('## Verdicts');
  for (const [k, val] of Object.entries(v)) L.push(`- **${k}**: ${val}`);
  L.push('');
  L.push('## Preview outputs (deterministic; SHA-256)');
  for (const [n, h] of Object.entries(manifestless)) L.push(`- \`${n}\`: ${h.bytes} B · sha256 \`${h.sha256}\``);
  L.push('');
  L.push('## Guarantees');
  L.push('- AVAILABLE_WITH_LIMITS projects as GREEN/Available + AMBER "Some limits apply" (not restricted).');
  L.push('- All 13 product statuses preserved exactly (spot/kzt_p2p AVAILABLE; bank_card_purchase CONFLICTING; referral UNKNOWN; rest AVAILABLE_WITH_LIMITS).');
  L.push('- cf-kz-bybit-001 + cf-kz-bybit-002 preserved PARTIALLY_RESOLVED (not resolved/flattened).');
  L.push('- Blocked: ranking · CTA · promo · affiliate route · referral code · bonus amount · publication · production integration · binding activation · legacy/production write.');
  L.push('- Binding WRITTEN_NON_ACTIVE (GEO_LEGACY, MIGRATION_4); Kazakhstan publication blocked; nothing runtime-consumed; nothing modified/committed/deployed.');
  L.push('');
  return L.join('\n') + '\n';
}

/* ---------------- build outputs ---------------- */
function buildOutputs() {
  const fmap = fieldMap();
  const adapter = adapterPreview();
  const shadow = shadowComparison(fmap);
  const verdicts = validate(fmap, adapter, shadow);

  const files = {};
  files['legacy-to-mi-field-map.json'] = ser({ task: 'CBW-KZ-BYBIT-P0A-MIGRATION-5-PREVIEW-IMPLEMENTATION-011', countryCode: 'KZ', exchangeId: 'bybit', sourceCommit: DECISION_COMMIT, deterministic: true, nonProduction: true, rows: fmap });
  files['shadow-comparison.json'] = ser(shadow);
  files['non-active-adapter.preview.json'] = ser(adapter);

  // validation report references the three outputs above (acyclic) + the script; NOT the manifest.
  const scriptBuf = readFileSync(fileURLToPath(import.meta.url));
  const hashSet = {
    [`${PREVIEW_REL}/legacy-to-mi-field-map.json`]: { bytes: Buffer.byteLength(files['legacy-to-mi-field-map.json'], 'utf8'), sha256: sha256(files['legacy-to-mi-field-map.json']) },
    [`${PREVIEW_REL}/shadow-comparison.json`]: { bytes: Buffer.byteLength(files['shadow-comparison.json'], 'utf8'), sha256: sha256(files['shadow-comparison.json']) },
    [`${PREVIEW_REL}/non-active-adapter.preview.json`]: { bytes: Buffer.byteLength(files['non-active-adapter.preview.json'], 'utf8'), sha256: sha256(files['non-active-adapter.preview.json']) },
    [SCRIPT_REL]: { bytes: scriptBuf.length, sha256: sha256(scriptBuf) },
  };
  files['validation-report.json'] = ser({ task: 'CBW-KZ-BYBIT-P0A-MIGRATION-5-PREVIEW-IMPLEMENTATION-011', baselineHead: BASELINE_HEAD, verdicts, inputsHashed: hashSet, deterministic: true, nonProduction: true, note: 'PREVIEW_COMMIT_READINESS is READY only when every integrity dimension PASSes.' });
  files['validation-report.md'] = validationMd(verdicts, { ...hashSet, [`${PREVIEW_REL}/validation-report.json`]: { bytes: Buffer.byteLength(files['validation-report.json'], 'utf8'), sha256: sha256(files['validation-report.json']) } });

  // manifest last: hashes the 6 files other than itself (script + 5 outputs). No self-reference.
  const manifestHashes = {
    [SCRIPT_REL]: hashSet[SCRIPT_REL],
    [`${PREVIEW_REL}/legacy-to-mi-field-map.json`]: hashSet[`${PREVIEW_REL}/legacy-to-mi-field-map.json`],
    [`${PREVIEW_REL}/shadow-comparison.json`]: hashSet[`${PREVIEW_REL}/shadow-comparison.json`],
    [`${PREVIEW_REL}/non-active-adapter.preview.json`]: hashSet[`${PREVIEW_REL}/non-active-adapter.preview.json`],
    [`${PREVIEW_REL}/validation-report.json`]: { bytes: Buffer.byteLength(files['validation-report.json'], 'utf8'), sha256: sha256(files['validation-report.json']) },
    [`${PREVIEW_REL}/validation-report.md`]: { bytes: Buffer.byteLength(files['validation-report.md'], 'utf8'), sha256: sha256(files['validation-report.md']) },
  };
  files['preview-manifest.json'] = ser({
    task: 'CBW-KZ-BYBIT-P0A-MIGRATION-5-PREVIEW-IMPLEMENTATION-011',
    project: 'CryptoBonusWorld', repository: 'C:/projects/CryptoBonusWorld', branch: 'master', baselineHead: BASELINE_HEAD,
    countryCode: 'KZ', exchangeId: 'bybit', batchId: 'KZ-P0-A',
    canonicalMiCommit: CANONICAL_MI_COMMIT, discrepancyReviewCommit: DISCREPANCY_REVIEW_COMMIT, migration5OwnerDecisionCommit: DECISION_COMMIT,
    generatedFiles: [SCRIPT_REL, `${PREVIEW_REL}/preview-manifest.json`, `${PREVIEW_REL}/legacy-to-mi-field-map.json`, `${PREVIEW_REL}/shadow-comparison.json`, `${PREVIEW_REL}/non-active-adapter.preview.json`, `${PREVIEW_REL}/validation-report.json`, `${PREVIEW_REL}/validation-report.md`],
    hashesExcludingManifest: manifestHashes,
    deterministic: true, nonProduction: true, runtimeConsumed: false,
    migration5PreparationAuthorized: true, migration5ExecutionAuthorized: false, productionActivationAuthorized: false,
    bindingActivationAuthorized: false, legacyGeoWriteAuthorized: false, productionRankingWriteAuthorized: false,
    ctaChangeAuthorized: false, promoChangeAuthorized: false, publicationAuthorized: false, deployAuthorized: false,
  });

  return { files, verdicts };
}

/* ---------------- main ---------------- */
function main() {
  const argv = process.argv.slice(2);
  let mode = null;
  for (const t of argv) {
    if (t === '--dry-run') mode = mode || 'dry-run';
    else if (t === '--write-preview') mode = mode || 'write-preview';
    else if (t === '--check') mode = mode || 'check';
    else if (t === '--help' || t === '-h') mode = 'help';
    else err(`unknown argument: ${t}`);
  }
  if (!mode || mode === 'help') refuse('a mode is required: --dry-run | --write-preview | --check');

  const bi = baselineIntegrity();
  if (bi.length) { for (const x of bi) console.error(`BASELINE: ${x}`); err('baseline integrity failed; refusing to run'); }

  const { files, verdicts } = buildOutputs();
  const notReady = verdicts.PREVIEW_COMMIT_READINESS !== 'READY';

  if (mode === 'dry-run') {
    process.stdout.write(`DRY-RUN · files=${Object.keys(files).length} · PREVIEW_COMMIT_READINESS=${verdicts.PREVIEW_COMMIT_READINESS}\n`);
    for (const n of Object.keys(files)) process.stdout.write(`  would write ${PREVIEW_REL}/${n} (${Buffer.byteLength(files[n], 'utf8')} B, sha ${sha256(files[n]).slice(0, 12)})\n`);
    process.exit(notReady ? 1 : 0);
  }

  if (mode === 'check') {
    let mism = 0;
    for (const [n, content] of Object.entries(files)) {
      const p = join(PREVIEW_ABS, n);
      if (!existsSync(p)) { console.error(`CHECK: missing ${PREVIEW_REL}/${n}`); mism++; continue; }
      if (readFileSync(p, 'utf8') !== content) { console.error(`CHECK: differs ${PREVIEW_REL}/${n}`); mism++; }
    }
    if (mism) { console.error(`CHECK FAILED (${mism})`); process.exit(1); }
    console.log('CHECK OK — preview files match regenerated output.');
    process.exit(0);
  }

  // write-preview: refuse to write anywhere but the exact preview directory
  if (notReady) { console.error('validation NOT_READY; refusing to write'); process.exit(1); }
  const norm = (p) => p.replace(/\\/g, '/');
  if (!norm(PREVIEW_ABS).endsWith(PREVIEW_REL)) refuse(`unexpected preview path: ${PREVIEW_ABS}`);
  mkdirSync(PREVIEW_ABS, { recursive: true });
  for (const [n, content] of Object.entries(files)) {
    const target = norm(join(PREVIEW_ABS, n));
    if (!target.startsWith(norm(PREVIEW_ABS) + '/')) refuse(`refusing to write outside preview dir: ${target}`);
    writeFileSync(join(PREVIEW_ABS, n), content, 'utf8');
  }
  console.log(`WROTE ${Object.keys(files).length} preview files under ${PREVIEW_REL}/ (PREVIEW_COMMIT_READINESS=${verdicts.PREVIEW_COMMIT_READINESS}).`);
  process.exit(0);
}

main();
