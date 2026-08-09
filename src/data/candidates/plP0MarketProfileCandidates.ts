import { createMarketProfileCandidateBundle } from '../contracts/marketProfileCandidateBundle';
import {
  CBW_RESEARCH_REPOSITORY,
  RESEARCH_MARKET_PROFILE_BRIDGE_VERSION,
  type ResearchArtifactBinding,
  type ResearchAuthorizationSnapshot,
  type ResearchBridgeRequest,
  type ResearchMarketProfilePacket,
} from '../contracts/researchToMarketProfileV1Bridge';

export const PL_P0_RESEARCH_SNAPSHOT_SHA = 'cb4ee3e55cfc4e2fb48feefaa7b361d89ea14474' as const;
export const PL_P0_CANDIDATE_BUNDLE_ID = 'CBW-PL-P0-MARKETPROFILE-CANDIDATE-BUNDLE-001' as const;

const ALL_FALSE_AUTHORITIES: ResearchAuthorizationSnapshot = Object.freeze({
  researchImportAuthorized: false,
  stagingImportAuthorized: false,
  canonicalImportAuthorized: false,
  productionChangeAuthorized: false,
  productionBindingAuthorized: false,
  publicationAuthorized: false,
  masterChangeAuthorized: false,
});

function artifactBindings(
  root: string,
  rows: readonly (readonly [string, string])[],
): readonly ResearchArtifactBinding[] {
  return Object.freeze(rows.map(([path, digest]) => Object.freeze({
    path: `${root}/${path}`,
    digest: `sha256:${digest}`,
  })));
}

function requestFor(packet: ResearchMarketProfilePacket): ResearchBridgeRequest {
  return Object.freeze({
    packet,
    expected: Object.freeze({
      repository: CBW_RESEARCH_REPOSITORY,
      sourceCommitSha: PL_P0_RESEARCH_SNAPSHOT_SHA,
      taskId: packet.provenance.taskId,
      exchangeId: packet.provenance.exchangeId,
      countryCode: packet.provenance.countryCode,
      artifactBindings: packet.provenance.artifactBindings,
    }),
  });
}

const BINANCE_ROOT = 'research-ops/tasks/CBW-PL-BINANCE-P0-A-DEEP-RESEARCH-001/20-research-output';
const BINANCE_BINDINGS = artifactBindings(BINANCE_ROOT, [
  ['research-run.json', '61144de108a7cb465f74926fff82903e056d129f7b37197cabfb22034a3226ee'],
  ['source-verification.json', 'ec74914c04eb8553fd91401ded7bf4b2c7e9e7e3255ca326709f9b238609ecfe'],
  ['claim-verdicts.json', 'e983cbd3d7ab03910407696827df1ff70778980ebca292a8cc2db74370026545'],
  ['conflict-resolution.json', '0ee6b2a5567967e3fe2f8f93a6ac516f67047a6d7383f43a2b0034f8aa3f2ebb'],
  ['product-availability.json', '37b8191cffe951ffae5550a2b94ce638c56b3796b3ec94a5e849da231ec7e91a'],
  ['payment-rails.json', '2e5f64542f364fff051c72dd0de9b53cbd9ff0688c5a1c274a73930cbd022970'],
  ['offer-eligibility-review.json', '79ad68616e8f9ea622cb4725c221062716766908ba9e94022973346a19dcb100'],
  ['import-readiness.json', 'e289d613dee88f235efdc1afc36113435b7da628d3e65f67ab840a856cf5f687'],
]);

