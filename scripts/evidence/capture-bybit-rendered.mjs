#!/usr/bin/env node
/**
 * Public anonymous rendered-capture runner — Bybit (Issue #254).
 *
 * Observes ONLY what an unauthenticated public browser sees, in a fresh ephemeral
 * Chromium context. It NEVER: logs in, imports cookies/storage, uses a persistent
 * profile, a proxy, HTTP credentials or extensions; submits forms; downloads;
 * bypasses CAPTCHA/geo/anti-bot; clicks affiliate/registration controls; or
 * navigates outside the official Bybit host. Any wall/error is classified
 * honestly and the capture stops — no bypass, no retry loop that hides the result.
 *
 * This is a MANUAL command (never run in build/CI). It requires `--live
 * --confirm-live` to touch the network. It emits normalized, bounded, copyright-
 * safe PublicRenderedCapture artifacts (validated against the contract) — no full
 * HTML, page text, cookies, tokens, HAR, video or cache is ever written.
 *
 *   npm run evidence:capture:bybit:rendered -- --live --confirm-live
 */
import { build } from 'esbuild';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const args = new Set(process.argv.slice(2));
const LIVE = args.has('--live') && args.has('--confirm-live');

const URLS = [
  { captureId: 'rendered-new-user', url: 'https://www.bybit.com/en/promo/new-user/' },
  { captureId: 'rendered-welcome-gifts', url: 'https://www.bybit.com/en/promo/global/welcome-gifts/' },
];
const OFFICIAL = (u) => { try { const h = new URL(u).hostname.toLowerCase(); return new URL(u).protocol === 'https:' && (h === 'bybit.com' || h === 'www.bybit.com' || h.endsWith('.bybit.com')); } catch { return false; } };
const VIEWPORT = { width: 1280, height: 900 };
const LOCALE = 'en-US';
const MAX_FRAGMENT = 300;

function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
function bounded(s) { return norm(s).slice(0, MAX_FRAGMENT); }

