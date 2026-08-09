import { buildCountryMarketProfileV1Candidate, type ResearchBridgeRequest } from '../contracts/researchToMarketProfileV1Bridge';
import {
  LEGACY_GOVERNED_CANDIDATE_ADAPTER_VERSION,
  buildLegacyGovernedMarketProfileV1Candidate,
  type LegacyGovernedCandidateRequest,
} from '../contracts/legacyGovernedMarketProfileCandidate';

export const KZ_P0_CANDIDATE_SET_ID = 'CBW-KZ-P0-MIXED-PROVENANCE-MARKETPROFILE-CANDIDATES-001' as const;
export const KZ_RESEARCH_SNAPSHOT_SHA = 'cb4ee3e55cfc4e2fb48feefaa7b361d89ea14474' as const;
export const KZ_BYBIT_PORTAL_REVIEW_SHA = '41d7b5a59b6b08f521e9fe79a9f71753d5d7a361' as const;

const ALL_FALSE = Object.freeze({
  researchImportAuthorized: false,
  stagingImportAuthorized: false,
  canonicalImportAuthorized: false,
  productionChangeAuthorized: false,
  productionBindingAuthorized: false,
  publicationAuthorized: false,
  masterChangeAuthorized: false,
});

const binanceRoot = 'research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001/60-correction/20-corrected-output';
const binanceBindings = Object.freeze([
  { path: `${binanceRoot}/research-run.json`, digest: 'sha256:7cdef7ba393488858cc00bfdbdcab469d102b7a4d54a36c67829af9fd9e35963' },
  { path: `${binanceRoot}/source-verification.json`, digest: 'sha256:d32cbfc2049beb22cf101bcad9a68ca8fd876816136042ed853336592967dfdd' },
  { path: `${binanceRoot}/claim-verdicts.json`, digest: 'sha256:005a6c1f19d6c47e8bc8cf6cd38f30f8d9fbc3927b8ceccd000d31ccdba977c1' },
  { path: `${binanceRoot}/conflict-resolution.json`, digest: 'sha256:5777895350cb0140c0175d542e5ae17d5470840952d17e07cc357f31a3650ab1' },
  { path: `${binanceRoot}/product-availability.json`, digest: 'sha256:4efbef4799f536495fee9c796c24a0c4a82c514b19e80f7fac6985ac0323cf4b' },
  { path: `${binanceRoot}/payment-rails.json`, digest: 'sha256:abd185e9a7abb24964aa5da6bbd46c053fb3485c9e8e5de5a3cddcfed1fd2fe8' },
  { path: `${binanceRoot}/offer-eligibility-review.json`, digest: 'sha256:3b3e1b75811708cad4649a07e8acf6a55599932fbf4f9d3e55867fe931dea21d' },
  { path: `${binanceRoot}/import-readiness.json`, digest: 'sha256:ca0fe064d24a607c9b2af61837f5fd2fdda17ed57c8705c200f231720cd795eb' },
]);

