export type ReviewTone =
  | 'verified'
  | 'partial'
  | 'review'
  | 'restricted'
  | 'missing'
  | 'stale';

export interface ReviewStatusModel {
  label: string;
  detail?: string;
  tone: ReviewTone;
  compact?: boolean;
}

export const reviewToneLabels: Record<ReviewTone, string> = {
  verified: 'Verified',
  partial: 'Partially checked',
  review: 'Under review',
  restricted: 'Restricted',
  missing: 'Insufficient evidence',
  stale: 'Recheck required',
};

export function assertReviewStatusModel(input: ReviewStatusModel): ReviewStatusModel {
  if (!input.label.trim()) throw new Error('Review status label is required.');
  if (input.detail !== undefined && !input.detail.trim()) {
    throw new Error('Review status detail cannot be an empty string.');
  }
  if (!(input.tone in reviewToneLabels)) {
    throw new Error(`Unknown review status tone: ${String(input.tone)}`);
  }
  return input;
}