const binancePacket: ResearchMarketProfilePacket = Object.freeze({
  schemaVersion: RESEARCH_MARKET_PROFILE_BRIDGE_VERSION,
  provenance: Object.freeze({
    repository: CBW_RESEARCH_REPOSITORY,
    sourceBranch: 'main',
    sourceCommitSha: PL_P0_RESEARCH_SNAPSHOT_SHA,
    taskId: 'CBW-PL-BINANCE-P0-A-DEEP-RESEARCH-001',
    exchangeId: 'binance',
    countryCode: 'PL',
    researchState: 'RESEARCH_RECORD_MERGED_TO_MAIN',
    importReadiness: 'CANDIDATE_ONLY_IMPORT_NOT_AUTHORIZED',
    overallRecommendation: 'UNDER_REVIEW',
    confidence: 'medium',
    lastCheckedAt: '2026-08-08T00:00:00Z',
    nextReviewAt: '2026-08-09T00:00:00Z',
    artifactBindings: BINANCE_BINDINGS,
    authorizations: ALL_FALSE_AUTHORITIES,
  }),
  signals: Object.freeze({
    availability: Object.freeze({
      signal: 'under_review',
      claimIds: Object.freeze(['CLM015']),
      limitations: Object.freeze([
        'Current MiCA/CASP authority and Poland-resident onboarding are not independently proven.',
        'Candidate review window is a code-owned 24h normalization from the research checkedDate, not a source fact.',
      ]),
    }),
    regulation: Object.freeze({
      signal: 'under_review',
      legalEntityClaimIds: Object.freeze(['CLM001']),
      licenseClaimIds: Object.freeze(['CLM006']),
      limitations: Object.freeze([
        'Historical Polish VASP registration is not current MiCA CASP authorisation.',
        'The primary ESMA authorised-CASP row was not independently bound in this research run.',
      ]),
    }),
    kyc: Object.freeze({
      signal: 'supported',
      claimIds: Object.freeze(['CLM012', 'CLM013']),
      limitations: Object.freeze(['Platform-level KYC rules do not prove Poland onboarding eligibility.']),
    }),
    deposits: Object.freeze({
      signal: 'unknown',
      claimIds: Object.freeze(['CLM015']),
      limitations: Object.freeze(['No current Poland-specific direct fiat deposit rail was verified in this record.']),
    }),
    withdrawals: Object.freeze({
      signal: 'unknown',
      claimIds: Object.freeze(['CLM015']),
      limitations: Object.freeze(['No current Poland-specific direct fiat withdrawal rail was verified in this record.']),
    }),
    fiatPayments: Object.freeze({
      signal: 'public_visibility_only',
      claimIds: Object.freeze(['CLM009', 'CLM010']),
      limitations: Object.freeze([
        'PLN P2P and Santander Poland pages prove public surfaces only.',
        'They do not prove legal availability, onboarding success, live offers or direct bank rails.',
      ]),
      methods: Object.freeze(['PLN P2P surface', 'Santander Poland P2P payment-method surface']),
    }),
    products: Object.freeze({
      signal: 'public_visibility_only',
      claimIds: Object.freeze(['CLM009', 'CLM011', 'CLM015']),
      limitations: Object.freeze([
        'Spot/P2P public reachability is not resident product eligibility.',
        'Derivatives and Earn were not independently verified for Poland.',
      ]),
    }),
    bonusAvailability: Object.freeze({
      signal: 'under_review',
      claimIds: Object.freeze(['CLM016']),
      limitations: Object.freeze(['CBW global Binance commercial identity is not Poland campaign eligibility evidence.']),
    }),
    restrictions: Object.freeze({
      signal: 'under_review',
      claimIds: Object.freeze(['CLM004', 'CLM006', 'CLM015']),
      limitations: Object.freeze(['Post-transition legal/account eligibility remains unresolved for a Polish resident.']),
    }),
  }),
});

const BYBIT_ROOT = 'research-ops/tasks/CBW-PL-BYBIT-P0-B-DEEP-RESEARCH-002/60-correction/20-corrected-output';
const BYBIT_BINDINGS = artifactBindings(BYBIT_ROOT, [
  ['research-run.json', '41f9c9995488bce68df3bb28d4ca997d563ccb1f298f1ae469b5461b58aa908d'],
  ['source-verification.json', '73a586b715ac38ae271889e00f0fe0b9cc874f1f272e18854aba42331237dabc'],
  ['claim-verdicts.json', 'b9c0f0d1c9961922c71ee7db4805a588c51c70e35923fc8f4cc98d3168a52f7f'],
  ['conflict-resolution.json', 'a1ddcaf57d162577d98fd8a5d9fdd552717a1f98128685050c06b4d33d18d98b'],
  ['product-availability.json', '4298ca222dad92f3d9d9dd3faf6f94ff572eeba397ac8bd5136706208ea595df'],
  ['payment-rails.json', 'f23b540fab644fe11e40f109bb5916b24d903212fadfd5f82ce0694fa5109335'],
  ['offer-eligibility-review.json', '261cce289d3340a29e67ecb7fb4fd070a121021acbfeb0d923dd55674e4f7e00'],
  ['import-readiness.json', '83cf9b9836891b21bd0b52b134e2a57389e20feadb7076c2fcba8f970ec13c61'],
]);

