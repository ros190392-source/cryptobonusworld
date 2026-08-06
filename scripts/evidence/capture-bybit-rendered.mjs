#!/usr/bin/env node
/**
 * Public anonymous rendered-capture runner — Bybit (Issue #254, hardened R1–R9).
 *
 * Observes ONLY what an unauthenticated public browser sees, in a fresh ephemeral
 * Chromium context. It NEVER: logs in, imports cookies/storage, uses a persistent
 * profile, a proxy, HTTP credentials or extensions; submits forms; downloads;
 * bypasses CAPTCHA/geo/anti-bot; clicks affiliate/registration controls; or
 * navigates the MAIN DOCUMENT outside the official Bybit host — any such navigation
 * is ABORTED before content is read and classified as `external_redirect` (R1). Any
 * wall/error is classified honestly and the capture stops — no bypass, no retry
 * loop that hides the result.
 *
 * This is a MANUAL command (never run in build/CI). It requires `--live
 * --confirm-live` to touch the network. It emits normalized, bounded, copyright-
 * safe PublicRenderedCapture artifacts (validated against the contract) — no full
 * HTML, page text, cookies, tokens, HAR, video or cache is ever written. If a
 * generated capture fails contract validation the runner writes NO committed
 * artifact, dumps a clearly-named transient rejected file for local debugging, and
 * exits non-zero (never silently returns an invalid capture).
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
const OFFICIAL = (u) => { try { const p = new URL(u); const h = p.hostname.toLowerCase(); return p.protocol === 'https:' && !p.username && !p.password && (h === 'bybit.com' || h === 'www.bybit.com' || h.endsWith('.bybit.com')); } catch { return false; } };
const VIEWPORT = { width: 1280, height: 900 };
const LOCALE = 'en-US';
const MAX_FRAGMENT = 300;

function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
function bounded(s) { return norm(s).slice(0, MAX_FRAGMENT); }

/**
 * R5 — code-owned, claim-oriented extraction plan. A runtime fragment may be
 * associated with a claim ONLY through a rule declared here for that exact claim,
 * via a narrowly-scoped locator. No broad document.body text ever becomes claim
 * evidence. Presence of matching text never auto-marks a claim supported — the
 * packet layer + human review decide that. (Anonymous promo pages are client-
 * rendered/redirecting, so in practice most rules find nothing.)
 */
const BYBIT_RENDERED_EXTRACTION_PLAN = [
  { claimId: 'bybit.bonus_headline', extractionType: 'visible_text', locator: 'h1, [data-testid*="reward"], [class*="reward-amount"]', pattern: /\b(up to\s*)?[\d,]+\s*USDT\b/i, limitation: 'Headline figure is region/tier-dependent; a matched figure still requires human confirmation of exact CBW wording.' },
  { claimId: 'bybit.fee_discount', extractionType: 'visible_text', locator: '[class*="fee"], [data-testid*="fee"]', pattern: /\b\d{1,3}%\s*(fee|trading fee)\b/i, limitation: 'Fee-discount wording is promo-specific and may not equal the CBW summary.' },
  { claimId: 'bybit.min_deposit', extractionType: 'visible_text', locator: '[class*="deposit"], [data-testid*="deposit"]', pattern: /\bmin(imum)?\s*deposit\b/i, limitation: 'Minimum-deposit figure varies by bonus tier.' },
  { claimId: 'bybit.availability', extractionType: 'visible_text', locator: '[class*="eligib"], [class*="availab"]', pattern: /\b(eligib|availab|region)\w*/i, limitation: 'Availability is region-dependent and geo-served.' },
  { claimId: 'bybit.restricted_countries', extractionType: 'visible_text', locator: '[class*="restrict"], [class*="excluded"]', pattern: /\b(restricted|excluded|not available)\b/i, limitation: 'Restriction lists are legal/region-specific.' },
  { claimId: 'bybit.terms_summary', extractionType: 'json_ld', locator: 'script[type="application/ld+json"]', pattern: null, limitation: 'Structured-data terms rarely mirror the CBW summary; human confirmation required.' },
];

