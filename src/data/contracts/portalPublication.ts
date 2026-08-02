/**
 * Portal publication — the real public-route emission path.
 *
 * Composes the individual fail-closed contracts (ranking validation with the
 * freshness clock, market-profile validation, and the route guard) into the
 * single decision that governs which public ranking rows may be emitted. A row
 * or an entire snapshot is published only when every requirement holds; every
 * other record is excluded and reported with machine-readable reasons.
 *
 * Guarantees (all fail-closed):
 *  - a non-approved / invalid / stale snapshot emits ZERO public routes;
 *  - a row whose profile is not approved+available, or whose route is not
 *    approved+indexable, is excluded from the published list;
 *  - the published list never contains a blocked exchange (asserted);
 *  - presentation locale never changes the published set (facts are language-
 *    independent).
 */
import type { MarketProfile, RankingSnapshot, ValidationIssue } from './portalFactory';
import { validateRankingSnapshot, validateMarketProfile } from './portalFactory';
import type { PortalRouteRecord } from './portalRouteGuards';
import { resolvePortalRoute } from './portalRouteGuards';
import type { CtaLocale } from './portalCta';

export interface PortalPublicationInput {
  snapshot: RankingSnapshot;
  /** Market profiles keyed by marketProfileId. */
  profiles: Record<string, MarketProfile>;
  /** Public route records keyed by exchangeId. */
  routes: Record<string, PortalRouteRecord>;
  /** Explicit clock (epoch ms) — enables fail-closed freshness. */
  now: number;
  /** Presentation locale only; must not affect the published set. */
  locale?: CtaLocale;
}

export interface PublishedRoute {
  position: number;
  exchangeId: string;
  publicPath: string;
}

export interface BlockedRoute {
  exchangeId: string;
  reasons: string[];
}

export interface PublicationResult {
  snapshotPublishable: boolean;
  published: PublishedRoute[];
  blocked: BlockedRoute[];
  issues: ValidationIssue[];
}

/**
 * Emit the publishable public ranking routes, fail-closed.
 * Never throws for record-level problems — it reports them; it throws only if
 * its own published/blocked invariant is somehow violated (a contract bug).
 */
export function emitPublicRankingRoutes(input: PortalPublicationInput): PublicationResult {
  const { snapshot, profiles, routes, now } = input;
  const published: PublishedRoute[] = [];
  const blocked: BlockedRoute[] = [];

  // 1) Snapshot gate — an unapproved / invalid / stale snapshot publishes nothing.
  const snap = validateRankingSnapshot(snapshot, { now });
  const snapshotPublishable = snap.ok && snapshot.approval === 'approved';

  if (!snapshotPublishable) {
    for (const row of Array.isArray(snapshot.rows) ? snapshot.rows : []) {
      blocked.push({ exchangeId: row?.exchangeId ?? '(unknown)', reasons: ['SNAPSHOT_NOT_PUBLISHABLE'] });
    }
    return { snapshotPublishable: false, published, blocked, issues: snap.issues };
  }

  // 2) Row gate — each row must have an approved+available profile AND an
  //    approved+indexable public route.
  for (const row of snapshot.rows) {
    const reasons: string[] = [];

    const profile = profiles[row.marketProfileId];
    if (!profile) {
      reasons.push('PROFILE_MISSING');
    } else {
      const pv = validateMarketProfile(profile);
      if (!pv.ok) reasons.push('PROFILE_INVALID');
      if (profile.approval !== 'approved') reasons.push('PROFILE_NOT_APPROVED');
      if (!(profile.availability === 'available' || profile.availability === 'limited')) reasons.push('PROFILE_NOT_AVAILABLE');
    }

    const route = routes[row.exchangeId];
    let publicPath: string | null = null;
    if (!route) {
      reasons.push('ROUTE_MISSING');
    } else {
      try {
        publicPath = resolvePortalRoute(route, 'public');
      } catch {
        reasons.push('ROUTE_NOT_AUTHORIZED');
      }
    }

    if (reasons.length === 0 && publicPath) {
      published.push({ position: row.position, exchangeId: row.exchangeId, publicPath });
    } else {
      blocked.push({ exchangeId: row.exchangeId, reasons });
    }
  }

  // 3) Invariant: no blocked exchange may appear in the published list.
  const blockedIds = new Set(blocked.map((b) => b.exchangeId));
  if (published.some((p) => blockedIds.has(p.exchangeId))) {
    throw new Error('Publication invariant violated: a blocked exchange was emitted publicly.');
  }

  return { snapshotPublishable: true, published, blocked, issues: snap.issues };
}