export const KZ_BINANCE_MODERN_REQUEST: ResearchBridgeRequest = Object.freeze({
  expected: Object.freeze({
    repository: 'ros190392-source/cryptobonusworld',
    sourceCommitSha: KZ_RESEARCH_SNAPSHOT_SHA,
    taskId: 'CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001',
    exchangeId: 'binance',
    countryCode: 'KZ',
    artifactBindings: binanceBindings,
  }),
  packet: Object.freeze({
    schemaVersion: 1,
    provenance: Object.freeze({
      repository: 'ros190392-source/cryptobonusworld',
      sourceBranch: 'main',
      sourceCommitSha: KZ_RESEARCH_SNAPSHOT_SHA,
      taskId: 'CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001',
      exchangeId: 'binance',
      countryCode: 'KZ',
      researchState: 'RESEARCH_RECORD_MERGED_TO_MAIN',
      importReadiness: 'RESEARCH_RECORD_MERGED_CANDIDATE_ONLY_IMPORT_NOT_AUTHORIZED',
      overallRecommendation: 'AVAILABLE_WITH_LIMITS',
      confidence: 'high',
      lastCheckedAt: '2026-07-29T00:00:00Z',
      nextReviewAt: '2026-07-30T00:00:00Z',
      artifactBindings: binanceBindings,
      authorizations: ALL_FALSE,
    }),
    signals: Object.freeze({
      availability: Object.freeze({
        signal: 'supported_with_limits',
        claimIds: Object.freeze(['CLM011', 'CLM017', 'CLM024']),
        limitations: Object.freeze([
          'AFSA licence and Kazakhstan-facing surfaces are positive, but account-level eligibility and current rail availability were not tested.',
          'The materialized candidate is historical research state and requires freshness review before any later promotion review.',
        ]),
      }),
      regulation: Object.freeze({
        signal: 'licensed',
        legalEntityClaimIds: Object.freeze(['CLM011']),
        licenseClaimIds: Object.freeze(['CLM011', 'CLM012', 'CLM029']),
        limitations: Object.freeze(['AFSA licence scope is activity-specific and does not imply universal account/product eligibility.']),
      }),
      kyc: Object.freeze({
        signal: 'supported',
        claimIds: Object.freeze(['CLM018', 'CLM019', 'CLM020']),
        limitations: Object.freeze(['Public KYC flows do not prove approval for a particular Kazakhstan resident.']),
      }),
      deposits: Object.freeze({
        signal: 'current_operational_availability_not_independently_confirmed',
        claimIds: Object.freeze(['CLM021', 'CLM022']),
        limitations: Object.freeze(['Freedom Bank KZT deposit guidance exists historically; current live operational availability was not independently confirmed.']),
      }),
      withdrawals: Object.freeze({
        signal: 'current_operational_availability_not_independently_confirmed',
        claimIds: Object.freeze(['CLM022', 'CLM023']),
        limitations: Object.freeze(['Freedom Bank/Mastercard KZT withdrawal guidance exists historically; current live availability was not independently confirmed.']),
      }),
      fiatPayments: Object.freeze({
        signal: 'supported_with_limits',
        claimIds: Object.freeze(['CLM024', 'CLM025', 'CLM021', 'CLM022', 'CLM023']),
        limitations: Object.freeze([
          'KZT P2P marketplace visibility plus an AFSA regulated route support a limited fiat/P2P posture.',
          'Named Halyk/Home Credit/Freedom method pages are surface-only; direct Freedom/Mastercard rails are current-status-unconfirmed.',
        ]),
        methods: Object.freeze(['KZT P2P escrow marketplace']),
      }),
      products: Object.freeze({
        signal: 'supported_with_limits',
        claimIds: Object.freeze(['CLM028', 'CLM029', 'CLM030', 'CLM032', 'CLM033', 'CLM034', 'CLM035']),
        limitations: Object.freeze(['AFSA explicitly lists Future/Option and public product surfaces exist, but account eligibility and several snippet-only product signals remain conditional.']),
      }),
      bonusAvailability: Object.freeze({
        signal: 'under_review',
        claimIds: Object.freeze(['CLM040', 'CLM041', 'CLM042', 'CLM043']),
        limitations: Object.freeze(['Public referral terms are dynamic and do not prove Kazakhstan or CryptoBonusWorld campaign eligibility.']),
      }),
      restrictions: Object.freeze({
        signal: 'under_review',
        claimIds: Object.freeze(['CLM017', 'CLM029', 'CLM030', 'CLM037', 'CLM038']),
        limitations: Object.freeze(['Account, product, asset and campaign restrictions remain material and were not exhaustively tested.']),
      }),
    }),
  }),
});

const bybitBindings = Object.freeze([
  { path: 'src/data/pilots/kz/bybitReview.ts', digest: 'gitblob:7f5f7680ad83bcaf583d45ac0a5d029ccea90938' },
  { path: 'src/data/pilots/kz/evidence/2026-07-31-source-map.json', digest: 'gitblob:982143cbe1bb8967fbbed4cfeb1b9565d49e6b1d' },
]);

