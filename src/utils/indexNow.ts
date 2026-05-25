/**
 * IndexNow utility — instant URL submission to Bing and Yandex.
 *
 * Usage (server-side / build-time scripts only — NOT in Astro SSG pages):
 *   import { pingIndexNow } from '../utils/indexNow';
 *   await pingIndexNow(['/exchanges/bybit/', '/bonuses/bybit-bonus/']);
 *
 * Key file must exist at:
 *   https://cryptobonusworld.com/a1b2c3d4e5f6789012345678901234ab.txt
 * containing only the key value.
 *
 * Reference: https://www.indexnow.org/documentation
 */

export const INDEXNOW_HOST = 'cryptobonusworld.com';
export const INDEXNOW_KEY = 'a1b2c3d4e5f6789012345678901234ab';
export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;
export const INDEXNOW_API = 'https://api.indexnow.org/indexnow';

export interface IndexNowResult {
  success: boolean;
  statusCode?: number;
  urlCount: number;
  error?: string;
}

/**
 * Ping IndexNow with a list of URL paths (relative or absolute).
 *
 * - Paths are converted to absolute URLs automatically.
 * - Batches up to 10,000 URLs per API spec (we send all in one call for normal deploys).
 * - Returns success/failure with HTTP status code.
 */
export async function pingIndexNow(paths: string[]): Promise<IndexNowResult> {
  if (paths.length === 0) {
    return { success: false, urlCount: 0, error: 'No URLs provided' };
  }

  const urlList = paths.map(p => {
    if (p.startsWith('https://')) return p;
    const clean = p.startsWith('/') ? p : `/${p}`;
    return `https://${INDEXNOW_HOST}${clean}`;
  });

  const payload = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList,
  };

  try {
    const res = await fetch(INDEXNOW_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });

    return {
      success: res.ok,
      statusCode: res.status,
      urlCount: urlList.length,
      error: res.ok ? undefined : `HTTP ${res.status}: ${res.statusText}`,
    };
  } catch (err) {
    return {
      success: false,
      urlCount: urlList.length,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Build the full list of high-priority URLs to submit after a deploy.
 * Exchange pages, bonus pages, compare top-pairs, guides.
 */
export function buildPriorityUrlList(
  exchangeSlugs: string[],
  comparePairSlugs: string[],
  guideSlugs: string[],
  categorySlugs: string[]
): string[] {
  const urls: string[] = [
    '/',
    '/bonuses/',
    '/exchanges/',
    '/compare/',
    '/guides/',
  ];

  for (const slug of exchangeSlugs) {
    urls.push(`/exchanges/${slug}/`);
    urls.push(`/bonuses/${slug}-bonus/`);
  }

  for (const pair of comparePairSlugs) {
    urls.push(`/compare/${pair}/`);
  }

  for (const slug of guideSlugs) {
    urls.push(`/guides/${slug}/`);
  }

  for (const slug of categorySlugs) {
    urls.push(`/categories/${slug}/`);
  }

  return urls;
}
