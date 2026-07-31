import type { NormalizedClaim, ValidationIssue } from '../../contracts/portalFactory';
import {
  binanceKazakhstanClaims,
  binanceKazakhstanMarketProfile,
} from './binanceReview';
import {
  bybitKazakhstanClaims,
  bybitKazakhstanMarketProfile,
} from './bybitReview';
import {
  okxKazakhstanClaims,
  okxKazakhstanMarketProfile,
} from './okxReview';
import { kazakhstanDraftRankingSnapshot } from './rankingSnapshotDraft';

export type KazakhstanComparisonExchangeId = 'binance' | 'bybit' | 'okx';
export type KazakhstanComparisonDimension =
  | 'kyc_account_access'
  | 'kzt_fiat_p2p'
  | 'product_coverage'
  | 'fees_limits'
  | 'conflicts_freshness';
export type KazakhstanComparisonState = 'mapped' | 'partial' | 'missing' | 'conflicting';

export interface KazakhstanComparisonCell {
  cellId: string;
  exchangeId: KazakhstanComparisonExchangeId;
  dimension: KazakhstanComparisonDimension;
  state: KazakhstanComparisonState;
  summary: string;
  evidenceClaimIds: string[];
  checkedAt: string;
  nextReviewAt: string;
  limitations: string[];
  rankingPosition: null;
  affiliateInfluence: false;
}

export interface KazakhstanComparisonDimensionSummary {
  dimension: KazakhstanComparisonDimension;
  mapped: number;
  partial: number;
  missing: number;
  conflicting: number;
  comparableForOrdering: boolean;
}

export interface KazakhstanComparativeMatrix {
  matrixId: string;
  countryCode: 'KZ';
  methodologyVersion: string;
  status: 'review_only';
  aggregateScoringEnabled: false;
  rankingOrderAuthorized: false;
  orderingReady: false;
  exchanges: KazakhstanComparisonExchangeId[];
  dimensions: KazakhstanComparisonDimension[];
  cells: KazakhstanComparisonCell[];
  dimensionSummaries: KazakhstanComparisonDimensionSummary[];
}

const dimensions: KazakhstanComparisonDimension[] = [
  'kyc_account_access',
  'kzt_fiat_p2p',
  'product_coverage',
  'fees_limits',
  'conflicts_freshness',
];

const exchanges: KazakhstanComparisonExchangeId[] = ['binance', 'bybit', 'okx'];

const claimsByExchange: Record<KazakhstanComparisonExchangeId, NormalizedClaim[]> = {
  binance: binanceKazakhstanClaims,
  bybit: bybitKazakhstanClaims,
  okx: okxKazakhstanClaims,
};

const profileDates: Record<
  KazakhstanComparisonExchangeId,
  { checkedAt: string; nextReviewAt: string }
> = {
  binance: {
    checkedAt: binanceKazakhstanMarketProfile.lastCheckedAt,
    nextReviewAt: binanceKazakhstanMarketProfile.nextReviewAt,
  },
  bybit: {
    checkedAt: bybitKazakhstanMarketProfile.lastCheckedAt,
    nextReviewAt: bybitKazakhstanMarketProfile.nextReviewAt,
  },
  okx: {
    checkedAt: okxKazakhstanMarketProfile.lastCheckedAt,
    nextReviewAt: okxKazakhstanMarketProfile.nextReviewAt,
  },
};

function cell(
  exchangeId: KazakhstanComparisonExchangeId,
  dimension: KazakhstanComparisonDimension,
  state: KazakhstanComparisonState,
  summary: string,
  evidenceClaimIds: string[],
  limitations: string[],
): KazakhstanComparisonCell {
  return {
    cellId: `matrix:kz:${exchangeId}:${dimension}`,
    exchangeId,
    dimension,
    state,
    summary,
    evidenceClaimIds,
    checkedAt: profileDates[exchangeId].checkedAt,
    nextReviewAt: profileDates[exchangeId].nextReviewAt,
    limitations,
    rankingPosition: null,
    affiliateInfluence: false,
  };
}

