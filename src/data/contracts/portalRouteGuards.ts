import { isInternalPath } from './internalPath';

export type PortalRouteMode = 'review' | 'public';
export type PortalPublicationState = 'draft' | 'reviewed' | 'approved' | 'blocked';

export interface PortalRouteRecord {
  routeId: string;
  reviewPath: string;
  publicPath?: string;
  publicationState: PortalPublicationState;
  indexabilityAuthorized: boolean;
}

const ROUTE_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/i;

function validateLocalPath(path: string, label: string): void {
  if (!isInternalPath(path)) {
    throw new Error(`${label} must be a normalized internal path ending with a slash (never affiliate or protocol-relative).`);
  }
}

export function assertPortalRouteRecord(record: PortalRouteRecord): PortalRouteRecord {
  if (!ROUTE_ID_PATTERN.test(record.routeId)) {
    throw new Error('Portal route requires a stable routeId.');
  }

  validateLocalPath(record.reviewPath, 'Review path');
  if (!record.reviewPath.startsWith('/__design/')) {
    throw new Error('Review routes must remain under /__design/.');
  }

  if (record.publicPath !== undefined) {
    validateLocalPath(record.publicPath, 'Public path');
    if (record.publicPath.startsWith('/__design/')) {
      throw new Error('Public path cannot use the review namespace.');
    }
  }

  if (record.publicationState !== 'approved' && record.indexabilityAuthorized) {
    throw new Error('Only approved routes may authorize indexability.');
  }

  if (record.publicationState === 'approved' && !record.publicPath) {
    throw new Error('Approved routes require an explicit public path.');
  }

  return record;
}

export function resolvePortalRoute(
  recordInput: PortalRouteRecord,
  mode: PortalRouteMode,
): string {
  const record = assertPortalRouteRecord(recordInput);

  if (mode === 'review') return record.reviewPath;

  if (
    record.publicationState !== 'approved'
    || !record.indexabilityAuthorized
    || !record.publicPath
  ) {
    throw new Error(`Public route ${record.routeId} is not authorized.`);
  }

  return record.publicPath;
}