const bybitPacket: ResearchMarketProfilePacket = Object.freeze({
  schemaVersion: RESEARCH_MARKET_PROFILE_BRIDGE_VERSION,
  provenance: Object.freeze({
    repository: CBW_RESEARCH_REPOSITORY,
    sourceBranch: 'main',
    sourceCommitSha: PL_P0_RESEARCH_SNAPSHOT_SHA,
    taskId: 'CBW-PL-BYBIT-P0-B-DEEP-RESEARCH-002',
    exchangeId: 'bybit',
    countryCode: 'PL',
    researchState: 'RESEARCH_RECORD_MERGED_TO_MAIN',
    importReadiness: 'CANDIDATE_READY_IMPORT_NOT_AUTHORIZED',
    overallRecommendation: 'AVAILABLE_WITH_LIMITS',
    confidence: 'high',
    lastCheckedAt: '2026-08-08T00:00:00Z',
    nextReviewAt: '2026-08-09T00:00:00Z',
    artifactBindings: BYBIT_BINDINGS,
    authorizations: ALL_FALSE_AUTHORITIES,
  }),
  signals: Object.freeze({
    availability: Object.freeze({
      signal: 'supported_with_limits',
      claimIds: Object.freeze(['CLM003', 'CLM004', 'CLM007', 'CLM009']),
      limitations: Object.freeze([
        'Core MiCAR-authorised services have Poland-facing evidence, but actual service/product availability remains conditional.',
        'Candidate review window is a code-owned 24h normalization from the research checkedDate, not a source fact.',
      ]),
    }),
    regulation: Object.freeze({
      signal: 'licensed',
      legalEntityClaimIds: Object.freeze(['CLM001']),
      licenseClaimIds: Object.freeze(['CLM001', 'CLM002']),
      limitations: Object.freeze(['MiCAR authorisation scope must not be generalized to separately gated or unregulated products.']),
    }),
    kyc: Object.freeze({
      signal: 'supported',
      claimIds: Object.freeze(['CLM005']),
      limitations: Object.freeze(['Standard Identity Verification is mandatory; account/compliance restrictions may still apply.']),
    }),
    deposits: Object.freeze({
      signal: 'supported_with_limits',
      claimIds: Object.freeze(['CLM007']),
      limitations: Object.freeze(['PLN/BLIK deposit support remains subject to account, regulatory and maintenance conditions.']),
    }),
    withdrawals: Object.freeze({
      signal: 'under_review',
      claimIds: Object.freeze(['CLM010', 'CLM011']),
      limitations: Object.freeze(['Fiat withdrawal exists generally, but current PLN withdrawal was not independently confirmed.']),
    }),
    fiatPayments: Object.freeze({
      signal: 'supported_with_limits',
      claimIds: Object.freeze(['CLM007', 'CLM009']),
      limitations: Object.freeze(['Only current PLN/BLIK deposit support is treated as a supported local fiat rail in this candidate.']),
      methods: Object.freeze(['BLIK (PLN deposit)']),
    }),
    products: Object.freeze({
      signal: 'supported_with_limits',
      claimIds: Object.freeze(['CLM002', 'CLM003', 'CLM004', 'CLM009', 'CLM013', 'CLM017']),
      limitations: Object.freeze([
        'Core exchange/spot services have support with limits.',
        'Earn, Card and derivatives retain separate country/product eligibility constraints.',
      ]),
    }),
    bonusAvailability: Object.freeze({
      signal: 'under_review',
      claimIds: Object.freeze(['CLM014', 'CLM016', 'CLM018']),
      limitations: Object.freeze(['Current Bybit EU Poland referral eligibility and CBW code binding are not established.']),
    }),
    restrictions: Object.freeze({
      signal: 'under_review',
      claimIds: Object.freeze(['CLM004', 'CLM013', 'CLM017']),
      limitations: Object.freeze(['Country/product-specific restrictions remain material and must be reviewed before any commercial authority.']),
    }),
  }),
});

const OKX_ROOT = 'research-ops/tasks/CBW-PL-OKX-P0-C-DEEP-RESEARCH-003/60-correction/20-corrected-output';
const OKX_BINDINGS = artifactBindings(OKX_ROOT, [
  ['research-run.json', '459c11e07ede1a09f6b95c550ea21dc563fadda72e8a40eaa4163954dd5719e3'],
  ['source-verification.json', '0bec6cb7fd1b60739ca018897f2747aa63d59c63ae1fbe8d613f53875bb827f8'],
  ['claim-verdicts.json', '1518db374895bfbd11976e83cd992b8fda69dc7e72c12623f7e66b9973c20d33'],
  ['conflict-resolution.json', '65bcf4a33e4fbbdb8cb2f2003a57eabadc8b3f928c3e4ffd5f040f8ff090867e'],
  ['product-availability.json', 'bd4bef275f828c80ad545ca925aa22f3bdfddbe6b0540678566cd61555d9f209'],
  ['payment-rails.json', 'f5b71e7c32c06e6488b9974ac26c9c7ad445a7bcea1a6990236e5765f34a64df'],
  ['offer-eligibility-review.json', '87df3a3f162732ccf3fb3d92b7a4b30a3b7d17805626f3fc70c742a4de384675'],
  ['import-readiness.json', '54f9d5072e05c8ac092c8c60ebb1a09fda9fc7c7bb81dc986bdc524d82431966'],
]);