export const kazakhstanComparisonCells: KazakhstanComparisonCell[] = [
  cell(
    'binance',
    'kyc_account_access',
    'mapped',
    'Personal identity verification is required and a Kazakhstan registration path is publicly visible.',
    [
      'claim:kz:binance:personal-kyc-required',
      'claim:kz:binance:registration-visible-untested',
    ],
    [
      'No account approval or Kazakhstan-resident document acceptance was tested.',
      'Exact checks can vary by user and compliance review.',
    ],
  ),
  cell(
    'binance',
    'kzt_fiat_p2p',
    'partial',
    'The regulated P2P route and Kazakhstan-localized Freedom Bank/sell surfaces are mapped, but active orders and current direct KZT rails are not confirmed.',
    [
      'claim:kz:binance:licensed-p2p-route',
      'claim:kz:binance:freedom-bank-p2p-surface-visible',
      'claim:kz:binance:localized-p2p-sell-surface-visible',
    ],
    [
      'Route visibility is not proof of an active advertiser or executable order.',
      'Current direct KZT deposit and withdrawal operation remains unconfirmed.',
    ],
  ),
  cell(
    'binance',
    'product_coverage',
    'partial',
    'A Kazakhstan-localized platform surface and regulator licence scope for Future/Option are mapped, but comparable country-level product entitlement is incomplete.',
    [
      'claim:kz:binance:localized-surface-visible',
      'claim:kz:binance:future-option-license-scope',
    ],
    [
      'Licence scope does not prove account-level product entitlement.',
      'Spot, margin, earn and other products are not yet normalized into this comparison layer.',
    ],
  ),
  cell(
    'binance',
    'fees_limits',
    'missing',
    'No sufficiently comparable current Kazakhstan fee-and-limit packet is mapped for the matrix.',
    [],
    [
      'Do not convert missing values to zero.',
      'Historical or global fee schedules cannot be treated as Kazakhstan-specific without normalization.',
    ],
  ),
  cell(
    'binance',
    'conflicts_freshness',
    'partial',
    'No retained material authorization conflict is mapped, but public P2P surface claims have a short review window and material operational gaps remain.',
    [
      'claim:kz:binance:current-license',
      'claim:kz:binance:freedom-bank-p2p-surface-visible',
      'claim:kz:binance:localized-p2p-sell-surface-visible',
    ],
    [
      'P2P surface evidence expires quickly and requires rechecking.',
      'Absence of a retained contradiction is not proof that every operational claim is complete.',
    ],
  ),

  cell(
    'bybit',
    'kyc_account_access',
    'mapped',
    'Bybit Kazakhstan documentation states that at least Standard identity verification is mandatory for all products and services.',
    [
      'claim:kz:bybit:standard-kyc-mandatory',
      'claim:kz:bybit:country-availability',
    ],
    [
      'No specific user approval or document acceptance was tested.',
      'Higher verification levels may apply by product, service or region.',
    ],
  ),
  cell(
    'bybit',
    'kzt_fiat_p2p',
    'mapped',
    'A dated regulated P2P launch signal and published KZT/USDT per-ad range are mapped for Bybit Kazakhstan.',
    [
      'claim:kz:bybit:regulated-p2p-launch-signal',
      'claim:kz:bybit:p2p-kzt-usdt-per-ad-range',
    ],
    [
      'Published limits do not prove a currently active advertisement.',
      'Specific payment methods and account eligibility remain outside this cell.',
    ],
  ),
  cell(
    'bybit',
    'product_coverage',
    'partial',
    'Country availability and P2P service evidence are mapped, but broader comparable product coverage is incomplete.',
    [
      'claim:kz:bybit:country-availability',
      'claim:kz:bybit:regulated-p2p-launch-signal',
    ],
    [
      'Spot, derivatives, earn and other product entitlement are not normalized into comparable cells.',
      'Country availability does not imply every product is enabled.',
    ],
  ),
  cell(
    'bybit',
    'fees_limits',
    'partial',
    'P2P platform fee and a date-bound per-ad KZT range are mapped, while broader comparable trading fees and limits are missing.',
    [
      'claim:kz:bybit:p2p-platform-fee-zero',
      'claim:kz:bybit:p2p-kzt-usdt-per-ad-range',
    ],
    [
      'Payment-provider or bank fees may still apply.',
      'The evidence does not provide a complete cross-product fee schedule.',
    ],
  ),
  cell(
    'bybit',
    'conflicts_freshness',
    'mapped',
    'The current review profile is validated and fresh with no retained material authorization conflict.',
    [
      'claim:kz:bybit:current-license',
      'claim:kz:bybit:country-availability',
    ],
    [
      'The profile still carries offer-eligibility and account-level limitations.',
      'Freshness must be re-evaluated before any future ordering decision.',
    ],
  ),

  cell(
    'okx',
    'kyc_account_access',
    'partial',
    'Registration is jurisdiction-gated, but no Kazakhstan-specific KYC document or account-approval evidence is mapped.',
    ['claim:kz:okx:registration-jurisdiction-gated'],
    [
      'The generic registration article does not explicitly approve Kazakhstan residents.',
      'No account or KYC test was performed.',
    ],
  ),
  cell(
    'okx',
    'kzt_fiat_p2p',
    'conflicting',
    'An official KZT/USDT P2P surface is visible while AFSA states regulated P2P requires a licensed DATF.',
    [
      'claim:kz:okx:kzt-p2p-surface-visible',
      'claim:kz:okx:regulated-p2p-requires-licensed-datf',
      'claim:kz:okx:afsa-warning-unlicensed',
    ],
    [
      'Technical surface visibility does not prove lawful eligibility or active orders.',
      'The local-authorization conflict remains unresolved.',
    ],
  ),
  cell(
    'okx',
    'product_coverage',
    'partial',
    'A KZT P2P product surface is mapped, but broader Kazakhstan-specific product entitlement is not comparable.',
    ['claim:kz:okx:kzt-p2p-surface-visible'],
    [
      'One public surface cannot establish complete product coverage.',
      'The retained authorization conflict limits interpretation of visible products.',
    ],
  ),
  cell(
    'okx',
    'fees_limits',
    'missing',
    'No comparable Kazakhstan-specific fee or limit evidence is mapped into the validated profile.',
    [],
    [
      'Do not infer zero fees or limits from the visible P2P surface.',
      'Global schedules require separate normalization and local-applicability review.',
    ],
  ),
  cell(
    'okx',
    'conflicts_freshness',
    'conflicting',
    'The corrected research remains CONFLICTING / MEDIUM and the profile is conflict-blocked for ranking.',
    [
      'claim:kz:okx:not-listed-as-restricted',
      'claim:kz:okx:afsa-warning-unlicensed',
      'claim:kz:okx:kzt-p2p-surface-visible',
    ],
    [
      'Platform terms and technical reachability conflict with local-authorization evidence.',
      'The profile must remain excluded until a later official change resolves the conflict.',
    ],
  ),
];

