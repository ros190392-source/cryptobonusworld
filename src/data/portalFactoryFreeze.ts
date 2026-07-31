import type { ValidationIssue } from './contracts/portalFactory';
import { kazakhstanDraftRankingSnapshot } from './pilots/kz/rankingSnapshotDraft';
import { kazakhstanComparativeMatrix } from './pilots/kz/comparativeMatrix';
import { kazakhstanReviewContentPackages } from './pilots/kz/contentPackages';

export type PortalFreezeRouteState =
  | 'existing_public_preserved'
  | 'shape_frozen_not_created'
  | 'review_only_noindex'
  | 'blocked_pending_i18n';

export interface PortalFreezeRoute {
  routeId: string;
  routeShape: string;
  currentState: PortalFreezeRouteState;
  indexabilityAuthorized: boolean;
  rankingRowsAuthorized: boolean;
  affiliateCtaAuthorized: boolean;
  nextAuthorization: string;
}

export interface PortalFreezeWorkstream {
  workstreamId: string;
  order: number;
  title: string;
  scope: string[];
  productionEffectAuthorized: false;
  deployAuthorized: false;
}

export interface PortalFactoryOwnerFreeze {
  freezeId: string;
  version: string;
  status: 'frozen_for_controlled_public_split';
  ownerIssue: 153;
  frozenAt: string;
  acceptedFoundation: {
    designSystem: true;
    homepageInformationArchitecture: true;
    pageFamily: true;
    dataContracts: true;
    localeCountrySeparation: true;
    parserPublicationBoundary: true;
    affiliateRankingIndependence: true;
  };
  currentDraftPr: 139;
  currentDraftMergeAuthorized: false;
  publicImplementationAuthorized: false;
  publicLocaleActivationAuthorized: false;
  rankingPublicationAuthorized: false;
  affiliateActivationAuthorized: false;
  deployAuthorized: false;
  routes: PortalFreezeRoute[];
  workstreams: PortalFreezeWorkstream[];
}

