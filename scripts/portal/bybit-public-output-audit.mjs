#!/usr/bin/env node
/**
 * Bybit public-output forbidden-value audit (Issue #264).
 *
 * Deterministic, code-owned audit of GENERATED PUBLIC OUTPUT (the built `dist/`). It
 * fails closed if any rendered page presents an unverified Bybit commercial claim as a
 * current fact — in visible text, attributes (data-attributes, aria, title), embedded
 * JSON/script payloads, JSON-LD, or metadata (a raw HTML substring scan covers all).
 *
 * Scope (R8): PUBLIC PRESENTATION output only. It deliberately does NOT scan internal
 * source/evidence files (candidate values are allowed there), and it EXCLUDES the
 * affiliate redirect layer under `dist/go/**` — those redirect stubs carry the partner
 * URL, which this task is not authorized to change ("no affiliate destination change");
 * no public presentation surface links to `/go/bybit/` after neutralization.
 *
 * Bybit disambiguation: `CRYPTOBONUSW` is ALSO OKX's code (and a substring of BingX's
 * `CRYPTOBONUSWORLD`), so it is only forbidden in Bybit-scoped context — the whole
 * `/bybit/` page, and any "Copy promo code … for Bybit" promo-code UI on a shared page.
 * The Bybit-UNIQUE strings are forbidden anywhere in public output.
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
];

/** Bybit's unconfirmed candidate code — forbidden only in Bybit-scoped context. */
export const BYBIT_PROMO_CODE = 'CRYPTOBONUSW';

/** Directories under dist that are the affiliate redirect layer (excluded — see header). */
const EXCLUDED_PREFIXES = [`go${sep}`];

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

/** A Bybit promo-code copy control on any page (aria-label emitted by PromoCodeCopy). */
const BYBIT_PROMO_UI = /Copy promo code [^"<]*for Bybit/i;

export function runBybitPublicOutputAudit(distDir = join(ROOT, 'dist')) {
  const violations = [];
  if (!existsSync(distDir)) {
    return { ok: false, scanned: 0, violations: [{ file: distDir, code: 'DIST_MISSING', message: 'dist not found — build first.' }] };
  }
  const files = walkHtml(distDir).filter((f) => {
    const rel = relative(distDir, f);
    return !EXCLUDED_PREFIXES.some((pre) => rel.startsWith(pre));
  });

  const bybitPage = join(distDir, 'bybit', 'index.html');

  for (const f of files) {
    const rel = relative(distDir, f).replace(/\\/g, '/');
    const html = readFileSync(f, 'utf8');

    // (1) Bybit-UNIQUE claims must not appear anywhere in public output.
    for (const s of BYBIT_UNIQUE_FORBIDDEN) {
      if (html.includes(s)) violations.push({ file: rel, code: 'BYBIT_UNIQUE_CLAIM', message: `Forbidden Bybit claim in public output: "${s}"` });
    }

    // (2) Bybit promo-code UI must not render on any page while unconfirmed.
    if (BYBIT_PROMO_UI.test(html)) violations.push({ file: rel, code: 'BYBIT_PROMO_UI', message: 'Bybit promo-code copy control present in public output.' });

    // (3) The whole /bybit/ page is Bybit-scoped: the candidate code must not appear.
    if (resolve(f) === resolve(bybitPage) && html.includes(BYBIT_PROMO_CODE)) {
      violations.push({ file: rel, code: 'BYBIT_CODE_ON_BYBIT_PAGE', message: `Unconfirmed promo code "${BYBIT_PROMO_CODE}" present on the Bybit page.` });
    }

    // (4) The Bybit page must present no commercial affiliate CTA and no "verified" status.
    if (resolve(f) === resolve(bybitPage)) {
      if (/\/go\//.test(html)) violations.push({ file: rel, code: 'BYBIT_PAGE_GO_LINK', message: 'Bybit page emits a /go/ affiliate target while under re-verification.' });
      if (/>\s*Verified\b/.test(html) || />\s*✓\s*Verified/.test(html)) violations.push({ file: rel, code: 'BYBIT_PAGE_VERIFIED_LABEL', message: 'Bybit page presents a "Verified" status while under re-verification.' });
    }
  }

  // (5) The homepage must not emit /go/* (fail-closed country-aware invariant).
  const home = join(distDir, 'index.html');
  if (existsSync(home) && /\/go\//.test(readFileSync(home, 'utf8'))) {
    violations.push({ file: 'index.html', code: 'HOMEPAGE_GO_LINK', message: 'Homepage emits a /go/ affiliate target.' });
  }

  return { ok: violations.length === 0, scanned: files.length, violations };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const distArg = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'dist');
  const { ok, scanned, violations } = runBybitPublicOutputAudit(distArg);
  if (ok) {
    console.log(`PASS: Bybit public-output audit — ${scanned} HTML files scanned; no unverified Bybit claim, promo code, /go/ CTA or verified label in public output.`);
    process.exit(0);
  }
  console.error(`FAIL: Bybit public-output audit (${violations.length} violation(s)):`);
  for (const v of violations) console.error(`  [${v.code}] ${v.file}: ${v.message}`);
  process.exit(1);
}