function summarizeDimension(
  dimension: KazakhstanComparisonDimension,
): KazakhstanComparisonDimensionSummary {
  const cells = kazakhstanComparisonCells.filter(cell => cell.dimension === dimension);
  const count = (state: KazakhstanComparisonState) =>
    cells.filter(cell => cell.state === state).length;

  return {
    dimension,
    mapped: count('mapped'),
    partial: count('partial'),
    missing: count('missing'),
    conflicting: count('conflicting'),
    comparableForOrdering: cells.every(cell => cell.state === 'mapped'),
  };
}

export const kazakhstanComparativeMatrix: KazakhstanComparativeMatrix = {
  matrixId: 'matrix:kz:ordering-evidence:051h',
  countryCode: 'KZ',
  methodologyVersion: kazakhstanDraftRankingSnapshot.methodologyVersion,
  status: 'review_only',
  aggregateScoringEnabled: false,
  rankingOrderAuthorized: false,
  orderingReady: false,
  exchanges,
  dimensions,
  cells: kazakhstanComparisonCells,
  dimensionSummaries: dimensions.map(summarizeDimension),
};

export const kazakhstanComparativeMatrixIssues: ValidationIssue[] = [];

const allClaims = new Map<string, { exchangeId: string; claim: NormalizedClaim }>();
for (const exchangeId of exchanges) {
  for (const claim of claimsByExchange[exchangeId]) {
    allClaims.set(claim.claimId, { exchangeId, claim });
  }
}

