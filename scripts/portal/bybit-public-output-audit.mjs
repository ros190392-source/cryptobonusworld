#!/usr/bin/env node
/**
 * Bybit public-output audit V3 (Issues #264/#265 + authority split #269).
 *
 * Bybit OFFER CLAIMS remain evidence-driven and fail closed. The exact current Bybit
 * promo/referral code and registration URL are independently owner-confirmed as of 2026-08-08,
 * so this audit now permits those exact commercial values while continuing to reject every
 * unsupported bonus/KYC/deposit/expiry/reward claim and every direct affiliate leak outside
 * the governed /go/bybit/ boundary.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

/** Bybit-UNIQUE unsupported claims — forbidden anywhere in current public output. */
export const BYBIT_UNIQUE_FORBIDDEN = [
  'Up to 30,000 USDT Welcome Package',
  '30,000 USDT',
  'New users typically earn $30–$200 depending on deposit size and trading activity',
  'Up to 50% fee discount on select trading pairs',
  '50% fee discount',
  'New accounts only. KYC required to withdraw. Trading volume conditions apply to higher tiers.',
  'Minimum deposit varies by bonus tier',
  'Vouchers expire 7–30 days after issuance',
  'Reward is issued as vouchers with withdrawal/conversion limitations.',
];

/** Exact owner-confirmed commercial values for Bybit (#269). */
export const BYBIT_PROMO_CODE = 'CRYPTOBONUSW';
export const BYBIT_CONFIRMED_URL = 'https://partner.bybit.com/b/CRYPTOBONUSW';
export const BYBIT_AFFILIATE_HOST = 'partner.bybit.com';

const EXCLUDED_GO_PREFIX = `go${sep}`;
const BYBIT_GO_REL = join('go', 'bybit', 'index.html');

function walkHtml(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walkHtml(p));
    else if (e.endsWith('.html')) out.push(p);
  }
  return out;
}

function bybitBlocks(html) {
  const blocks = [];
  const marker = 'data-exchange-slug="bybit"';
  let i = html.indexOf(marker);
  while (i !== -1) {
    const rest = html.slice(i);
    const close = /<\/(?:article|li|tr)>/i.exec(rest);
    const nextMarker = rest.indexOf('data-exchange-slug="', marker.length);
    let end = close ? close.index + close[0].length : rest.length;
    if (nextMarker !== -1 && nextMarker < end) end = nextMarker;
    blocks.push(rest.slice(0, end));
    i = html.indexOf(marker, i + marker.length);
  }
  return blocks;
}

function confirmedUrlAppears(html) {
  return [
    BYBIT_CONFIRMED_URL,
    BYBIT_CONFIRMED_URL.replaceAll('&', '&amp;'),
    BYBIT_CONFIRMED_URL.replaceAll('&', '\\u0026'),
  ].some((value) => html.includes(value));
}

export function runBybitPublicOutputAudit(distDir = join(ROOT, 'dist')) {
  const violations = [];
  if (!existsSync(distDir)) {
    return { ok: false, scanned: 0, violations: [{ file: distDir, code: 'DIST_MISSING', message: 'dist not found — build first.' }] };
  }

  const files = walkHtml(distDir).filter((f) => {
    const rel = relative(distDir, f);
    return !rel.startsWith(EXCLUDED_GO_PREFIX) || rel === BYBIT_GO_REL;
  });

  const bybitPage = resolve(join(distDir, 'bybit', 'index.html'));
  const bybitGoPage = resolve(join(distDir, 'go', 'bybit', 'index.html'));

  for (const f of files) {
    const rel = relative(distDir, f).replace(/\\/g, '/');
    const html = readFileSync(f, 'utf8');
    const abs = resolve(f);

    // (1) Unsupported Bybit-specific claims remain forbidden everywhere.
    for (const s of BYBIT_UNIQUE_FORBIDDEN) {
      if (html.includes(s)) violations.push({ file: rel, code: 'BYBIT_UNIQUE_CLAIM', message: `Forbidden Bybit claim in public output: "${s}"` });
    }

    // (2) Shared Bybit-tagged blocks may show the exact confirmed code and internal /go hop,
    // but may NOT expose the raw partner destination directly.
    for (const block of bybitBlocks(html)) {
      if (block.includes(BYBIT_AFFILIATE_HOST)) {
        violations.push({ file: rel, code: 'BYBIT_DIRECT_AFFILIATE_IN_BLOCK', message: `Raw affiliate host "${BYBIT_AFFILIATE_HOST}" leaked into the Bybit-tagged block; use /go/bybit/ instead.` });
      }
    }

    // (3) Dedicated /bybit/ status page: exact owner-confirmed code + /go are allowed;
    // raw partner URL and any Verified-offer status are not.
    if (abs === bybitPage) {
      if (html.includes(BYBIT_AFFILIATE_HOST)) {
        violations.push({ file: rel, code: 'BYBIT_DIRECT_AFFILIATE_ON_PAGE', message: 'Bybit page exposes the raw affiliate destination instead of the governed /go/bybit/ hop.' });
      }
      if (/>\s*Verified\b/.test(html) || />\s*✓\s*Verified/.test(html)) {
        violations.push({ file: rel, code: 'BYBIT_PAGE_VERIFIED_LABEL', message: 'Bybit page presents a Verified offer status while offer claims remain under re-verification.' });
      }
    }

    // (4) /go/bybit/ is the only public surface allowed to contain the exact confirmed
    // partner destination. It may also carry the exact code and affiliate analytics.
    if (abs === bybitGoPage) {
      if (!confirmedUrlAppears(html)) {
        violations.push({ file: rel, code: 'GO_BYBIT_CONFIRMED_URL_MISSING', message: 'Expected exact owner-confirmed Bybit destination on /go/bybit/.' });
      }
      if (html.includes(BYBIT_AFFILIATE_HOST) && !confirmedUrlAppears(html)) {
        violations.push({ file: rel, code: 'GO_BYBIT_NONEXACT_AFFILIATE', message: 'Bybit affiliate host is present without the exact owner-confirmed destination.' });
      }
    }
  }

  // (5) Any public /go/bybit/ link is allowed because the route itself performs exact-value
  // authority enforcement. Direct partner.bybit.com links remain forbidden by the block/page
  // checks above.

  // (6) The Bybit /go route MUST exist and be in audit scope.
  if (!existsSync(bybitGoPage)) {
    violations.push({ file: 'go/bybit/index.html', code: 'GO_BYBIT_MISSING', message: 'Expected /go/bybit/ to exist and be audited.' });
  }

  return { ok: violations.length === 0, scanned: files.length, violations };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const distArg = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'dist');
  const { ok, scanned, violations } = runBybitPublicOutputAudit(distArg);
  if (ok) {
    console.log(`PASS: Bybit public-output audit V3 — ${scanned} HTML files scanned (incl. /go/bybit/); exact owner-confirmed code/route allowed, unsupported Bybit offer claims and direct affiliate leaks absent.`);
    process.exit(0);
  }
  console.error(`FAIL: Bybit public-output audit V3 (${violations.length} violation(s)):`);
  for (const v of violations) console.error(`  [${v.code}] ${v.file}: ${v.message}`);
  process.exit(1);
}