export const portalFactoryOwnerFreeze: PortalFactoryOwnerFreeze = {
  freezeId: 'freeze:cbw:portal-factory-v2:051j',
  version: 'cbw-portal-factory-v2-freeze-0.1',
  status: 'frozen_for_controlled_public_split',
  ownerIssue: 153,
  frozenAt: '2026-07-31T17:20:00Z',
  acceptedFoundation: {
    designSystem: true,
    homepageInformationArchitecture: true,
    pageFamily: true,
    dataContracts: true,
    localeCountrySeparation: true,
    parserPublicationBoundary: true,
    affiliateRankingIndependence: true,
  },
  currentDraftPr: 139,
  currentDraftMergeAuthorized: false,
  publicImplementationAuthorized: false,
  publicLocaleActivationAuthorized: false,
  rankingPublicationAuthorized: false,
  affiliateActivationAuthorized: false,
  deployAuthorized: false,
  routes: [
    {
      routeId: 'route:homepage',
      routeShape: '/',
      currentState: 'existing_public_preserved',
      indexabilityAuthorized: true,
      rankingRowsAuthorized: false,
      affiliateCtaAuthorized: false,
      nextAuthorization: 'Separate Homepage v2 composition PR preserving the existing governed Top-10 and current offer bindings.',
    },
    {
      routeId: 'route:kz-country-hub',
      routeShape: '/countries/kazakhstan/',
      currentState: 'shape_frozen_not_created',
      indexabilityAuthorized: false,
      rankingRowsAuthorized: false,
      affiliateCtaAuthorized: false,
      nextAuthorization: 'Separate Kazakhstan country-hub preview PR; initial route must remain noindex and unranked.',
    },
    {
      routeId: 'route:kz-country-ranking',
      routeShape: '/countries/kazakhstan/exchanges/',
      currentState: 'shape_frozen_not_created',
      indexabilityAuthorized: false,
      rankingRowsAuthorized: false,
      affiliateCtaAuthorized: false,
      nextAuthorization: 'No public route until a non-empty owner-approved RankingSnapshot exists.',
    },
    {
      routeId: 'route:kz-binance-passport',
      routeShape: '/countries/kazakhstan/exchanges/binance/',
      currentState: 'shape_frozen_not_created',
      indexabilityAuthorized: false,
      rankingRowsAuthorized: false,
      affiliateCtaAuthorized: false,
      nextAuthorization: 'Separate noindex market-passport preview PR using the Binance draft ContentPackage.',
    },
    {
      routeId: 'route:kz-bybit-passport',
      routeShape: '/countries/kazakhstan/exchanges/bybit/',
      currentState: 'shape_frozen_not_created',
      indexabilityAuthorized: false,
      rankingRowsAuthorized: false,
      affiliateCtaAuthorized: false,
      nextAuthorization: 'Separate noindex market-passport preview PR using the Bybit draft ContentPackage.',
    },
    {
      routeId: 'route:kz-okx-passport',
      routeShape: '/countries/kazakhstan/exchanges/okx/',
      currentState: 'shape_frozen_not_created',
      indexabilityAuthorized: false,
      rankingRowsAuthorized: false,
      affiliateCtaAuthorized: false,
      nextAuthorization: 'Separate noindex conflict-preserving passport PR; no recommendation or CTA.',
    },
    {
      routeId: 'route:localized-country-family',
      routeShape: '/{locale}/countries/{country}/...',
      currentState: 'blocked_pending_i18n',
      indexabilityAuthorized: false,
      rankingRowsAuthorized: false,
      affiliateCtaAuthorized: false,
      nextAuthorization: 'i18n foundation PR plus canonical, hreflang, sitemap and locale-coverage approval.',
    },
  ],
  workstreams: [
    {
      workstreamId: 'public-split:homepage-v2',
      order: 1,
      title: 'Homepage v2 composition',
      scope: [
        'Replace public homepage composition only after exact browser review.',
        'Preserve one governed Top-10 and existing verified offer bindings.',
        'Country discovery must not create a second exchange ranking.',
      ],
      productionEffectAuthorized: false,
      deployAuthorized: false,
    },
    {
      workstreamId: 'public-split:components-contracts',
      order: 2,
      title: 'Reusable portal components and contracts',
      scope: [
        'Extract reusable status, route guard and evidence components.',
        'No public country routes in this workstream.',
      ],
      productionEffectAuthorized: false,
      deployAuthorized: false,
    },
    {
      workstreamId: 'public-split:kz-country-preview',
      order: 3,
      title: 'Kazakhstan country-hub preview',
      scope: [
        'Create the route only as noindex preview.',
        'Consume draft ContentPackage candidates without approved claims.',
        'No ranked rows or affiliate CTA.',
      ],
      productionEffectAuthorized: false,
      deployAuthorized: false,
    },
    {
      workstreamId: 'public-split:kz-passport-previews',
      order: 4,
      title: 'Kazakhstan market-passport previews',
      scope: [
        'Separate Binance, Bybit and OKX passport implementation.',
        'OKX remains conflict-preserving and non-recommended.',
        'No local affiliate CTA.',
      ],
      productionEffectAuthorized: false,
      deployAuthorized: false,
    },
    {
      workstreamId: 'public-split:i18n-foundation',
      order: 5,
      title: 'i18n foundation and route guards',
      scope: [
        'Freeze canonical and hreflang behavior.',
        'Validate locale coverage and fallback rules.',
        'Do not activate public locale routes.',
      ],
      productionEffectAuthorized: false,
      deployAuthorized: false,
    },
    {
      workstreamId: 'public-split:research-ingestion',
      order: 6,
      title: 'Research ingestion adapters',
      scope: [
        'Parsers write candidate SourcePackets and claims only.',
        'No automatic approval, publication, ranking, CTA or deploy.',
      ],
      productionEffectAuthorized: false,
      deployAuthorized: false,
    },
  ],
};

export const portalFactoryOwnerFreezeIssues: ValidationIssue[] = [];

const routeIds = portalFactoryOwnerFreeze.routes.map(route => route.routeId);
if (new Set(routeIds).size !== routeIds.length) {
  portalFactoryOwnerFreezeIssues.push({
    path: 'routes',
    code: 'DUPLICATE_ROUTE_ID',
    message: 'Freeze route IDs must be unique.',
  });
}

const routeShapes = portalFactoryOwnerFreeze.routes.map(route => route.routeShape);
if (new Set(routeShapes).size !== routeShapes.length) {
  portalFactoryOwnerFreezeIssues.push({
    path: 'routes',
    code: 'DUPLICATE_ROUTE_SHAPE',
    message: 'Freeze route shapes must be unique.',
  });
}

if (portalFactoryOwnerFreeze.currentDraftMergeAuthorized !== false) {
  portalFactoryOwnerFreezeIssues.push({
    path: 'currentDraftMergeAuthorized',
    code: 'CURRENT_DRAFT_MERGE_FORBIDDEN',
    message: 'The all-in-one draft PR must not be merged as one production change.',
  });
}

