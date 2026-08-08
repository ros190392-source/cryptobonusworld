#!/usr/bin/env node
/**
 * Global public-offer output audit V3 (Issues #266 + #269).
 *
 * #266 established a fail-closed public truth gate. #269 deliberately splits three
 * independent authorities:
 *   1. owner-confirmed registration LINK authority;
 *   2. owner-confirmed promo/referral CODE authority;
 *   3. evidence-driven OFFER-CLAIM authority.
 *
 * Therefore V3 no longer treats an exact confirmed code or an internal /go/<slug>/ hop as a
 * violation. Instead it proves that only exact owner-confirmed commercial values are usable,
 * while raw affiliate destinations never leak directly into content pages and unsupported
 * bonus/KYC/deposit/expiry/country/terms claims remain absent.
 *
 * Review/design fixtures under /__design/ are explicitly outside PUBLIC output scope. They
 * intentionally contain synthetic /go/demo-* contract examples and are validated by the
 * contract suite instead; treating them as production links would create false positives.
 *
 * Usage: node scripts/portal/public-offer-output-audit.mjs [distDir]
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

/** Load clean offers + exact owner authority through one temporary TypeScript bundle. */
async function loadGovernedData() {
  const tmp = mkdtempSync(join(tmpdir(), 'cbw-public-audit-'));
  const out = join(tmp, 'governed.mjs');
  try {
    const offersPath = join(ROOT, 'src/data/offers.ts');
    const ownerPath = join(ROOT, 'src/data/contracts/ownerConfirmedCommercialAuthority.ts');
    await build({
      stdin: {
        contents:
          `export { offers } from ${JSON.stringify(offersPath)};\n` +
          `export { resolveOwnerConfirmedCommercialAuthority } from ${JSON.stringify(ownerPath)};\n`,
        resolveDir: ROOT,
        loader: 'ts',
        sourcefile: 'public-offer-audit-entry.ts',
      },
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node20',
      outfile: out,
      logLevel: 'silent',
    });
    return await import(`${pathToFileURL(out).href}?v=${Date.now()}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const isRealUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim());
const isRealCode = (c) => typeof c === 'string' && c.trim() !== '' && c.trim() !== '#';

function distinctiveAffiliateToken(u) {
  if (!isRealUrl(u)) return null;
  let url;
  try { url = new URL(u); } catch { return null; }
  const path = url.pathname.replace(/\/+$/, '');
  const hasPath = path !== '';
  const hasReferralQuery = [...url.searchParams.keys()].some((k) => REFERRAL_QUERY_KEYS.includes(k.toLowerCase()));
  if (!hasPath && !hasReferralQuery) return null;
  return (url.host + url.pathname).replace(/\/+$/, '');
}

function claimStrings(...vals) {
  return vals.filter((v) => typeof v === 'string' && v.trim().length >= 10);
}

function addRealUrl(set, value) {
  if (isRealUrl(value)) set.add(value.trim());
}

/**
 * Build per-exchange audit inventory from raw catalog + clean offer + executable exact owner
 * authority. The raw catalog supplies what could leak; owner authority supplies the ONLY
 * commercial values allowed to be public.
 */
export async function buildPublicOfferForbiddenInventory() {
  const governed = await loadGovernedData();
  const offers = governed.offers;
  const exchanges = JSON.parse(readFileSync(join(ROOT, 'src/data/exchanges.json'), 'utf8'));
  const offerBySlug = new Map(offers.map((o) => [o.exchangeSlug, o]));
  const inv = {};

  for (const ex of exchanges) {
    if (!ex || typeof ex.slug !== 'string') continue;

    const rawCodes = new Set();
    if (isRealCode(ex.promoCode)) rawCodes.add(ex.promoCode.trim());
    for (const p of ex.promoCodes ?? []) if (p && isRealCode(p.code)) rawCodes.add(p.code.trim());

    const rawAffiliateUrls = new Set();
    addRealUrl(rawAffiliateUrls, ex.affiliateUrl);
    addRealUrl(rawAffiliateUrls, ex.affiliateLinks?.default);
    for (const g of Object.values(ex.affiliateLinks?.geo ?? {})) addRealUrl(rawAffiliateUrls, g);

    const claims = new Set(claimStrings(ex.bonusTitle, ex.bonusNote, ex.realisticUserExpectation, ex.seoTitleOverride));

    const offer = offerBySlug.get(ex.slug);
    if (offer) {
      addRealUrl(rawAffiliateUrls, offer.sourceUrl);
      for (const c of claimStrings(offer.bonusHeadline, offer.realisticValue, offer.termsSummary)) claims.add(c);
      if (isRealCode(offer.promoCode)) rawCodes.add(offer.promoCode.trim());
    }

    const authority = governed.resolveOwnerConfirmedCommercialAuthority(ex.slug);
    const allowedCode = authority?.promoCodeConfirmed ? authority.confirmedPromoCode : null;
    const allowedExternalUrls = new Set();
    if (authority?.linkConfirmed) {
      addRealUrl(allowedExternalUrls, authority.confirmedDefaultUrl);
      for (const g of Object.values(authority.confirmedGeoUrls ?? {})) addRealUrl(allowedExternalUrls, g);
    }

    const affiliateTokens = new Set();
    for (const u of rawAffiliateUrls) {
      const token = distinctiveAffiliateToken(u);
      if (token) affiliateTokens.add(token);
    }

    inv[ex.slug] = {
      rawCodes: [...rawCodes],
      allowedCode,
      forbiddenCodes: [...rawCodes].filter((c) => c !== allowedCode),
      rawAffiliateUrls: [...rawAffiliateUrls],
      allowedExternalUrls: [...allowedExternalUrls],
      affiliateTokens: [...affiliateTokens],
      claims: [...claims],
      linkConfirmed: authority?.linkConfirmed === true,
      promoCodeConfirmed: authority?.promoCodeConfirmed === true,
    };
  }
  return inv;
}

const EXCLUDED_GO_PREFIX = `go${sep}`;
const EXCLUDED_DESIGN_PREFIX = `__design${sep}`;

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

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const codeAppearsAsToken = (slice, code) => new RegExp(`(?<![A-Za-z0-9])${escapeRe(code)}(?![A-Za-z0-9])`).test(slice);

function urlAppears(slice, url) {
  if (!url) return false;
  const variants = new Set([
    url,
    url.replaceAll('&', '&amp;'),
    url.replaceAll('&', '\\u0026'),
    encodeURI(url),
  ]);
  return [...variants].some((v) => slice.includes(v));
}

/**
 * Common content checks. Confirmed promo code is allowed; any OTHER raw code is forbidden.
 * Raw affiliate destinations remain forbidden directly in ordinary public content even when
 * confirmed: content CTAs must use the internal /go/<slug>/ boundary instead.
 */
function checkContentSlice(violations, rel, slice, slug, ctx, inventory) {
  const inv = inventory[slug];

  for (const code of inv.forbiddenCodes) {
    if (codeAppearsAsToken(slice, code)) {
      violations.push({ file: rel, code: `${slug.toUpperCase()}_UNCONFIRMED_CODE_IN_${ctx}`, message: `[${slug}] unconfirmed promo code "${code}" in ${ctx}.` });
    }
  }

  for (const token of inv.affiliateTokens) {
    if (slice.includes(token)) {
      violations.push({ file: rel, code: `${slug.toUpperCase()}_DIRECT_AFFILIATE_IN_${ctx}`, message: `[${slug}] raw affiliate destination "${token}" leaked directly into ${ctx}; use /go/${slug}/ instead.` });
    }
  }

  for (const claim of inv.claims) {
    if (slice.includes(claim)) {
      violations.push({ file: rel, code: `${slug.toUpperCase()}_CLAIM_IN_${ctx}`, message: `[${slug}] unsupported commercial claim "${String(claim).slice(0, 44)}…" in ${ctx}.` });
    }
  }
}

/** /go is the ONLY surface allowed to contain the exact confirmed external destination. */
function checkGoSlice(violations, rel, html, slug, inventory) {
  const inv = inventory[slug];

  for (const code of inv.forbiddenCodes) {
    if (codeAppearsAsToken(html, code)) {
      violations.push({ file: rel, code: `${slug.toUpperCase()}_GO_UNCONFIRMED_CODE`, message: `[${slug}] /go contains an unconfirmed promo/referral code.` });
    }
  }
  for (const claim of inv.claims) {
    if (html.includes(claim)) {
      violations.push({ file: rel, code: `${slug.toUpperCase()}_GO_CLAIM`, message: `[${slug}] /go contains unsupported offer claim "${String(claim).slice(0, 44)}…".` });
    }
  }

  for (const rawUrl of inv.rawAffiliateUrls) {
    if (!urlAppears(html, rawUrl)) continue;
    if (!inv.allowedExternalUrls.includes(rawUrl)) {
      violations.push({ file: rel, code: `${slug.toUpperCase()}_GO_UNCONFIRMED_EXTERNAL`, message: `[${slug}] /go contains non-confirmed commercial destination: ${rawUrl.slice(0, 72)}` });
    }
  }

  if (inv.linkConfirmed) {
    if (!inv.allowedExternalUrls.some((u) => urlAppears(html, u))) {
      violations.push({ file: rel, code: `${slug.toUpperCase()}_GO_CONFIRMED_DESTINATION_MISSING`, message: `[${slug}] confirmed /go route does not contain an exact owner-confirmed destination.` });
    }
  } else {
    if (/\bsponsored\b/.test(html)) violations.push({ file: rel, code: `${slug.toUpperCase()}_GO_SPONSORED_WITHOUT_AUTHORITY`, message: `[${slug}] /go emits sponsored state without confirmed link authority.` });
    if (/cbw_affiliate_click/.test(html)) violations.push({ file: rel, code: `${slug.toUpperCase()}_GO_ANALYTICS_WITHOUT_AUTHORITY`, message: `[${slug}] /go emits affiliate analytics without confirmed link authority.` });
  }
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
    if (rel.startsWith(EXCLUDED_DESIGN_PREFIX)) return false;
    return !rel.startsWith(EXCLUDED_GO_PREFIX) || goSet.has(resolve(f));
  });

  for (const f of files) {
    const rel = relative(distDir, f).replace(/\\/g, '/');
    const html = readFileSync(f, 'utf8');
    const abs = resolve(f);

    // (a) exchange-tagged shared-page blocks: confirmed code and internal /go hop are allowed;
    // raw direct affiliate destination and unsupported claims are not.
    for (const slug of slugs) {
      for (const block of exchangeBlocks(html, slug)) checkContentSlice(violations, rel, block, slug, 'BLOCK', inventory);
    }

    // (b) dedicated exchange status page: same content rule. /go is allowed ONLY when link authority exists.
    if (dedicatedSet.has(abs)) {
      const slug = dedicatedSet.get(abs);
      const inv = inventory[slug];
      checkContentSlice(violations, rel, html, slug, 'PAGE', inventory);
      if (/\/go\//.test(html) && !inv.linkConfirmed) {
        violations.push({ file: rel, code: `${slug.toUpperCase()}_PAGE_GO_WITHOUT_AUTHORITY`, message: `[${slug}] dedicated page emits /go without confirmed link authority.` });
      }
      if (/>\s*✓?\s*Verified\b/.test(html)) {
        violations.push({ file: rel, code: `${slug.toUpperCase()}_PAGE_VERIFIED_LABEL`, message: `[${slug}] dedicated page presents a Verified offer status while current claim evidence is under re-verification.` });
      }
    }

    // (c) /go/<slug>/: exact confirmed external values are allowed; no others.
    if (goSet.has(abs)) {
      const slug = goSet.get(abs);
      checkGoSlice(violations, rel, html, slug, inventory);
    }
  }

  // Every current candidate's /go route must exist and be audited.
  for (const slug of slugs) {
    if (ROOT_STATUS_PAGES.has(slug) && !existsSync(dedicatedPage(slug))) {
      violations.push({ file: `${slug}/index.html`, code: `${slug.toUpperCase()}_PAGE_MISSING`, message: `Expected dedicated /${slug}/ page.` });
    }
    if (!existsSync(goPage(slug))) {
      violations.push({ file: `go/${slug}/index.html`, code: `${slug.toUpperCase()}_GO_MISSING`, message: `Expected /go/${slug}/ route in audit scope.` });
    }
  }

  // Any internal /go link anywhere in PUBLIC HTML must target a governed slug with confirmed
  // link authority. /__design/ fixtures were removed from `files` above and are contract-tested.
  for (const f of files) {
    const rel = relative(distDir, f).replace(/\\/g, '/');
    if (rel.startsWith('go/')) continue;
    const html = readFileSync(f, 'utf8');
    for (const match of html.matchAll(/\/go\/([a-z0-9-]+)\/?/g)) {
      const slug = match[1];
      if (!inventory[slug]?.linkConfirmed) {
        violations.push({ file: rel, code: 'UNAUTHORIZED_GO_LINK', message: `Public page emits /go/${slug}/ without exact owner-confirmed link authority.` });
      }
    }
  }

  return { ok: violations.length === 0, scanned: files.length, violations };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const distArg = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'dist');
  const inventory = await buildPublicOfferForbiddenInventory();
  const { ok, scanned, violations } = runPublicOfferOutputAudit(distArg, inventory);
  const n = Object.keys(inventory).length;
  if (ok) {
    console.log(`PASS: public-offer output audit V3 — ${scanned} public HTML files scanned across ${n} commercial candidates; exact owner-confirmed codes/routes allowed, direct raw affiliate leaks and unsupported offer claims absent.`);
    process.exit(0);
  }
  console.error(`FAIL: public-offer output audit V3 (${violations.length} violation(s) across ${n} candidates):`);
  for (const v of violations) console.error(`  [${v.code}] ${v.file}: ${v.message}`);
  process.exit(1);
}