export const KZ_BYBIT_LEGACY_REQUEST: LegacyGovernedCandidateRequest = Object.freeze({
  expected: Object.freeze({
    repository: 'ros190392-source/cryptobonusworld',
    governanceKind: 'portal_review_master',
    sourceCommitSha: KZ_BYBIT_PORTAL_REVIEW_SHA,
    taskId: 'CBW-052C',
    exchangeId: 'bybit',
    countryCode: 'KZ',
    artifactBindings: bybitBindings,
  }),
  packet: Object.freeze({
    schemaVersion: LEGACY_GOVERNED_CANDIDATE_ADAPTER_VERSION,
    provenance: Object.freeze({
      repository: 'ros190392-source/cryptobonusworld',
      governanceKind: 'portal_review_master',
      sourceBranch: 'master',
      sourceCommitSha: KZ_BYBIT_PORTAL_REVIEW_SHA,
      taskId: 'CBW-052C',
      exchangeId: 'bybit',
      countryCode: 'KZ',
      lifecycleState: 'MERGED_PORTAL_REVIEW_PR_191',
      importReadiness: 'LEGACY_REVIEW_CANDIDATE_ONLY_NO_IMPORT_AUTHORITY',
      overallRecommendation: 'UNDER_REVIEW_STALE_COUNTRY_AVAILABILITY',
      confidence: 'high',
      lastCheckedAt: '2026-07-31T15:50:00Z',
      nextReviewAt: '2026-08-31T15:50:00Z',
      artifactBindings: bybitBindings,
    }),
    signals: Object.freeze({
      availability: Object.freeze({
        signal: 'under_review',
        claimIds: Object.freeze(['claim:kz:bybit:country-availability']),
        limitations: Object.freeze([
          'The governed country-availability claim expired on 2026-08-03 and is not carried forward as current availability.',
          'No fresh account creation or product-entitlement test exists.',
        ]),
      }),
      regulation: Object.freeze({
        signal: 'licensed',
        legalEntityClaimIds: Object.freeze(['claim:kz:bybit:current-license']),
        licenseClaimIds: Object.freeze(['claim:kz:bybit:current-license']),
        limitations: Object.freeze(['AFSA licence evidence must be freshly rechecked before any public publication; licence does not prove universal service eligibility.']),
      }),
      kyc: Object.freeze({
        signal: 'supported',
        claimIds: Object.freeze(['claim:kz:bybit:standard-kyc-mandatory']),
        limitations: Object.freeze(['Standard KYC is documented; no specific user verification or document acceptance was tested.']),
      }),
      deposits: Object.freeze({
        signal: 'unknown',
        claimIds: Object.freeze(['claim:kz:bybit:country-availability']),
        limitations: Object.freeze(['The governed legacy review contains no current direct KZT deposit rail proof.']),
      }),
      withdrawals: Object.freeze({
        signal: 'unknown',
        claimIds: Object.freeze(['claim:kz:bybit:country-availability']),
        limitations: Object.freeze(['The governed legacy review contains no current direct KZT withdrawal rail proof.']),
      }),
      fiatPayments: Object.freeze({
        signal: 'public_visibility_only',
        claimIds: Object.freeze(['claim:kz:bybit:p2p-platform-fee-zero', 'claim:kz:bybit:p2p-kzt-usdt-per-ad-range', 'claim:kz:bybit:regulated-p2p-launch-signal']),
        limitations: Object.freeze(['Dated P2P fee/range/launch evidence does not prove a current active advertisement or universal resident eligibility.']),
        methods: Object.freeze(['KZT P2P']),
      }),
      products: Object.freeze({
        signal: 'under_review',
        claimIds: Object.freeze(['claim:kz:bybit:country-availability', 'claim:kz:bybit:regulated-p2p-launch-signal']),
        limitations: Object.freeze(['Legacy review did not establish a current product-by-product entitlement matrix.']),
      }),
      bonusAvailability: Object.freeze({
        signal: 'under_review',
        claimIds: Object.freeze(['claim:kz:bybit:global-offer-kz-confirmed']),
        limitations: Object.freeze(['The tracked global welcome package is explicitly not confirmed for Kazakhstan users.']),
      }),
      restrictions: Object.freeze({
        signal: 'under_review',
        claimIds: Object.freeze(['claim:kz:bybit:country-availability', 'claim:kz:bybit:global-offer-kz-confirmed']),
        limitations: Object.freeze(['Fresh country/account/product restrictions require re-verification.']),
      }),
    }),
  }),
});