if (kazakhstanComparativeMatrix.cells.length !== exchanges.length * dimensions.length) {
  kazakhstanComparativeMatrixIssues.push({
    path: 'cells',
    code: 'MATRIX_INVENTORY_MISMATCH',
    message: 'The matrix must contain exactly one cell per exchange and dimension.',
  });
}

if (new Set(kazakhstanComparativeMatrix.cells.map(cell => cell.cellId)).size !== kazakhstanComparativeMatrix.cells.length) {
  kazakhstanComparativeMatrixIssues.push({
    path: 'cells',
    code: 'DUPLICATE_CELL_ID',
    message: 'Comparison cell IDs must be unique.',
  });
}

for (const exchangeId of exchanges) {
  for (const dimension of dimensions) {
    const matches = kazakhstanComparativeMatrix.cells.filter(
      cell => cell.exchangeId === exchangeId && cell.dimension === dimension,
    );
    if (matches.length !== 1) {
      kazakhstanComparativeMatrixIssues.push({
        path: `cells.${exchangeId}.${dimension}`,
        code: 'CELL_COVERAGE_MISMATCH',
        message: 'Exactly one comparison cell is required.',
      });
    }
  }
}

for (const matrixCell of kazakhstanComparativeMatrix.cells) {
  if (matrixCell.state === 'missing' && matrixCell.evidenceClaimIds.length !== 0) {
    kazakhstanComparativeMatrixIssues.push({
      path: matrixCell.cellId,
      code: 'MISSING_CELL_HAS_EVIDENCE',
      message: 'A missing cell must not carry evidence claim IDs.',
    });
  }

  if (matrixCell.state !== 'missing' && matrixCell.evidenceClaimIds.length === 0) {
    kazakhstanComparativeMatrixIssues.push({
      path: matrixCell.cellId,
      code: 'EVIDENCE_REQUIRED',
      message: 'Every non-missing comparison cell requires evidence claim IDs.',
    });
  }

  for (const claimId of matrixCell.evidenceClaimIds) {
    const found = allClaims.get(claimId);
    if (!found) {
      kazakhstanComparativeMatrixIssues.push({
        path: matrixCell.cellId,
        code: 'DANGLING_CLAIM_REFERENCE',
        message: `Evidence claim ${claimId} does not exist.`,
      });
    } else if (found.exchangeId !== matrixCell.exchangeId) {
      kazakhstanComparativeMatrixIssues.push({
        path: matrixCell.cellId,
        code: 'CROSS_EXCHANGE_CLAIM_REFERENCE',
        message: `Evidence claim ${claimId} belongs to another exchange.`,
      });
    }
  }

  if (!Number.isFinite(Date.parse(matrixCell.checkedAt)) || !Number.isFinite(Date.parse(matrixCell.nextReviewAt))) {
    kazakhstanComparativeMatrixIssues.push({
      path: matrixCell.cellId,
      code: 'INVALID_FRESHNESS_DATE',
      message: 'Every cell requires valid checked and next-review timestamps.',
    });
  } else if (Date.parse(matrixCell.nextReviewAt) <= Date.parse(matrixCell.checkedAt)) {
    kazakhstanComparativeMatrixIssues.push({
      path: matrixCell.cellId,
      code: 'INVALID_FRESHNESS_WINDOW',
      message: 'The next-review timestamp must be later than checkedAt.',
    });
  }

  if (matrixCell.limitations.length === 0) {
    kazakhstanComparativeMatrixIssues.push({
      path: matrixCell.cellId,
      code: 'LIMITATIONS_REQUIRED',
      message: 'Every comparison cell must state limitations.',
    });
  }

  if (matrixCell.state === 'conflicting') {
    const hasContradictingEvidence = matrixCell.evidenceClaimIds.some(claimId =>
      (allClaims.get(claimId)?.claim.contradictingPacketIds.length ?? 0) > 0,
    );
    if (!hasContradictingEvidence) {
      kazakhstanComparativeMatrixIssues.push({
        path: matrixCell.cellId,
        code: 'CONFLICT_WITHOUT_CONTRADICTION',
        message: 'A conflicting cell requires at least one claim with contradicting evidence.',
      });
    }
  }

  if (matrixCell.rankingPosition !== null || matrixCell.affiliateInfluence !== false) {
    kazakhstanComparativeMatrixIssues.push({
      path: matrixCell.cellId,
      code: 'ORDERING_OR_AFFILIATE_VIOLATION',
      message: 'Comparison cells may not create positions or affiliate influence.',
    });
  }

  if ('score' in matrixCell) {
    kazakhstanComparativeMatrixIssues.push({
      path: matrixCell.cellId,
      code: 'SCORE_FORBIDDEN',
      message: 'Aggregate or per-cell scores are forbidden at this stage.',
    });
  }
}

