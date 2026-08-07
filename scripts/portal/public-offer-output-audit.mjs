#!/usr/bin/env node
/**
 * Global public-offer output audit (Issue #266 — generalizes the Bybit-only #265 audit).
 *
 * Deterministic, code-owned audit of GENERATED PUBLIC OUTPUT (built `dist/`). For EVERY
 * current offer-bearing exchange it fails closed if the exchange presents an unverified
 * commercial claim as a current fact — in visible text, hrefs, attributes (data-*, aria,
 * title), embedded JSON/script, JSON-LD or metadata (a raw HTML substring scan covers all).
 *
 * The forbidden inventory is built from RAW repository data (offers.ts + exchanges.json):
 * per exchange — promo code, affiliate hosts, bonus headline, realistic-value copy, terms.
 * Codes/hosts/headlines COLLIDE across exchanges (bybit & okx both `CRYPTOBONUSW`; bingx
 * `CRYPTOBONUSWORLD` is a superstring), so they are checked ONLY in that exchange's own
 * scoped context: its `data-exchange-slug="<slug>"` blocks, its dedicated `/<slug>/` page,
 * and its `/go/<slug>/` route. No string is banned globally.
 *
 * Scope: PUBLIC PRESENTATION output. Internal source/evidence files are not scanned. The
 * affiliate redirect layer `dist/go/**` is excluded EXCEPT the six `dist/go/<slug>/`
 * routes, which are mandatory (they must be internal / non-commercial). Raw affiliate
 * destinations in exchanges.json are never changed by this task.
 *
 * Usage: node scripts/portal/public-offer-output-audit.mjs [distDir]
 * `buildPublicOfferForbiddenInventory()` → per-slug inventory (async, loads offers.ts).
 * `runPublicOfferOutputAudit(distDir, inventory)` → { ok, violations, scanned }.
 */
