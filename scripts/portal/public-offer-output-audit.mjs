#!/usr/bin/env node
/**
 * Global public-offer output audit V2 (Issue #266 R5/R6/R13 — generalizes the Bybit-only #265
 * audit and the offers.ts-scoped #266 v1).
 *
 * Deterministic, code-owned audit of GENERATED PUBLIC OUTPUT (built `dist/`). The forbidden
 * inventory is built from the COMPLETE commercial-candidate catalog in RAW exchanges.json (NOT
 * offers.ts) — every exchange whose raw record carries real commercial material — plus the
 * matching clean Offer where one exists. `/go/[exchange]` is generated from ALL of
 * exchanges.json, so legacy candidates (Gate.io / HTX / CoinEx / Phemex / Bitunix / Binance /
 * Coinbase) are now in scope; the v1 audit could not see them.
 *
 * For each candidate it fails closed if that exchange presents an unverified commercial claim
 * as a current fact — in visible text, hrefs, attributes, embedded JSON/script, JSON-LD or
 * metadata — inside its OWN scoped context: its `data-exchange-slug="<slug>"` blocks, its
 * dedicated `/<slug>/` root status page (only the seven that have one), and its `/go/<slug>/`
 * route. Codes/hosts/headlines collide across exchanges, so nothing is banned globally.
 *
 * Three token classes (R5):
 *   A. DISTINCTIVE affiliate/referral tokens (host+path with a real path or a referral query)
 *      and raw promo/referral codes — forbidden inside an exchange's scoped public context.
 *   B. The raw commercial destination — ALWAYS forbidden inside a non-commercial /go route
 *      (enforced by the generic "no external destination in /go" check).
 *   C. A plain official-homepage root (e.g. Coinbase → https://www.coinbase.com/) — allowed as
 *      a non-affiliate "visit official site" link on a neutral content page, so it is NOT a
 *      class-A token.
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

/** Exchanges that ship a maintained dedicated root status page (/<slug>/). */
const ROOT_STATUS_PAGES = new Set(['bybit', 'mexc', 'bitget', 'okx', 'kucoin', 'bingx', 'coinex']);

/** Referral-style query params that make an affiliate URL distinctive even with a shallow path. */
const REFERRAL_QUERY_KEYS = ['ref', 'rc', 'code', 'sharecode', 'referralcode', 'invite_code', 'invitecode', 'channel', 'af', 'aff', 'affiliate_id'];

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

const isRealUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim());
const isRealCode = (c) => typeof c === 'string' && c.trim() !== '' && c.trim() !== '#';

/**
 * Classify an affiliate URL. Returns a DISTINCTIVE `host+pathname` token when the URL has a real
 * path (not just "/") or a referral query param; otherwise null (a bare official-homepage root
 * that may legitimately appear as a "visit official site" link on a neutral page).
 */
function distinctiveAffiliateToken(u) {
  if (!isRealUrl(u)) return null;
  let url;
  try { url = new URL(u); } catch { return null; }
  const path = url.pathname.replace(/\/+$/, '');
  const hasPath = path !== '';
  const hasReferralQuery = [...url.searchParams.keys()].some((k) => REFERRAL_QUERY_KEYS.includes(k.toLowerCase()));
  if (!hasPath && !hasReferralQuery) return null; // bare official root → class C, allowed
  return (url.host + url.pathname).replace(/\/+$/, '');
}

/** Non-empty, sufficiently distinctive claim strings (avoid short/generic false positives). */
function claimStrings(...vals) {
  return vals.filter((v) => typeof v === 'string' && v.trim().length >= 10);
}

/**
 * Build the per-exchange forbidden inventory from the COMPLETE raw exchanges.json catalog, plus
 * the matching clean Offer where one exists.
 */