const okxRoot = 'research-ops-pilot/tasks/CBW-KZ-OKX-P0-C-DEEP-RESEARCH-003-HANDOFF-V1/60-correction-v2/20-corrected-output';
const okxBindings = Object.freeze([
  { path: `${okxRoot}/research-run.json`, digest: 'sha256:cbbb43113e7263cb0c16e47bf41842082bb2a1b3de5a16a74f9a975cc446b4e4' },
  { path: `${okxRoot}/source-verification.json`, digest: 'sha256:6c2795b17ff9b7178a6083736c4f56d7fa12828761f660bac479cf984d526930' },
  { path: `${okxRoot}/claim-verdicts.json`, digest: 'sha256:4eaace4051d4e60e92ff592fe5cc646495140da9b6f7f934927c4098a333e390' },
  { path: `${okxRoot}/conflict-resolution.json`, digest: 'sha256:b4699c0a28c3618846c1b8eddd896ba0d3bee9e24db4914f3eae66076ea80759' },
  { path: `${okxRoot}/product-availability.json`, digest: 'sha256:13c25a8054f9d51beb6b2320667f0d6e37b9a0e25e56980523e7b15e9667335a' },
  { path: `${okxRoot}/payment-rails.json`, digest: 'sha256:95935e02e5d9e1ee488ca5b77690585415ae0f1c98cdd3bc6f0f890a25a76feb' },
  { path: `${okxRoot}/offer-eligibility-review.json`, digest: 'sha256:3bf5afaa2cbbca278dc89aa1919fcd4b737c7e7fa75f259aa93b5658f8b4b43c' },
  { path: `${okxRoot}/import-readiness.json`, digest: 'sha256:81e5211ec4176f7ed3c3c67294ba18f46863152cd038cd39e8fd453658a49d7f' },
]);

