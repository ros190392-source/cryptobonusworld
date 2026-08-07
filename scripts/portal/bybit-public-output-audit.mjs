#!/usr/bin/env node
/**
 * Bybit public-output forbidden-value audit (Issue #264, hardened per PR #265 review).
 *
 * Deterministic, code-owned audit of GENERATED PUBLIC OUTPUT (the built `dist/`). It fails
 * closed if any rendered page presents an unverified Bybit commercial claim as a current
 * fact — in visible text, hrefs, attributes (data-attributes, aria, title), embedded
 * JSON/script payloads, JSON-LD, or metadata (a raw HTML substring scan covers all).
 *
 * Scope (R9): PUBLIC PRESENTATION output. It does NOT scan internal source/evidence files.
 * The affiliate redirect layer `dist/go/**` is excluded EXCEPT `dist/go/bybit/index.html`,
 * which is MANDATORY scope: after neutralization the Bybit /go route must be internal /
 * non-commercial and must not expose the affiliate destination or code.
 *
 * Bybit disambiguation: `CRYPTOBONUSW` is ALSO OKX's code (and a substring of BingX's
 * `CRYPTOBONUSWORLD`), so on shared pages it is checked only inside the Bybit-tagged block
 * (`data-exchange-slug="bybit"`), never globally. Bybit-UNIQUE claim strings are forbidden
 * anywhere in public output.
 *
 * Usage: node scripts/portal/bybit-public-output-audit.mjs [distDir]
 * `runBybitPublicOutputAudit(distDir)` → { ok, violations, scanned }.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

/** Bybit-UNIQUE unverified claims — forbidden anywhere in public output. */
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

/** Bybit's unconfirmed candidate code + raw affiliate destination — Bybit-scoped only. */
export const BYBIT_PROMO_CODE = 'CRYPTOBONUSW';
export const BYBIT_AFFILIATE_HOST = 'partner.bybit.com';

