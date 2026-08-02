import {
  validateRankingSnapshot,
  type RankingSnapshot,
  type ValidationIssue,
} from '../../contracts/portalFactory';
import {
  kazakhstanEligibilityDecisions,
  kazakhstanMethodologyPass,
  kazakhstanMethodologyProposal,
} from './methodologyProposal';

export const kazakhstanDraftRankingSnapshot: RankingSnapshot = {
  snapshotId: 'ranking:kz:owner-review-draft:2026-07-31',
  countryCode: 'KZ',
  methodologyVersion: kazakhstanMethodologyProposal.version,
  rows: [],
  excludedExchangeIds: ['okx'],
  underReviewExchangeIds: ['binance', 'bybit'],
  evidenceCheckedAt: '2026-07-31T16:35:00Z',
  approval: 'draft',
};

export const kazakhstanDraftRankingSnapshotIssues: ValidationIssue[] = [];

const contractResult = validateRankingSnapshot(kazakhstanDraftRankingSnapshot);

if (!contractResult.ok) {
  kazakhstanDraftRankingSnapshotIssues.push(...contractResult.issues);
}

if (!kazakhstanMethodologyPass) {
  kazakhstanDraftRankingSnapshotIssues.push({
    path: 'methodologyVersion',
    code: 'METHODOLOGY_NOT_VALIDATED',
    message: 'The frozen Kazakhstan methodology must validate before a draft snapshot is assembled.',
  });
}

if (kazakhstanMethodologyProposal.status !== 'frozen_for_draft_snapshot') {
  kazakhstanDraftRankingSnapshotIssues.push({
    path: 'methodologyVersion',
    code: 'METHODOLOGY_NOT_FROZEN',
    message: 'Draft snapshot requires a methodology frozen for draft-snapshot use.',
  });
}

if (kazakhstanMethodologyProposal.rankingOrderAuthorized !== false) {
  kazakhstanDraftRankingSnapshotIssues.push({
    path: 'rows',
    code: 'ORDER_AUTHORIZATION_VIOLATION',
    message: 'Ranking order must remain unauthorized.',
  });
}

if (kazakhstanDraftRankingSnapshot.rows.length !== 0) {
  kazakhstanDraftRankingSnapshotIssues.push({
    path: 'rows',
    code: 'DRAFT_ROWS_NOT_EMPTY',
    message: 'The owner-review draft snapshot must not contain ranked rows.',
  });
}

if ('approvedBy' in kazakhstanDraftRankingSnapshot) {
  kazakhstanDraftRankingSnapshotIssues.push({
    path: 'approvedBy',
    code: 'DRAFT_APPROVER_FORBIDDEN',
    message: 'A non-approved draft snapshot must not carry an approver.',
  });
}

if (JSON.stringify(kazakhstanDraftRankingSnapshot.excludedExchangeIds) !== JSON.stringify(['okx'])) {
  kazakhstanDraftRankingSnapshotIssues.push({
    path: 'excludedExchangeIds',
    code: 'EXCLUSION_SET_MISMATCH',
    message: 'OKX must remain the only excluded exchange in this draft snapshot.',
  });
}

if (JSON.stringify(kazakhstanDraftRankingSnapshot.underReviewExchangeIds) !== JSON.stringify(['binance', 'bybit'])) {
  kazakhstanDraftRankingSnapshotIssues.push({
    path: 'underReviewExchangeIds',
    code: 'UNDER_REVIEW_SET_MISMATCH',
    message: 'Binance and Bybit must remain under review without positions.',
  });
}

const decisionByExchange = Object.fromEntries(
  kazakhstanEligibilityDecisions.map(decision => [decision.exchangeId, decision]),
);

if (decisionByExchange.okx?.state !== 'excluded') {
  kazakhstanDraftRankingSnapshotIssues.push({
    path: 'excludedExchangeIds',
    code: 'OKX_DECISION_MISMATCH',
    message: 'OKX eligibility decision must remain excluded.',
  });
}

for (const exchangeId of ['binance', 'bybit'] as const) {
  const decision = decisionByExchange[exchangeId];
  if (decision?.state !== 'under_review' || decision.rankingPosition !== null) {
    kazakhstanDraftRankingSnapshotIssues.push({
      path: 'underReviewExchangeIds',
      code: 'CANDIDATE_DECISION_MISMATCH',
      message: `${exchangeId} must remain under review with a null ranking position.`,
    });
  }
  if (decision?.affiliateInfluence !== false) {
    kazakhstanDraftRankingSnapshotIssues.push({
      path: 'underReviewExchangeIds',
      code: 'AFFILIATE_INFLUENCE_VIOLATION',
      message: `${exchangeId} draft eligibility must have zero affiliate influence.`,
    });
  }
}

export const kazakhstanDraftRankingSnapshotPass =
  kazakhstanDraftRankingSnapshotIssues.length === 0;

export const kazakhstanDraftRankingSnapshotResult = {
  ok: kazakhstanDraftRankingSnapshotPass,
  value: kazakhstanDraftRankingSnapshotPass
    ? kazakhstanDraftRankingSnapshot
    : undefined,
  issues: kazakhstanDraftRankingSnapshotIssues,
};

if (!kazakhstanDraftRankingSnapshotPass) {
  throw new Error(
    `Kazakhstan draft RankingSnapshot validation failed: ${kazakhstanDraftRankingSnapshotIssues
      .map(issue => `${issue.code}: ${issue.message}`)
      .join('; ')}`,
  );
}