const okxPacket: ResearchMarketProfilePacket = Object.freeze({
  schemaVersion: RESEARCH_MARKET_PROFILE_BRIDGE_VERSION,
  provenance: Object.freeze({
    repository: CBW_RESEARCH_REPOSITORY,
    sourceBranch: 'main',
    sourceCommitSha: PL_P0_RESEARCH_SNAPSHOT_SHA,
    taskId: 'CBW-PL-OKX-P0-C-DEEP-RESEARCH-003',
    exchangeId: 'okx',
    countryCode: 'PL',
    researchState: 'RESEARCH_RECORD_MERGED_TO_MAIN',
    importReadiness: 'CANDIDATE_READY_IMPORT_NOT_AUTHORIZED',
    overallRecommendation: 'AVAILABLE_WITH_LIMITS',
    confidence: 'high',
    lastCheckedAt: '2026-08-09T00:00:00Z',
    nextReviewAt: '2026-08-10T00:00:00Z',
    artifactBindings: OKX_BINDINGS,
    authorizations: ALL_FALSE_AUTHORITIES,
  }),
  signals: Object.freeze({
    availability: Object.freeze({
      signal: 'supported_with_limits',
      claimIds: Object.freeze(['CLM001', 'CLM004', 'CLM005', 'CLM007']),
      limitations: Object.freeze([
        'Core Poland service evidence is positive but remains subject to account, product and regional eligibility conditions.',
        'Candidate review window is a code-owned 24h normalization from the research checkedDate, not a source fact.',
      ]),
    }),
    regulation: Object.freeze({
      signal: 'under_review',
      legalEntityClaimIds: Object.freeze(['CLM006', 'CLM014']),
      licenseClaimIds: Object.freeze([]),
      limitations: Object.freeze([
        'KNF payment-services and investment-firm notifications are separate regimes and are not promoted into a CASP licence claim.',
        'This candidate preserves the source package separation instead of inventing a stronger regulation state.',
      ]),
    }),
    kyc: Object.freeze({
      signal: 'supported',
      claimIds: Object.freeze(['CLM008']),
      limitations: Object.freeze(['Identity verification is mandatory and account/compliance restrictions may apply.']),
    }),
    deposits: Object.freeze({
      signal: 'supported_with_limits',
      claimIds: Object.freeze(['CLM011']),
      limitations: Object.freeze(['EUR SEPA deposit is supported with EEA/account/regulatory conditions.']),
    }),
    withdrawals: Object.freeze({
      signal: 'supported_with_limits',
      claimIds: Object.freeze(['CLM012']),
      limitations: Object.freeze(['EUR SEPA withdrawal is supported with EEA/account/regulatory conditions.']),
    }),
    fiatPayments: Object.freeze({
      signal: 'supported_with_limits',
      claimIds: Object.freeze(['CLM009', 'CLM011', 'CLM012', 'CLM013']),
      limitations: Object.freeze([
        'PLN P2P is distinct from direct PLN bank rails.',
        'Direct PLN bank deposit/withdrawal remains unverified.',
      ]),
      methods: Object.freeze(['PLN P2P', 'EUR SEPA deposit', 'EUR SEPA withdrawal']),
    }),
    products: Object.freeze({
      signal: 'supported_with_limits',
      claimIds: Object.freeze(['CLM002', 'CLM005', 'CLM016']),
      limitations: Object.freeze([
        'Core exchange/spot/staking services have Poland evidence with limits.',
        'The investment-product layer is a separate regime and remains account/appropriateness dependent.',
      ]),
    }),
    bonusAvailability: Object.freeze({
      signal: 'under_review',
      claimIds: Object.freeze(['CLM017', 'CLM018', 'CLM019']),
      limitations: Object.freeze(['Current Poland referral reward and exact CBW referral binding remain unconfirmed.']),
    }),
    restrictions: Object.freeze({
      signal: 'under_review',
      claimIds: Object.freeze(['CLM007', 'CLM010', 'CLM016']),
      limitations: Object.freeze(['Account, P2P, product and appropriateness restrictions remain material at candidate stage.']),
    }),
  }),
});

export const PL_P0_RESEARCH_REQUESTS: readonly ResearchBridgeRequest[] = Object.freeze([
  requestFor(binancePacket),
  requestFor(bybitPacket),
  requestFor(okxPacket),
]);

export const PL_P0_MARKET_PROFILE_CANDIDATE_BUNDLE = createMarketProfileCandidateBundle({
  bundleId: PL_P0_CANDIDATE_BUNDLE_ID,
  researchSnapshotSha: PL_P0_RESEARCH_SNAPSHOT_SHA,
  countryCode: 'PL',
  requests: PL_P0_RESEARCH_REQUESTS,
});