// Transpile the contract to reuse its exact digest + validation logic.
async function loadContract() {
  const tmp = mkdtempSync(join(tmpdir(), 'cbw-rendered-'));
  const outfile = join(tmp, 'c.mjs');
  await build({
    stdin: {
      contents:
        `export { computeFragmentDigest, computeRenderedArtifactDigest, validatePublicRenderedCapture } from ${JSON.stringify(join(ROOT, 'src/data/contracts/publicRenderedCapture.ts'))};\n` +
        `export { BYBIT_OFFER_CLAIM_INVENTORY } from ${JSON.stringify(join(ROOT, 'src/data/contracts/offerEvidencePacket.ts'))};`,
      resolveDir: ROOT, loader: 'ts',
    },
    bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent',
  });
  const m = await import(pathToFileURL(outfile).href);
  return { m, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}

function classify({ status, finalUrl, requestedUrl, title, sampleText }) {
  const t = (title + ' ' + sampleText).toLowerCase();
  if (/captcha|are you a human|verify you are human|unusual traffic|access denied|checking your browser|px-captcha|geo\.captcha|cloudflare/.test(t)) return 'captcha_or_bot_wall';
  if (/\/login|log in to continue|sign in to (view|continue)|please log in/.test((finalUrl + ' ' + t))) return 'login_wall';
  if (/not available in your (region|country|location)|restricted in your (region|country)|access from your location|service is not available in your/.test(t)) return 'geo_restricted';
  const hasOffer = /bonus|welcome|usdt|reward|voucher|deposit/.test(t);
  if (status && status >= 300 && status < 400) return 'redirect_only';
  if (finalUrl !== requestedUrl && !hasOffer) return 'redirect_only';
  if (!norm(sampleText)) return 'empty';
  if (hasOffer) return 'rendered';
  return 'empty';
}

async function captureOne(browser, m, target) {
  const capturedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const ephemeralContext = { persistentProfileUsed: false, importedStorageState: false, proxyUsed: false, authenticationUsed: false, formSubmissionPerformed: false, downloadPerformed: false };
  const warnings = [];
  const limitations = ['OFFICIAL_SOURCE_ONLY anonymous ephemeral render: no account, cookies, proxy, storage or forms.', 'Only bounded normalized fragments and metadata are recorded; no full page content.'];
  const context = await browser.newContext({ viewport: VIEWPORT, locale: LOCALE, javaScriptEnabled: true });
  const page = await context.newPage();
  page.on('download', (d) => { ephemeralContext.downloadPerformed = true; warnings.push('download event blocked'); d.cancel().catch(() => {}); });
  page.on('filechooser', () => { warnings.push('file chooser blocked'); });
  context.on('page', (p) => { const u = p.url(); if (u && u !== 'about:blank' && !OFFICIAL(u)) { warnings.push('non-official popup blocked'); p.close().catch(() => {}); } });

  let status = null, contentType = null, finalUrl = target.url, redirectChain = [], title = null, sampleText = '', outcome = 'unsupported';
  try {
    const resp = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (resp) {
      status = resp.status();
      contentType = (resp.headers()['content-type'] || null);
      if (contentType) contentType = contentType.split(';')[0].trim();
      let req = resp.request().redirectedFrom();
      const chain = [];
      while (req) { chain.unshift(req.url()); req = req.redirectedFrom(); if (chain.length > 12) break; }
      redirectChain = chain.filter((u) => OFFICIAL(u));
      if (chain.some((u) => !OFFICIAL(u))) warnings.push('external redirect observed and excluded');
    }
    finalUrl = page.url();
    if (!OFFICIAL(finalUrl)) { warnings.push('final URL left official host'); outcome = 'redirect_only'; finalUrl = target.url; }
    title = bounded(await page.title().catch(() => ''));
    sampleText = norm((await page.evaluate(() => (document.body && document.body.innerText || '').slice(0, 4000)).catch(() => '')));
    outcome = classify({ status, finalUrl, requestedUrl: target.url, title, sampleText });
  } catch (e) {
    outcome = /timeout/i.test(String(e && e.message)) ? 'timeout' : 'network_error';
    warnings.push(`navigation ${outcome}: ${String(e && e.name)}`);
  }

  // Structured metadata (bounded, allowlisted scalars only).
  let meta = { pageTitle: title || null, description: null, canonicalUrl: null, ogTitle: null, ogDescription: null, jsonLdType: null };
  try {
    const md = await page.evaluate(() => {
      const g = (sel, attr) => { const el = document.querySelector(sel); return el ? (attr ? el.getAttribute(attr) : el.textContent) : null; };
      let jsonLdType = null;
      const s = document.querySelector('script[type="application/ld+json"]');
      if (s && s.textContent) { try { const j = JSON.parse(s.textContent); jsonLdType = Array.isArray(j) ? (j[0] && j[0]['@type']) : j['@type']; } catch {} }
      return {
        description: g('meta[name="description"]', 'content'),
        canonicalUrl: g('link[rel="canonical"]', 'href'),
        ogTitle: g('meta[property="og:title"]', 'content'),
        ogDescription: g('meta[property="og:description"]', 'content'),
        jsonLdType: typeof jsonLdType === 'string' ? jsonLdType : null,
      };
    });
    meta = {
      pageTitle: title || null,
      description: md.description ? bounded(md.description) : null,
      canonicalUrl: (md.canonicalUrl && OFFICIAL(md.canonicalUrl)) ? md.canonicalUrl : null,
      ogTitle: md.ogTitle ? bounded(md.ogTitle) : null,
      ogDescription: md.ogDescription ? bounded(md.ogDescription) : null,
      jsonLdType: md.jsonLdType ? bounded(md.jsonLdType) : null,
    };
  } catch { /* leave defaults */ }

  // Bounded fragments — extracted ONLY when the outcome permits claim support.
  const fragments = [];
  if (outcome === 'rendered') {
    const push = (extractionType, locator, text, claimIds) => {
      const t = bounded(text);
      if (!t) return;
      const frag = { fragmentId: `${target.captureId}-f${fragments.length + 1}`, captureId: target.captureId, extractionType, locator, text: t, textLength: t.length, claimIds, limitations: 'Bounded normalized extract; presence of text does not by itself support a claim.' };
      frag.fragmentDigest = m.computeFragmentDigest(frag);
      fragments.push(frag);
    };
    if (meta.description) push('meta', 'meta[name="description"]', meta.description, []);
    if (meta.ogTitle) push('meta', 'meta[property="og:title"]', meta.ogTitle, []);
  }

  await context.close();

  const capture = {
    captureId: target.captureId, exchangeId: 'bybit', requestedUrl: target.url,
    finalUrl: OFFICIAL(finalUrl) ? finalUrl : target.url, redirectChain, capturedAt,
    browserName: 'chromium', browserVersion: browser.version(), runtimeVersion: process.version,
    ephemeralContext, viewport: VIEWPORT, locale: LOCALE,
    mainDocumentStatus: status, contentType, pageTitle: title || null, outcome,
    fragments, structuredMetadata: meta, warnings, limitations, normalizedArtifactDigest: 'sha256:' + '0'.repeat(64),
  };
  capture.normalizedArtifactDigest = m.computeRenderedArtifactDigest(capture);
  const v = m.validatePublicRenderedCapture(capture, m.BYBIT_OFFER_CLAIM_INVENTORY);
  if (!v.ok) { console.error(`[capture ${target.captureId}] VALIDATION FAILED:`, v.issues); }
  return capture;
}

async function main() {
  if (!LIVE) {
    console.log('DRY RUN — no network access. Re-run with: --live --confirm-live');
    console.log('This runner observes only public anonymous content and never authenticates or bypasses walls.');
    return;
  }
  const { chromium } = await import('playwright');
  const { m, cleanup } = await loadContract();
  const browser = await chromium.launch({ headless: true });
  try {
    const captures = [];
    for (const target of URLS) captures.push(await captureOne(browser, m, target));
    const outPath = join(ROOT, 'scripts/evidence/out-bybit-rendered.json');
    writeFileSync(outPath, JSON.stringify(captures, null, 2));
    for (const c of captures) {
      console.log(`\n=== ${c.captureId} ===`);
      console.log(`requested: ${c.requestedUrl}`);
      console.log(`final:     ${c.finalUrl}`);
      console.log(`redirects: ${c.redirectChain.length ? c.redirectChain.join(' -> ') : '(none captured)'}`);
      console.log(`status:    ${c.mainDocumentStatus}  contentType: ${c.contentType}`);
      console.log(`capturedAt:${c.capturedAt}  browser: ${c.browserName}/${c.browserVersion}  node: ${c.runtimeVersion}`);
      console.log(`outcome:   ${c.outcome}  fragments: ${c.fragments.length}`);
      console.log(`digest:    ${c.normalizedArtifactDigest}`);
      if (c.warnings.length) console.log(`warnings:  ${c.warnings.join(' | ')}`);
    }
    console.log(`\nWrote ${captures.length} rendered capture(s) → ${outPath}`);
  } finally {
    await browser.close();
    cleanup();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