import { build } from 'esbuild';
import { readFileSync, readdirSync, statSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

/** Load the raw offers array by transpiling offers.ts (type-only imports are stripped). */
async function loadOffers() {
  const tmp = mkdtempSync(join(tmpdir(), 'cbw-offers-'));
  const out = join(tmp, 'offers.mjs');
  try {
    await build({ entryPoints: [join(ROOT, 'src/data/offers.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
    const mod = await import(pathToFileURL(out).href);
    return mod.offers;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Build the per-exchange forbidden inventory from raw repository data. */
export async function buildPublicOfferForbiddenInventory() {
  const offers = await loadOffers();
  const exchanges = JSON.parse(readFileSync(join(ROOT, 'src/data/exchanges.json'), 'utf8'));
  const bySlug = new Map(exchanges.map((e) => [e.slug, e]));
  const inv = {};
  for (const o of offers) {
    const ex = bySlug.get(o.exchangeSlug) ?? {};
    // Use the DISTINCTIVE affiliate identifier `host + pathname` (query stripped), not the
    // bare host — several affiliate URLs live on the exchange's own domain, which the
    // neutral notice legitimately links to as the official (non-affiliate) site.
    const tokens = new Set();
    const addToken = (u) => { try { if (typeof u === 'string') { const url = new URL(u); tokens.add((url.host + url.pathname).replace(/\/+$/, '')); } } catch { /* not a URL */ } };
    addToken(ex.affiliateUrl);
    addToken(ex.affiliateLinks?.default);
    for (const g of Object.values(ex.affiliateLinks?.geo ?? {})) addToken(g);
    // The offer's own sourceUrl is an affiliate URL for some exchanges (e.g. bingx); treat
    // its distinctive path as forbidden too.
    addToken(o.sourceUrl && /partner|shareCode|\/join\/|\/r\/af\/|\/bg\//.test(o.sourceUrl) ? o.sourceUrl : undefined);
    inv[o.exchangeSlug] = {
      code: o.promoCode,
      affiliateHosts: [...tokens],
      bonusHeadline: o.bonusHeadline,
      realisticValue: o.realisticValue,
      termsSummary: o.termsSummary,
    };
  }
  return inv;
}

const EXCLUDED_GO_PREFIX = `go${sep}`;

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

/** Extract the HTML slices tagged as a given exchange's block (bounded to the container). */
function exchangeBlocks(html, slug) {
  const blocks = [];
  const marker = `data-exchange-slug="${slug}"`;
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

const promoUi = (slug) => new RegExp(`Copy promo code [^"<]*for [^"<]*`, 'i'); // per-exchange checked inside its block

export function runPublicOfferOutputAudit(distDir, inventory) {
  const violations = [];
  if (!existsSync(distDir)) return { ok: false, scanned: 0, violations: [{ file: distDir, code: 'DIST_MISSING', message: 'dist not found — build first.' }] };
  const slugs = Object.keys(inventory);

  const dedicatedPage = (slug) => resolve(join(distDir, slug, 'index.html'));
  const goPage = (slug) => resolve(join(distDir, 'go', slug, 'index.html'));
  const dedicatedSet = new Set(slugs.map(dedicatedPage));
  const goSet = new Map(slugs.map((s) => [goPage(s), s]));

  const files = walkHtml(distDir).filter((f) => {
    const rel = relative(distDir, f);
    return !rel.startsWith(EXCLUDED_GO_PREFIX) || goSet.has(resolve(f));
  });

  // exchange-scoped forbidden checks for one string set inside a given HTML slice.
  const checkSlice = (rel, slice, slug, ctx) => {
    const inv = inventory[slug];
    const forbidden = [
      ['CODE', inv.code],
      ['BONUS_HEADLINE', inv.bonusHeadline],
      ['REALISTIC_VALUE', inv.realisticValue],
      ['TERMS', inv.termsSummary],
    ];
    for (const [kind, value] of forbidden) {
      if (value && slice.includes(value)) violations.push({ file: rel, code: `${slug.toUpperCase()}_${kind}_IN_${ctx}`, message: `[${slug}] forbidden ${kind} "${String(value).slice(0, 40)}…" in ${ctx}.` });
    }
    for (const host of inv.affiliateHosts) {
      if (host && slice.includes(host)) violations.push({ file: rel, code: `${slug.toUpperCase()}_AFFILIATE_IN_${ctx}`, message: `[${slug}] affiliate host "${host}" in ${ctx}.` });
    }
  };

  for (const f of files) {
    const rel = relative(distDir, f).replace(/\\/g, '/');
    const html = readFileSync(f, 'utf8');
    const abs = resolve(f);

    // (a) exchange-tagged blocks on any shared page → that exchange's forbidden set.
    for (const slug of slugs) {
      for (const block of exchangeBlocks(html, slug)) {
        checkSlice(rel, block, slug, 'BLOCK');
        if (promoUi(slug).test(block)) violations.push({ file: rel, code: `${slug.toUpperCase()}_PROMO_UI_IN_BLOCK`, message: `[${slug}] promo-code copy control inside its block.` });
      }
    }

    // (b) a dedicated exchange page is entirely that exchange's scope.
    if (dedicatedSet.has(abs)) {
      const slug = slugs.find((s) => dedicatedPage(s) === abs);
      checkSlice(rel, html, slug, 'PAGE');
      if (/\/go\//.test(html)) violations.push({ file: rel, code: `${slug.toUpperCase()}_PAGE_GO_LINK`, message: `[${slug}] dedicated page emits a /go/ affiliate target.` });
      if (/>\s*✓?\s*Verified\b/.test(html)) violations.push({ file: rel, code: `${slug.toUpperCase()}_PAGE_VERIFIED_LABEL`, message: `[${slug}] dedicated page presents a "Verified" status.` });
    }

    // (c) a /go/<slug>/ route must be internal / non-commercial.
    if (goSet.has(abs)) {
      const slug = goSet.get(abs);
      checkSlice(rel, html, slug, 'GO');
      if (/\bsponsored\b/.test(html)) violations.push({ file: rel, code: `${slug.toUpperCase()}_GO_SPONSORED`, message: `[${slug}] /go route emits rel=sponsored while non-commercial.` });
      if (/cbw_affiliate_click/.test(html)) violations.push({ file: rel, code: `${slug.toUpperCase()}_GO_ANALYTICS`, message: `[${slug}] /go route fires affiliate-click analytics while non-commercial.` });
      const ext = /https?:\/\/(?!cryptobonusworld\.com)[^\s"']+/.exec(html);
      if (ext) violations.push({ file: rel, code: `${slug.toUpperCase()}_GO_EXTERNAL`, message: `[${slug}] /go route references an external destination: ${ext[0].slice(0, 50)}` });
    }
  }

  // Every dedicated page + /go route must EXIST and be audited (guard against silent skip).
  for (const slug of slugs) {
    if (!existsSync(dedicatedPage(slug))) violations.push({ file: `${slug}/index.html`, code: `${slug.toUpperCase()}_PAGE_MISSING`, message: `Expected dedicated /${slug}/ page.` });
    if (!existsSync(goPage(slug))) violations.push({ file: `go/${slug}/index.html`, code: `${slug.toUpperCase()}_GO_MISSING`, message: `Expected /go/${slug}/ route in audit scope.` });
  }

  // Homepage must not emit /go/*.
  const home = join(distDir, 'index.html');
  if (existsSync(home) && /\/go\//.test(readFileSync(home, 'utf8'))) violations.push({ file: 'index.html', code: 'HOMEPAGE_GO_LINK', message: 'Homepage emits a /go/ affiliate target.' });

  return { ok: violations.length === 0, scanned: files.length, violations };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const distArg = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'dist');
  const inventory = await buildPublicOfferForbiddenInventory();
  const { ok, scanned, violations } = runPublicOfferOutputAudit(distArg, inventory);
  if (ok) {
    console.log(`PASS: public-offer output audit — ${scanned} HTML files scanned across ${Object.keys(inventory).length} exchanges (incl. all /go/<slug>/); no unverified commercial claim, promo code, affiliate destination, /go CTA or verified label in any exchange's public output.`);
    process.exit(0);
  }
  console.error(`FAIL: public-offer output audit (${violations.length} violation(s)):`);
  for (const v of violations) console.error(`  [${v.code}] ${v.file}: ${v.message}`);
  process.exit(1);
}