if (kazakhstanComparativeMatrix.aggregateScoringEnabled !== false) {
  kazakhstanComparativeMatrixIssues.push({
    path: 'aggregateScoringEnabled',
    code: 'AGGREGATE_SCORING_FORBIDDEN',
    message: 'Aggregate scoring must remain disabled.',
  });
}

if (kazakhstanComparativeMatrix.rankingOrderAuthorized !== false) {
  kazakhstanComparativeMatrixIssues.push({
    path: 'rankingOrderAuthorized',
    code: 'RANKING_ORDER_FORBIDDEN',
    message: 'The comparison matrix may not authorize an order.',
  });
}

if (kazakhstanComparativeMatrix.dimensionSummaries.some(summary => summary.comparableForOrdering)) {
  kazakhstanComparativeMatrixIssues.push({
    path: 'dimensionSummaries',
    code: 'PREMATURE_DIMENSION_COMPLETENESS',
    message: 'No dimension is fully comparable across all three exchanges yet.',
  });
}

if (kazakhstanComparativeMatrix.orderingReady !== false) {
  kazakhstanComparativeMatrixIssues.push({
    path: 'orderingReady',
    code: 'PREMATURE_ORDERING_READINESS',
    message: 'Ordering must remain disabled while required cells are partial, missing or conflicting.',
  });
}

if (kazakhstanDraftRankingSnapshot.rows.length !== 0) {
  kazakhstanComparativeMatrixIssues.push({
    path: 'rankingSnapshot.rows',
    code: 'SNAPSHOT_ROWS_CHANGED',
    message: 'The comparative matrix must not populate draft snapshot rows.',
  });
}

export const kazakhstanComparativeMatrixPass =
  kazakhstanComparativeMatrixIssues.length === 0;

export const kazakhstanComparativeMatrixResult = {
  ok: kazakhstanComparativeMatrixPass,
  value: kazakhstanComparativeMatrixPass
    ? kazakhstanComparativeMatrix
    : undefined,
  issues: kazakhstanComparativeMatrixIssues,
};

if (!kazakhstanComparativeMatrixPass) {
  throw new Error(
    `Kazakhstan comparative matrix validation failed: ${kazakhstanComparativeMatrixIssues
      .map(issue => `${issue.code}: ${issue.message}`)
      .join('; ')}`,
  );
}