for (const [path, value] of Object.entries({
  publicImplementationAuthorized: portalFactoryOwnerFreeze.publicImplementationAuthorized,
  publicLocaleActivationAuthorized: portalFactoryOwnerFreeze.publicLocaleActivationAuthorized,
  rankingPublicationAuthorized: portalFactoryOwnerFreeze.rankingPublicationAuthorized,
  affiliateActivationAuthorized: portalFactoryOwnerFreeze.affiliateActivationAuthorized,
  deployAuthorized: portalFactoryOwnerFreeze.deployAuthorized,
})) {
  if (value !== false) {
    portalFactoryOwnerFreezeIssues.push({
      path,
      code: 'FREEZE_AUTHORIZATION_VIOLATION',
      message: 'The owner freeze may define future work but cannot authorize public activation.',
    });
  }
}

for (const route of portalFactoryOwnerFreeze.routes) {
  if (route.currentState !== 'existing_public_preserved' && route.indexabilityAuthorized) {
    portalFactoryOwnerFreezeIssues.push({
      path: route.routeId,
      code: 'FUTURE_ROUTE_INDEXABILITY_FORBIDDEN',
      message: 'Future or review routes must not be indexable.',
    });
  }
  if (route.rankingRowsAuthorized || route.affiliateCtaAuthorized) {
    portalFactoryOwnerFreezeIssues.push({
      path: route.routeId,
      code: 'ROUTE_ACTIVATION_FORBIDDEN',
      message: 'No frozen route may authorize ranking rows or an affiliate CTA.',
    });
  }
  if (!route.nextAuthorization.trim()) {
    portalFactoryOwnerFreezeIssues.push({
      path: route.routeId,
      code: 'NEXT_AUTHORIZATION_REQUIRED',
      message: 'Every route requires an explicit next authorization.',
    });
  }
}

const workstreamOrders = portalFactoryOwnerFreeze.workstreams.map(item => item.order);
if (JSON.stringify(workstreamOrders) !== JSON.stringify([1, 2, 3, 4, 5, 6])) {
  portalFactoryOwnerFreezeIssues.push({
    path: 'workstreams',
    code: 'WORKSTREAM_ORDER_MISMATCH',
    message: 'Controlled public workstreams must remain contiguous and ordered.',
  });
}

if (portalFactoryOwnerFreeze.workstreams.some(item =>
  item.productionEffectAuthorized !== false || item.deployAuthorized !== false
)) {
  portalFactoryOwnerFreezeIssues.push({
    path: 'workstreams',
    code: 'WORKSTREAM_PRODUCTION_AUTHORIZATION_FORBIDDEN',
    message: 'Freeze workstreams may not authorize production effect or deploy.',
  });
}

if (kazakhstanDraftRankingSnapshot.rows.length !== 0 || kazakhstanDraftRankingSnapshot.approval !== 'draft') {
  portalFactoryOwnerFreezeIssues.push({
    path: 'rankingSnapshot',
    code: 'DRAFT_SNAPSHOT_BOUNDARY_VIOLATION',
    message: 'The Kazakhstan snapshot must remain draft with empty rows.',
  });
}

if (kazakhstanComparativeMatrix.aggregateScoringEnabled !== false || kazakhstanComparativeMatrix.orderingReady !== false) {
  portalFactoryOwnerFreezeIssues.push({
    path: 'comparativeMatrix',
    code: 'ORDERING_BOUNDARY_VIOLATION',
    message: 'Aggregate scoring and ordering readiness must remain disabled.',
  });
}

if (kazakhstanReviewContentPackages.some(pkg =>
  pkg.approval !== 'draft'
  || pkg.approvedClaimIds.length !== 0
  || Object.values(pkg.localeReadiness).some(value => value === 'approved')
  || pkg.publicationAuthorized !== false
  || pkg.rankingRowsAuthorized !== false
  || pkg.affiliateCtaAuthorized !== false
  || pkg.indexabilityAuthorized !== false
)) {
  portalFactoryOwnerFreezeIssues.push({
    path: 'contentPackages',
    code: 'CONTENT_PACKAGE_BOUNDARY_VIOLATION',
    message: 'All review ContentPackages must remain unapproved and non-public.',
  });
}

export const portalFactoryOwnerFreezePass = portalFactoryOwnerFreezeIssues.length === 0;

export const portalFactoryOwnerFreezeResult = {
  ok: portalFactoryOwnerFreezePass,
  value: portalFactoryOwnerFreezePass ? portalFactoryOwnerFreeze : undefined,
  issues: portalFactoryOwnerFreezeIssues,
};

if (!portalFactoryOwnerFreezePass) {
  throw new Error(
    `Portal Factory owner freeze validation failed: ${portalFactoryOwnerFreezeIssues
      .map(issue => `${issue.code}: ${issue.message}`)
      .join('; ')}`,
  );
}