export async function buildPublicOfferForbiddenInventory() {
  const offers = await loadOffers();
  const exchanges = JSON.parse(readFileSync(join(ROOT, 'src/data/exchanges.json'), 'utf8'));
  const offerBySlug = new Map(offers.map((o) => [o.exchangeSlug, o]));
  const inv = {};
  for (const ex of exchanges) {
    if (!ex || typeof ex.slug !== 'string') continue;

    const codes = new Set();
    if (isRealCode(ex.promoCode)) codes.add(ex.promoCode.trim());
    for (const p of ex.promoCodes ?? []) if (p && isRealCode(p.code)) codes.add(p.code.trim());

    const affiliateTokens = new Set();
    const addAff = (u) => { const t = distinctiveAffiliateToken(u); if (t) affiliateTokens.add(t); };
    addAff(ex.affiliateUrl);
    addAff(ex.affiliateLinks?.default);
    for (const g of Object.values(ex.affiliateLinks?.geo ?? {})) addAff(g);

    const claims = new Set(claimStrings(ex.bonusTitle, ex.bonusNote, ex.realisticUserExpectation, ex.seoTitleOverride));

    const offer = offerBySlug.get(ex.slug);
    if (offer) {
      addAff(offer.sourceUrl);
      for (const c of claimStrings(offer.bonusHeadline, offer.realisticValue, offer.termsSummary)) claims.add(c);
      if (isRealCode(offer.promoCode)) codes.add(offer.promoCode.trim());
    }

    inv[ex.slug] = {
      codes: [...codes],
      affiliateTokens: [...affiliateTokens],
      claims: [...claims],
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

export function runPublicOfferOutputAudit(distDir, inventory) {
  const violations = [];
  if (!existsSync(distDir)) return { ok: false, scanned: 0, violations: [{ file: distDir, code: 'DIST_MISSING', message: 'dist not found — build first.' }] };
  const slugs = Object.keys(inventory);

  const dedicatedPage = (slug) => resolve(join(distDir, slug, 'index.html'));
  const goPage = (slug) => resolve(join(distDir, 'go', slug, 'index.html'));
  const dedicatedSet = new Map(slugs.filter((s) => ROOT_STATUS_PAGES.has(s)).map((s) => [dedicatedPage(s), s]));
  const goSet = new Map(slugs.map((s) => [goPage(s), s]));

  const files = walkHtml(distDir).filter((f) => {
    const rel = relative(distDir, f);
    return !rel.startsWith(EXCLUDED_GO_PREFIX) || goSet.has(resolve(f));
  });

  // A promo/referral code counts only as a whole token — NOT as a substring of a larger word.
  // (e.g. HTX's `cryptobonusw` is a prefix of the brand domain `cryptobonusworld.com`, and
  // Bybit's `CRYPTOBONUSW` is a prefix of BingX's `CRYPTOBONUSWORLD`.)
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const codeAppearsAsToken = (slice, code) => new RegExp(`(?<![A-Za-z0-9])${escapeRe(code)}(?![A-Za-z0-9])`).test(slice);

  // exchange-scoped forbidden checks for one string set inside a given HTML slice.
  const checkSlice = (rel, slice, slug, ctx) => {
    const inv = inventory[slug];
    for (const code of inv.codes) {
      if (codeAppearsAsToken(slice, code)) violations.push({ file: rel, code: `${slug.toUpperCase()}_CODE_IN_${ctx}`, message: `[${slug}] forbidden promo code "${code}" in ${ctx}.` });
    }
    for (const token of inv.affiliateTokens) {
      if (slice.includes(token)) violations.push({ file: rel, code: `${slug.toUpperCase()}_AFFILIATE_IN_${ctx}`, message: `[${slug}] affiliate destination "${token}" in ${ctx}.` });
    }
    for (const claim of inv.claims) {
      if (slice.includes(claim)) violations.push({ file: rel, code: `${slug.toUpperCase()}_CLAIM_IN_${ctx}`, message: `[${slug}] forbidden commercial claim "${String(claim).slice(0, 44)}…" in ${ctx}.` });
    }
  };

  for (const f of files) {
    const rel = relative(distDir, f).replace(/\\/g, '/');
    const html = readFileSync(f, 'utf8');
    const abs = resolve(f);

    // (a) exchange-tagged blocks on any shared page → that exchange's forbidden set.
    for (const slug of slugs) {
      for (const block of exchangeBlocks(html, slug)) checkSlice(rel, block, slug, 'BLOCK');
    }

    // (b) a dedicated exchange root page is entirely that exchange's scope.
    if (dedicatedSet.has(abs)) {
      const slug = dedicatedSet.get(abs);
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

  // Every candidate's /go route must EXIST and be audited (guard against silent skip). Dedicated
  // root pages are only required for the seven exchanges that maintain one.
  for (const slug of slugs) {
    if (ROOT_STATUS_PAGES.has(slug) && !existsSync(dedicatedPage(slug))) violations.push({ file: `${slug}/index.html`, code: `${slug.toUpperCase()}_PAGE_MISSING`, message: `Expected dedicated /${slug}/ page.` });
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
  const n = Object.keys(inventory).length;
  if (ok) {
    console.log(`PASS: public-offer output audit V2 — ${scanned} HTML files scanned across ${n} commercial candidates (incl. all /go/<slug>/); no unverified commercial claim, promo code, affiliate destination, /go CTA or verified label in any candidate's public output.`);
    process.exit(0);
  }
  console.error(`FAIL: public-offer output audit V2 (${violations.length} violation(s) across ${n} candidates):`);
  for (const v of violations) console.error(`  [${v.code}] ${v.file}: ${v.message}`);
  process.exit(1);
}