const EXCLUDED_GO_PREFIX = `go${sep}`;
const BYBIT_GO_REL = join('go', 'bybit', 'index.html');
/** A Bybit promo-code copy control on any page (aria-label emitted by PromoCodeCopy). */
const BYBIT_PROMO_UI = /Copy promo code [^"<]*for Bybit/i;

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

/** Extract the HTML slices tagged as the Bybit block (`data-exchange-slug="bybit"`). */
function bybitBlocks(html) {
  const blocks = [];
  const marker = 'data-exchange-slug="bybit"';
  let i = html.indexOf(marker);
  while (i !== -1) {
    // The marker sits on the container's opening tag (an `<li>`/`<article>`/`<tr>` row,
    // card or tile, none of which nest their own kind). Bound the block at the FIRST
    // matching container close after the marker, so an adjacent OKX/BingX block (which
    // shares the `CRYPTOBONUSW` code) can never bleed into or falsely flag the Bybit block.
    const rest = html.slice(i);
    const close = /<\/(?:article|li|tr)>/i.exec(rest);
    const nextMarker = rest.indexOf('data-exchange-slug="', marker.length);
    let end = close ? close.index + close[0].length : rest.length;
    if (nextMarker !== -1 && nextMarker < end) end = nextMarker; // never cross into a sibling block
    blocks.push(rest.slice(0, end));
    i = html.indexOf(marker, i + marker.length);
  }
  return blocks;
}

export function runBybitPublicOutputAudit(distDir = join(ROOT, 'dist')) {
  const violations = [];
  if (!existsSync(distDir)) {
    return { ok: false, scanned: 0, violations: [{ file: distDir, code: 'DIST_MISSING', message: 'dist not found — build first.' }] };
  }
  const files = walkHtml(distDir).filter((f) => {
    const rel = relative(distDir, f);
    // Exclude the affiliate redirect layer EXCEPT the mandatory Bybit /go route.
    return !rel.startsWith(EXCLUDED_GO_PREFIX) || rel === BYBIT_GO_REL;
  });

  const bybitPage = resolve(join(distDir, 'bybit', 'index.html'));
  const bybitGoPage = resolve(join(distDir, 'go', 'bybit', 'index.html'));

  for (const f of files) {
    const rel = relative(distDir, f).replace(/\\/g, '/');
    const html = readFileSync(f, 'utf8');
    const abs = resolve(f);

    // (1) Bybit-UNIQUE claims must not appear anywhere in public output.
    for (const s of BYBIT_UNIQUE_FORBIDDEN) {
      if (html.includes(s)) violations.push({ file: rel, code: 'BYBIT_UNIQUE_CLAIM', message: `Forbidden Bybit claim in public output: "${s}"` });
    }
    // (2) Bybit promo-code UI must not render on any page while unconfirmed.
    if (BYBIT_PROMO_UI.test(html)) violations.push({ file: rel, code: 'BYBIT_PROMO_UI', message: 'Bybit promo-code copy control present in public output.' });

    // (3) Bybit-scoped blocks on shared pages: no candidate code, no affiliate host.
    for (const block of bybitBlocks(html)) {
      if (block.includes(BYBIT_PROMO_CODE)) violations.push({ file: rel, code: 'BYBIT_CODE_IN_BLOCK', message: `Unconfirmed promo code "${BYBIT_PROMO_CODE}" inside the Bybit-tagged block.` });
      if (block.includes(BYBIT_AFFILIATE_HOST)) violations.push({ file: rel, code: 'BYBIT_AFFILIATE_IN_BLOCK', message: `Affiliate host "${BYBIT_AFFILIATE_HOST}" inside the Bybit-tagged block.` });
    }

    // (4) The whole /bybit/ page is Bybit-scoped.
    if (abs === bybitPage) {
      if (html.includes(BYBIT_PROMO_CODE)) violations.push({ file: rel, code: 'BYBIT_CODE_ON_BYBIT_PAGE', message: `"${BYBIT_PROMO_CODE}" present on the Bybit page.` });
      if (/\/go\//.test(html)) violations.push({ file: rel, code: 'BYBIT_PAGE_GO_LINK', message: 'Bybit page emits a /go/ affiliate target while under re-verification.' });
      if (/>\s*Verified\b/.test(html) || />\s*✓\s*Verified/.test(html)) violations.push({ file: rel, code: 'BYBIT_PAGE_VERIFIED_LABEL', message: 'Bybit page presents a "Verified" status while under re-verification.' });
    }

    // (5) The Bybit /go route must be internal / non-commercial (R1/R9).
    if (abs === bybitGoPage) {
      if (html.includes(BYBIT_PROMO_CODE)) violations.push({ file: rel, code: 'GO_BYBIT_CODE', message: `"${BYBIT_PROMO_CODE}" present on /go/bybit/.` });
      if (html.includes(BYBIT_AFFILIATE_HOST)) violations.push({ file: rel, code: 'GO_BYBIT_AFFILIATE_URL', message: `Affiliate destination "${BYBIT_AFFILIATE_HOST}" present on /go/bybit/.` });
      if (/\bsponsored\b/.test(html)) violations.push({ file: rel, code: 'GO_BYBIT_SPONSORED', message: '/go/bybit/ emits a rel=sponsored outbound link while non-commercial.' });
      if (/cbw_affiliate_click/.test(html)) violations.push({ file: rel, code: 'GO_BYBIT_ANALYTICS', message: '/go/bybit/ fires the affiliate-click analytics event while non-commercial.' });
      // Any http(s) target other than the site's own domain = an external auto-redirect.
      const externalHref = /https?:\/\/(?!cryptobonusworld\.com)[^\s"']+/.exec(html);
      if (externalHref) violations.push({ file: rel, code: 'GO_BYBIT_EXTERNAL_REDIRECT', message: `/go/bybit/ references an external destination: ${externalHref[0].slice(0, 60)}` });
    }
  }

  // (6) The homepage must not emit /go/* (fail-closed country-aware invariant).
  const home = join(distDir, 'index.html');
  if (existsSync(home) && /\/go\//.test(readFileSync(home, 'utf8'))) {
    violations.push({ file: 'index.html', code: 'HOMEPAGE_GO_LINK', message: 'Homepage emits a /go/ affiliate target.' });
  }
  // (7) The Bybit /go route MUST exist and be in scope (guards against silent exclusion).
  if (!existsSync(bybitGoPage)) {
    violations.push({ file: 'go/bybit/index.html', code: 'GO_BYBIT_MISSING', message: 'Expected /go/bybit/ to exist and be audited.' });
  }

  return { ok: violations.length === 0, scanned: files.length, violations };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const distArg = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'dist');
  const { ok, scanned, violations } = runBybitPublicOutputAudit(distArg);
  if (ok) {
    console.log(`PASS: Bybit public-output audit — ${scanned} HTML files scanned (incl. /go/bybit/); no unverified Bybit claim, promo code, affiliate destination, /go/ CTA or verified label in public output.`);
    process.exit(0);
  }
  console.error(`FAIL: Bybit public-output audit (${violations.length} violation(s)):`);
  for (const v of violations) console.error(`  [${v.code}] ${v.file}: ${v.message}`);
  process.exit(1);
}