export const KZ_OKX_LEGACY_REQUEST: LegacyGovernedCandidateRequest = Object.freeze({
  expected: Object.freeze({
    repository: 'ros190392-source/cryptobonusworld',
    governanceKind: 'research_pilot_main',
    sourceCommitSha: KZ_RESEARCH_SNAPSHOT_SHA,
    taskId: 'CBW-KZ-OKX-P0-C-DEEP-RESEARCH-003-HANDOFF-V1',
    exchangeId: 'okx',
    countryCode: 'KZ',
    artifactBindings: okxBindings,
  }),
  packet: Object.freeze({
    schemaVersion: LEGACY_GOVERNED_CANDIDATE_ADAPTER_VERSION,
    provenance: Object.freeze({
      repository: 'ros190392-source/cryptobonusworld',
      governanceKind: 'research_pilot_main',
      sourceBranch: 'main',
      sourceCommitSha: KZ_RESEARCH_SNAPSHOT_SHA,
      taskId: 'CBW-KZ-OKX-P0-C-DEEP-RESEARCH-003-HANDOFF-V1',
      exchangeId: 'okx',
      countryCode: 'KZ',
      lifecycleState: 'SOURCE_FILES_PUBLISHED_WITH_CORRECTED_V2_VALIDATION_ARTIFACT',
      importReadiness: 'BLOCKED',
      overallRecommendation: 'CONFLICTING',
      confidence: 'medium',
      lastCheckedAt: '2026-07-25T00:00:00Z',
      nextReviewAt: '2026-07-26T00:00:00Z',
      artifactBindings: okxBindings,
    }),
    signals: Object.freeze({
      availability: Object.freeze({
        signal: 'conflicting',
        claimIds: Object.freeze(['clm-kz-not-in-restricted-list', 'clm-kz-app-listed', 'clm-kz-kzt-p2p-live', 'clm-kz-afsa-warning']),
        limitations: Object.freeze(['Current platform/KZT P2P signals conflict with local AFSA authorization evidence.']),
      }),
      regulation: Object.freeze({
        signal: 'conflicting',
        legalEntityClaimIds: Object.freeze(['clm-kz-aux-cayes-fallback']),
        licenseClaimIds: Object.freeze(['clm-kz-afsa-warning', 'clm-kz-afsa-licensed-datf-only-for-p2p', 'clm-kz-reviewed-register-pages-no-obvious-okx']),
        limitations: Object.freeze(['AFSA warning names OKX as unlicensed; reviewed register-page observation is not a definitive negative register search.']),
      }),
      kyc: Object.freeze({
        signal: 'under_review',
        claimIds: Object.freeze(['clm-kz-kyc-generic-only']),
        limitations: Object.freeze(['Generic KYC documentation does not prove Kazakhstan-specific document acceptance.']),
      }),
      deposits: Object.freeze({
        signal: 'unknown',
        claimIds: Object.freeze(['clm-kz-registration-residence-based']),
        limitations: Object.freeze(['No lawful/current Kazakhstan direct fiat deposit rail is established by the corrected pilot.']),
      }),
      withdrawals: Object.freeze({
        signal: 'unknown',
        claimIds: Object.freeze(['clm-kz-registration-residence-based']),
        limitations: Object.freeze(['No lawful/current Kazakhstan direct fiat withdrawal rail is established by the corrected pilot.']),
      }),
      fiatPayments: Object.freeze({
        signal: 'public_visibility_only',
        claimIds: Object.freeze(['clm-kz-kzt-p2p-live', 'clm-kz-afsa-licensed-datf-only-for-p2p']),
        limitations: Object.freeze(['A KZT P2P surface exists, but lawful Kazakhstan-facing eligibility remains conflicting.']),
        methods: Object.freeze(['KZT P2P surface']),
      }),
      products: Object.freeze({
        signal: 'public_visibility_only',
        claimIds: Object.freeze(['clm-kz-app-listed', 'clm-kz-kzt-p2p-live']),
        limitations: Object.freeze(['App/product visibility cannot override the authorization conflict.']),
      }),
      bonusAvailability: Object.freeze({
        signal: 'under_review',
        claimIds: Object.freeze(['clm-kz-referral-affiliate-separate']),
        limitations: Object.freeze(['No Kazakhstan-specific referral reward entitlement was established.']),
      }),
      restrictions: Object.freeze({
        signal: 'conflicting',
        claimIds: Object.freeze(['clm-kz-afsa-warning', 'clm-kz-afsa-licensed-datf-only-for-p2p', 'clm-kz-kzt-p2p-live']),
        limitations: Object.freeze(['Local authorization conflict is controlling and blocks candidate profile materialization.']),
      }),
    }),
  }),
});

export const KZ_BINANCE_CANDIDATE = buildCountryMarketProfileV1Candidate(KZ_BINANCE_MODERN_REQUEST);
export const KZ_BYBIT_CANDIDATE = buildLegacyGovernedMarketProfileV1Candidate(KZ_BYBIT_LEGACY_REQUEST);
export const KZ_OKX_CANDIDATE = buildLegacyGovernedMarketProfileV1Candidate(KZ_OKX_LEGACY_REQUEST);

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(',')}}`;
}
function fnv1a64(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const byte of new TextEncoder().encode(input)) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

const setWithoutDigest = Object.freeze({
  schemaVersion: 1 as const,
  setId: KZ_P0_CANDIDATE_SET_ID,
  entries: Object.freeze([
    Object.freeze({ exchangeId: 'binance' as const, countryCode: 'KZ' as const, provenanceClass: 'modern_research_main' as const, candidate: KZ_BINANCE_CANDIDATE }),
    Object.freeze({ exchangeId: 'bybit' as const, countryCode: 'KZ' as const, provenanceClass: 'legacy_portal_review_master' as const, candidate: KZ_BYBIT_CANDIDATE }),
    Object.freeze({ exchangeId: 'okx' as const, countryCode: 'KZ' as const, provenanceClass: 'legacy_research_pilot_main' as const, candidate: KZ_OKX_CANDIDATE }),
  ]),
});

export const KZ_P0_MARKET_PROFILE_CANDIDATE_SET = Object.freeze({
  ...setWithoutDigest,
  setDigest: `fnv1a64:${fnv1a64(canonicalize(setWithoutDigest))}`,
});