function classify({ status, finalUrl, requestedUrl, title, sampleText, externalBlocked }) {
  if (externalBlocked) return 'external_redirect';
  const t = (title + ' ' + sampleText).toLowerCase();
  if (/captcha|are you a human|verify you are human|unusual traffic|access denied|checking your browser|px-captcha|geo\.captcha|cloudflare/.test(t)) return 'captcha_or_bot_wall';
  if (/\/login|log in to continue|sign in to (view|continue)|please log in/.test((finalUrl + ' ' + t))) return 'login_wall';
  if (/not available in your (region|country|location)|restricted in your (region|country)|access from your location|service is not available in your/.test(t)) return 'geo_restricted';
  const hasOffer = /bonus|welcome|usdt|reward|voucher|deposit/.test(t);
  if (status && status >= 300 && status < 400) return 'redirect_only';
  if (finalUrl && finalUrl !== requestedUrl && !hasOffer) return 'redirect_only';
  if (!norm(sampleText)) return 'empty';
  if (hasOffer) return 'rendered';
  return 'empty';
}

async function captureOne(browser, m, target) {
  const capturedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const ephemeralContext = { persistentProfileUsed: false, importedStorageState: false, proxyUsed: false, authenticationUsed: false, formSubmissionPerformed: false, downloadPerformed: false };
  const receipt = {
    persistentContextUsed: false, storageStateImported: false, proxyConfigured: false, httpCredentialsConfigured: false,
    initialCookieCount: 0, initialLocalStorageEntryCount: 0, initialSessionStorageEntryCount: 0,
    formSubmissionsObserved: 0, downloadsObserved: 0, fileChoosersObserved: 0, externalMainFrameNavigationsBlocked: 0,
    artifactContainsCookieValues: false,
  };
  const warnings = [];
  const limitations = ['OFFICIAL_SOURCE_ONLY anonymous ephemeral render: no account, cookies, proxy, storage or forms.', 'Only bounded normalized fragments and metadata are recorded; no full page content.'];
  // No storageState, no userDataDir, no proxy, no httpCredentials → ephemeral only.
  const context = await browser.newContext({ viewport: VIEWPORT, locale: LOCALE, javaScriptEnabled: true });
  const page = await context.newPage();
  let externalBlocked = false;

  // R1 — block external MAIN-DOCUMENT navigation BEFORE any content is read.
  await context.route('**/*', (route, request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame() && !OFFICIAL(request.url())) {
      externalBlocked = true;
      receipt.externalMainFrameNavigationsBlocked += 1;
      warnings.push('external main-document navigation blocked');
      route.abort();
      return;
    }
    route.continue();
  });
  page.on('download', (d) => { ephemeralContext.downloadPerformed = true; receipt.downloadsObserved += 1; warnings.push('download event blocked'); d.cancel().catch(() => {}); });
  page.on('filechooser', () => { receipt.fileChoosersObserved += 1; warnings.push('file chooser blocked'); });
  context.on('page', (p) => { const u = p.url(); if (u && u !== 'about:blank' && !OFFICIAL(u)) { warnings.push('non-official popup blocked'); p.close().catch(() => {}); } });

  let status = null, contentType = null, finalUrl = null, redirectChain = [], title = null, sampleText = '', outcome = 'unsupported';
  try {
    const resp = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (resp) {
      status = resp.status();
      contentType = (resp.headers()['content-type'] || null);
      if (contentType) contentType = contentType.split(';')[0].trim();
      let req = resp.request().redirectedFrom();
      const chain = [];
      while (req) { chain.unshift(req.url()); req = req.redirectedFrom(); if (chain.length > 12) break; }
      if (chain.some((u) => !OFFICIAL(u))) { externalBlocked = true; warnings.push('external redirect observed in chain'); }
      redirectChain = chain.filter((u) => OFFICIAL(u));
    }
    const landed = page.url();
    // R1/R2: only keep an official final URL; otherwise finalUrl stays null and
    // no title/body/metadata is read from a non-official document.
    if (OFFICIAL(landed) && !externalBlocked) {
      finalUrl = landed;
      title = bounded(await page.title().catch(() => ''));
      sampleText = norm((await page.evaluate(() => (document.body && document.body.innerText || '').slice(0, 4000)).catch(() => '')));
    } else if (!externalBlocked) {
      externalBlocked = true;
      warnings.push('final URL left official host');
    }
    outcome = classify({ status, finalUrl, requestedUrl: target.url, title, sampleText, externalBlocked });
  } catch (e) {
    if (externalBlocked) outcome = 'external_redirect';
    else outcome = /timeout/i.test(String(e && e.message)) ? 'timeout' : 'network_error';
    warnings.push(`navigation ${outcome}: ${String(e && e.name)}`);
  }

  // Structured metadata (bounded, allowlisted scalars) — only from an official doc.
  let meta = { pageTitle: title || null, description: null, canonicalUrl: null, ogTitle: null, ogDescription: null, jsonLdType: null };
  if (finalUrl && !externalBlocked) {
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
  }

  // Bounded, claim-oriented fragments — extracted ONLY when the outcome permits
  // claim support, and ONLY via the code-owned per-claim extraction plan (R5).
  const fragments = [];
  if (outcome === 'rendered' && finalUrl) {
    for (const rule of BYBIT_RENDERED_EXTRACTION_PLAN) {
      let text = '';
      try {
        text = norm(await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el ? (el.textContent || '') : '';
        }, rule.locator).catch(() => ''));
      } catch { text = ''; }
      if (!text) continue;
      if (rule.pattern && !rule.pattern.test(text)) continue;
      const t = bounded(text);
      if (!t) continue;
      const frag = { fragmentId: `${target.captureId}-${rule.claimId.replace(/[^a-z0-9]+/g, '-')}`, captureId: target.captureId, extractionType: rule.extractionType, locator: rule.locator.slice(0, 200), text: t, textLength: t.length, claimIds: [rule.claimId], limitations: rule.limitation };
      frag.fragmentDigest = m.computeFragmentDigest(frag);
      fragments.push(frag);
    }
  }

  await context.close();

  const capture = {
    captureId: target.captureId, exchangeId: 'bybit', requestedUrl: target.url,
    finalUrl, redirectChain, capturedAt,
    browserName: 'chromium', browserVersion: browser.version(), runtimeVersion: process.version,
    ephemeralContext, runtimeReceipt: receipt, viewport: VIEWPORT, locale: LOCALE,
    mainDocumentStatus: status, contentType, pageTitle: title || null, outcome,
    fragments, structuredMetadata: meta, warnings, limitations, normalizedArtifactDigest: 'sha256:' + '0'.repeat(64),
  };
  capture.normalizedArtifactDigest = m.computeRenderedArtifactDigest(capture);
  const v = m.validatePublicRenderedCapture(capture, m.BYBIT_OFFER_CLAIM_INVENTORY);
  return { capture, validation: v };
}

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
    const results = [];
    for (const target of URLS) results.push(await captureOne(browser, m, target));
    const rejected = results.filter((r) => !r.validation.ok);

    for (const { capture: c, validation } of results) {
      console.log(`\n=== ${c.captureId} ===`);
      console.log(`requested: ${c.requestedUrl}`);
      console.log(`final:     ${c.finalUrl === null ? '(null)' : c.finalUrl}`);
      console.log(`redirects: ${c.redirectChain.length ? c.redirectChain.join(' -> ') : '(none captured)'}`);
      console.log(`status:    ${c.mainDocumentStatus}  contentType: ${c.contentType}`);
      console.log(`capturedAt:${c.capturedAt}  browser: ${c.browserName}/${c.browserVersion}  node: ${c.runtimeVersion}`);
      console.log(`outcome:   ${c.outcome}  fragments: ${c.fragments.length}  extNavBlocked: ${c.runtimeReceipt.externalMainFrameNavigationsBlocked}`);
      console.log(`digest:    ${c.normalizedArtifactDigest}`);
      if (c.warnings.length) console.log(`warnings:  ${c.warnings.join(' | ')}`);
      if (!validation.ok) console.log(`VALIDATION FAILED: ${JSON.stringify(validation.issues)}`);
    }

    // Runner exit/output policy: never write a committed artifact for an invalid
    // capture; dump a clearly-named transient rejected file and exit non-zero.
    if (rejected.length) {
      const rejPath = join(ROOT, 'scripts/evidence/out-bybit-rendered.rejected.json');
      writeFileSync(rejPath, JSON.stringify(rejected.map((r) => ({ issues: r.validation.issues, capture: r.capture })), null, 2));
      console.error(`\n${rejected.length} capture(s) FAILED contract validation → NOT writing evidence output.`);
      console.error(`Transient rejected artifact (do NOT commit): ${rejPath}`);
      process.exitCode = 1;
      return;
    }

    const captures = results.map((r) => r.capture);
    const outPath = join(ROOT, 'scripts/evidence/out-bybit-rendered.json');
    writeFileSync(outPath, JSON.stringify(captures, null, 2));
    console.log(`\nWrote ${captures.length} validated rendered capture(s) → ${outPath}`);
  } finally {
    await browser.close();
    cleanup();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
