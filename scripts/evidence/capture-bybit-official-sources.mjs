#!/usr/bin/env node
/**
 * Public anonymous OFFICIAL-SOURCE capture runner — Bybit (Issue #260, hardened R2–R12).
 *
 * Probes ONLY the code-owned official Bybit candidates. NEVER: logs in, sends/imports
 * cookies or storage, uses a proxy/VPN/geo bypass, bypasses CAPTCHA/anti-bot, registers,
 * performs KYC/deposit/transaction/account actions, submits a form or clicks an affiliate
 * link. Each capture binds to its candidate + the code-owned plan id/digest (R2), carries
 * a structured scope + currency assessment (R5), and is HTTP-first with a bounded
 * ephemeral-render fallback where the candidate allows (R6). Resource limits bound every
 * response (R11). Output is validated against the contract; invalid output is never
 * written to the committed evidence path.
 *
 * MANUAL command — requires `--live --confirm-live` to touch the network; the default run
 * performs NO network access. Offline replay (CI-safe): `--replay <artifacts.json>`.
 *
 *   npm run evidence:capture:bybit:official-sources -- --live --confirm-live
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const args = new Set(argv);
const LIVE = args.has('--live') && args.has('--confirm-live');
const REPLAY_IDX = argv.indexOf('--replay');
const REPLAY = REPLAY_IDX >= 0 ? argv[REPLAY_IDX + 1] : null;

const OFFICIAL = (u) => { try { const p = new URL(u); const h = p.hostname.toLowerCase(); return p.protocol === 'https:' && !p.username && !p.password && (h === 'bybit.com' || h === 'www.bybit.com' || h.endsWith('.bybit.com')); } catch { return false; } };
const MAX_FRAGMENT = 300;
const MAX_REDIRECTS = 10;
const MAX_BYTES = 3_000_000;          // R11 — response byte cap
const DEADLINE_MS = 25_000;           // R11 — per-source total runtime deadline
const CONTENT_TYPE_ALLOW = ['text/html', 'application/xhtml+xml'];
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
const bounded = (s) => norm(s).slice(0, MAX_FRAGMENT);
const sha256 = (s) => 'sha256:' + createHash('sha256').update(s, 'utf8').digest('hex');
const iso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

/** R11 — bounded streaming read; aborts on overflow, returns {body, truncated, bytes}. */
async function readBounded(res) {
  if (!res.body) { const b = await res.text().catch(() => ''); return { body: b.slice(0, MAX_BYTES), bytes: Buffer.byteLength(b, 'utf8'), truncated: Buffer.byteLength(b, 'utf8') > MAX_BYTES }; }
  const reader = res.body.getReader();
  let received = 0; const chunks = []; let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BYTES) { truncated = true; try { await reader.cancel(); } catch {} break; }
    chunks.push(Buffer.from(value));
  }
  return { body: Buffer.concat(chunks).toString('utf8'), bytes: received, truncated };
}

/** R4 — candidate-aware content detection: each source class has its own "content" test. */
function hasRelevantContent(scope, text) {
  const t = text.toLowerCase();
  if (t.length < 400) return false;
  switch (scope) {
    case 'promotion_specific':
    case 'campaign_terms':
      return /\bup to\s*[\d,]+\s*usdt\b|welcome (?:package|bonus|gift)|new[- ]user (?:promo|reward)/.test(t);
    case 'identity_verification_general':
      return /identity verification|kyc|verify your identity/.test(t);
    case 'legal_restrictions':
    case 'jurisdiction_specific':
      return /restricted|prohibited|jurisdiction|not available|excluded/.test(t);
    case 'reward_mechanics':
      return /voucher|coupon|bonus|reward|redeem/.test(t);
    default:
      return t.length > 800;
  }
}

function classifyScope(scope, finalUrl, hasContent) {
  // Redirect to generic homepage → account_wide_general (medium confidence from URL).
  if (finalUrl) {
    try { const p = new URL(finalUrl); const path = p.pathname.replace(/\/+$/, ''); if (path === '' || path === '/en') return { classifiedScope: 'account_wide_general', classificationRuleId: 'redirected-to-generic-homepage', confidence: 'medium', evidenceRefs: [] }; } catch {}
  }
  // Client-render shell / no content → retain declared scope but confidence none (unconfirmed).
  if (!hasContent) return { classifiedScope: scope, classificationRuleId: 'declared-scope-unconfirmed-client-render', confidence: 'none', evidenceRefs: [] };
  return { classifiedScope: scope, classificationRuleId: 'declared-scope-content-observed', confidence: 'high', evidenceRefs: [] };
}

function classifyOutcome({ error, timedOut, tooLarge, externalBlocked, unsupportedType, status, finalUrl, requestedUrl, bodyText, scope }) {
  if (timedOut) return 'timeout';
  if (tooLarge) return 'response_too_large';
  if (externalBlocked) return 'external_redirect';
  if (error) return 'network_error';
  if (!finalUrl || !OFFICIAL(finalUrl)) return 'external_redirect';
  if (unsupportedType) return 'unsupported';
  if (status === 404) return 'not_found';
  const t = norm(bodyText).toLowerCase();
  if (/captcha|are you a human|verify you are human|unusual traffic|access denied|checking your browser|cloudflare/.test(t)) return 'captcha_or_bot_wall';
  if (/log in to continue|sign in to (?:view|continue)|please log in/.test(t)) return 'login_wall';
  if (/not available in your (?:region|country|location)|service is not available in your/.test(t)) return 'geo_restricted';
  if (/this article is currently not supported on this site/.test(t)) return 'spa_shell';
  if (status >= 300 && status < 400) return 'redirect_only';
  if (finalUrl !== requestedUrl && !hasRelevantContent(scope, t)) return 'redirect_only';
  if (!norm(bodyText)) return 'empty';
  if (hasRelevantContent(scope, t)) return 'content';
  return 'spa_shell';
}

async function probeHttp(url) {
  let cur = url; const redirectChain = []; const startedAt = Date.now();
  let status = null, contentType = null, finalUrl = null, body = '', bytes = 0;
  let error = false, timedOut = false, tooLarge = false, externalBlocked = false, unsupportedType = false;
  let redirectsObserved = 0, externalRedirectsBlocked = 0;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (Date.now() - startedAt > DEADLINE_MS) { timedOut = true; break; }
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), Math.max(1000, DEADLINE_MS - (Date.now() - startedAt)));
      let res;
      try { res = await fetch(cur, { redirect: 'manual', signal: ac.signal, headers: { 'user-agent': 'Mozilla/5.0 (CBW anonymous official-source evidence probe)' } }); }
      finally { clearTimeout(timer); }
      status = res.status;
      contentType = (res.headers.get('content-type') || '').split(';')[0].trim() || null;
      if (status >= 300 && status < 400) {
        const loc = res.headers.get('location');
        if (!loc) { finalUrl = OFFICIAL(cur) ? cur : null; break; }
        const next = new URL(loc, cur).toString();
        redirectsObserved += 1;
        if (!OFFICIAL(next)) { externalBlocked = true; externalRedirectsBlocked += 1; break; }
        redirectChain.push(next); cur = next; continue;
      }
      finalUrl = OFFICIAL(cur) ? cur : null;
      if (!finalUrl) { externalBlocked = true; break; }
      if (contentType && !CONTENT_TYPE_ALLOW.includes(contentType)) { unsupportedType = true; break; }
      const r = await readBounded(res); body = r.body; bytes = r.bytes; tooLarge = r.truncated;
      break;
    }
  } catch (e) { if (/abort/i.test(String(e && e.name))) timedOut = true; else error = true; }
  return { status, contentType, finalUrl, body, bytes, error, timedOut, tooLarge, externalBlocked, unsupportedType, redirectChain, redirectsObserved, externalRedirectsBlocked };
}

async function renderFallback(url) {
  // R6 — fresh ephemeral Chromium, no persistent profile/storage/proxy/creds/forms.
  let chromium;
  try { ({ chromium } = await import('playwright')); } catch { return { available: false }; }
  const browser = await chromium.launch({ headless: true });
  let externalBlocked = false, status = null, contentType = null, finalUrl = null, bodyText = '', error = false, timedOut = false;
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await context.newPage();
    await context.route('**/*', (route, request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame() && !OFFICIAL(request.url())) { externalBlocked = true; route.abort(); return; }
      route.continue();
    });
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: DEADLINE_MS });
      if (resp) { status = resp.status(); contentType = (resp.headers()['content-type'] || '').split(';')[0].trim() || null; }
      const landed = page.url();
      if (OFFICIAL(landed) && !externalBlocked) { finalUrl = landed; bodyText = norm((await page.evaluate(() => (document.body && document.body.innerText || '').slice(0, 4000)).catch(() => ''))); }
      else externalBlocked = true;
    } catch (e) { if (/timeout/i.test(String(e && e.message))) timedOut = true; else error = true; }
    await context.close();
  } finally { await browser.close(); }
  return { available: true, status, contentType, finalUrl, bodyText, error, timedOut, externalBlocked };
}

async function probeOne(m, candidate) {
  const requestedUrl = candidate.url;
  const capturedAt = iso();
  const warnings = [];
  const limitations = [
    'OFFICIAL_SOURCE_ONLY anonymous probe: no account, cookies, proxy, storage, forms or transactions.',
    'Only bounded normalized fragments + allowlisted scalar metadata + sha256 digests are recorded; no full page content.',
  ];
  const receipt = { authenticationUsed: false, cookiesSent: false, cookiesStored: false, proxyConfigured: false, bodyPersisted: false, redirectsObserved: 0, externalRedirectsBlocked: 0 };

  const http = await probeHttp(requestedUrl);
  receipt.redirectsObserved = http.redirectsObserved;
  receipt.externalRedirectsBlocked = http.externalRedirectsBlocked;
  const httpBodyText = norm(http.body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')).slice(0, 4000);
  let outcome = classifyOutcome({ ...http, requestedUrl, bodyText: httpBodyText, scope: candidate.declaredScope });
  let bodyText = httpBodyText;
  let status = http.status, contentType = http.contentType, finalUrl = http.finalUrl, redirectChain = http.redirectChain, responseBytes = http.bytes, body = http.body;
  let captureMethodUsed = 'http';

  // R6 — rendered fallback when HTTP is a shell/empty and the candidate allows it.
  if ((outcome === 'spa_shell' || outcome === 'empty') && candidate.captureMethod === 'http_then_rendered') {
    const rf = await renderFallback(requestedUrl);
    if (rf.available) {
      captureMethodUsed = 'http_then_rendered';
      if (rf.finalUrl && !rf.externalBlocked && !rf.error && !rf.timedOut) {
        const rOut = classifyOutcome({ error: false, timedOut: false, tooLarge: false, externalBlocked: false, unsupportedType: false, status: rf.status, finalUrl: rf.finalUrl, requestedUrl, bodyText: rf.bodyText, scope: candidate.declaredScope });
        if (rOut === 'content') { outcome = 'content'; bodyText = rf.bodyText; status = rf.status; contentType = rf.contentType; finalUrl = rf.finalUrl; body = rf.bodyText; responseBytes = Buffer.byteLength(rf.bodyText, 'utf8'); }
        else warnings.push(`rendered fallback did not yield content (${rOut})`);
      } else { warnings.push(`rendered fallback ${rf.timedOut ? 'timeout' : rf.externalBlocked ? 'external_redirect' : 'network_error'}`); }
    } else warnings.push('rendered fallback unavailable (playwright not installed)');
  }

  const noDoc = ['timeout', 'network_error', 'external_redirect', 'response_too_large'].includes(outcome);
  const hasContent = outcome === 'content';
  const scopeC = classifyScope(candidate.declaredScope, noDoc ? null : finalUrl, hasContent);
  const observedScope = scopeC.classifiedScope;
  const scopeAssessment = { classifiedScope: observedScope, classificationRuleId: scopeC.classificationRuleId, evidenceRefs: scopeC.evidenceRefs, confidence: scopeC.confidence, limitations: hasContent ? 'Scope confirmed from observed content.' : 'Scope not confirmed from server-observable content (client-rendered or redirected).' };
  const currency = 'ambiguous';
  const currencyAssessment = { currency, ruleId: 'insufficient-currentness-evidence', evidenceRefs: [], observedTime: null, limitations: 'No admissible currentness evidence observed; ambiguous cannot satisfy a requiresCurrent claim.' };

  let meta = { pageTitle: null, description: null, canonicalUrl: null, ogTitle: null, ogDescription: null, jsonLdType: null };
  if (!noDoc && body && captureMethodUsed === 'http') {
    const title = bounded((body.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '');
    const desc = (body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1] || null;
    const ogt = (body.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) || [])[1] || null;
    const canon = (body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) || [])[1] || null;
    meta = { pageTitle: title || null, description: desc ? bounded(desc) : null, canonicalUrl: canon && OFFICIAL(canon) ? canon : null, ogTitle: ogt ? bounded(ogt) : null, ogDescription: null, jsonLdType: null };
  }

  // Claim-oriented fragments — ONLY on a content outcome, via the code-owned plan.
  const fragments = [];
  if (hasContent && finalUrl) {
    for (const rule of m.BYBIT_OFFER_EXTRACTION_PLAN) {
      if (!candidate.targetClaimIds.includes(rule.claimId)) continue;
      if (rule.sourceClass !== observedScope) continue;
      if (rule.manualReviewRequired) continue; // manual strategies never auto-emit a supporting fragment
      if (!rule.pattern) continue;
      const match = bodyText.match(new RegExp(rule.pattern, 'i'));
      if (!match) continue;
      const text = bounded(match[0]);
      if (!text) continue;
      const frag = { fragmentId: `${candidate.candidateId}-${rule.assertionComponentId}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase(), sourceId: candidate.candidateId, extractionType: rule.extractionType, locator: rule.locator.slice(0, 200), text, textLength: text.length, claimIds: [rule.claimId], assertionComponentIds: [rule.assertionComponentId], stance: 'supports', limitation: rule.limitation };
      frag.fragmentDigest = m.computeOfficialFragmentDigest(frag);
      fragments.push(frag);
    }
  }
  const finalOutcome = (hasContent && fragments.length === 0) ? 'spa_shell' : outcome;

  const capture = {
    sourceId: candidate.candidateId, exchangeId: 'bybit', candidateId: candidate.candidateId,
    planId: m.BYBIT_SOURCE_PLAN_ID, planDigest: m.BYBIT_SOURCE_PLAN_DIGEST,
    requestedUrl, finalUrl: noDoc ? null : finalUrl, redirectChain: noDoc ? [] : redirectChain, capturedAt,
    captureMethod: 'http_probe_no_auth_no_cookies', captureTool: 'node-fetch anonymous redirect=manual + ephemeral chromium fallback', runtimeVersion: process.version,
    captureMethodUsed, httpStatus: noDoc ? null : status, contentType: noDoc ? null : contentType,
    declaredScope: candidate.declaredScope, observedScope, currency, scopeAssessment, currencyAssessment,
    outcome: finalOutcome, responseBytes: noDoc ? 0 : responseBytes, bodyDigest: sha256(noDoc ? '' : body),
    fragments, structuredMetadata: noDoc ? { pageTitle: null, description: null, canonicalUrl: null, ogTitle: null, ogDescription: null, jsonLdType: null } : meta,
    runtimeReceipt: receipt, warnings, limitations, sourceDigest: 'sha256:' + '0'.repeat(64),
  };
  capture.sourceDigest = m.computeOfficialSourceDigest(capture);
  const v = m.validateOfficialSourceCapture(capture, m.BYBIT_OFFER_CLAIM_INVENTORY);
  return { capture, validation: v };
}

async function loadContract() {
  const tmp = mkdtempSync(join(tmpdir(), 'cbw-official-'));
  const outfile = join(tmp, 'c.mjs');
  await build({
    stdin: {
      contents:
        `export { computeOfficialFragmentDigest, computeOfficialSourceDigest, validateOfficialSourceCapture } from ${JSON.stringify(join(ROOT, 'src/data/contracts/officialSourceCapture.ts'))};\n` +
        `export { BYBIT_OFFICIAL_SOURCE_CANDIDATES, BYBIT_OFFER_EXTRACTION_PLAN, BYBIT_SOURCE_PLAN_ID, BYBIT_SOURCE_PLAN_DIGEST, assessAllOfferClaims, validateSourcePlanCoverage, validateExtractionCoverage, buildOfficialSourceEvidenceRun } from ${JSON.stringify(join(ROOT, 'src/data/contracts/bybitOfferClaimSourcePlan.ts'))};\n` +
        `export { BYBIT_OFFER_CLAIM_INVENTORY } from ${JSON.stringify(join(ROOT, 'src/data/contracts/offerEvidencePacket.ts'))};`,
      resolveDir: ROOT, loader: 'ts',
    },
    bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent',
  });
  const m = await import(pathToFileURL(outfile).href);
  return { m, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}

function printSummary(m, captures, nowMs) {
  console.log('\n=== per-source outcomes ===');
  for (const c of captures) console.log(`${c.sourceId} [${c.declaredScope}→${c.observedScope}/${c.currency}] via ${c.captureMethodUsed} outcome=${c.outcome} status=${c.httpStatus} frags=${c.fragments.length}\n  ${c.requestedUrl} -> ${c.finalUrl ?? '(null)'}  digest=${c.sourceDigest}${c.warnings.length ? '\n  warn: ' + c.warnings.join(' | ') : ''}`);
  const run = m.buildOfficialSourceEvidenceRun(captures, nowMs, 'cli-run');
  console.log(`\n=== evidence run: ok=${run.ok} attempted=${run.attemptedCandidateIds.length}/${run.expectedCandidateIds.length} missing=[${run.missingCandidateIds.join(',')}] runDigest=${run.runDigest} ===`);
  console.log('\n=== deterministic claim assessment ===');
  for (const a of m.assessAllOfferClaims(captures, nowMs)) console.log(`${a.claimId} [${a.requirement}] → ${a.result}  (${a.components.filter((x) => x.proven).length}/${a.components.length}; ${a.reason})`);
}

async function replay(path) {
  const { m, cleanup } = await loadContract();
  try {
    const cov = m.validateSourcePlanCoverage(); const ext = m.validateExtractionCoverage();
    console.log(`source-plan coverage: ${cov.ok ? 'OK' : 'INVALID ' + JSON.stringify(cov.issues)}`);
    console.log(`extraction coverage: ${ext.ok ? 'OK' : 'INVALID ' + JSON.stringify(ext.issues)}`);
    const captures = JSON.parse(readFileSync(path, 'utf8'));
    let bad = 0;
    for (const c of captures) { const v = m.validateOfficialSourceCapture(c, m.BYBIT_OFFER_CLAIM_INVENTORY); if (!v.ok) { bad++; console.log(`REJECT ${c && c.sourceId}: ${JSON.stringify(v.issues)}`); } else console.log(`OK     ${c.sourceId} (outcome=${c.outcome}, digest recomputed)`); }
    printSummary(m, captures, Date.parse('2026-08-06T00:00:00Z'));
    if (bad || !cov.ok || !ext.ok) { console.error(`\nOFFLINE REPLAY FAILED.`); process.exitCode = 1; }
    else console.log('\nOFFLINE REPLAY OK — artifacts valid, coverage complete, all digests recompute.');
  } finally { cleanup(); }
}

async function main() {
  if (REPLAY) return replay(REPLAY);
  if (!LIVE) {
    console.log('DRY RUN — no network access. Re-run with: --live --confirm-live');
    const { m, cleanup } = await loadContract();
    try { const cov = m.validateSourcePlanCoverage(); const ext = m.validateExtractionCoverage(); console.log(`source-plan coverage: ${cov.ok ? 'OK' : 'INVALID ' + JSON.stringify(cov.issues)}`); console.log(`extraction coverage: ${ext.ok ? 'OK' : 'INVALID ' + JSON.stringify(ext.issues)}`); console.log(`candidates (${m.BYBIT_OFFICIAL_SOURCE_CANDIDATES.length}): ${m.BYBIT_OFFICIAL_SOURCE_CANDIDATES.map((c) => c.candidateId).join(', ')}`); } finally { cleanup(); }
    return;
  }
  const { m, cleanup } = await loadContract();
  try {
    const results = [];
    for (const cand of m.BYBIT_OFFICIAL_SOURCE_CANDIDATES) results.push(await probeOne(m, cand));
    const rejected = results.filter((r) => !r.validation.ok);
    const captures = results.map((r) => r.capture);
    printSummary(m, captures, Date.now());
    if (rejected.length) {
      const rejPath = join(ROOT, 'scripts/evidence/out-bybit-official-sources.rejected.json');
      writeFileSync(rejPath, JSON.stringify(rejected.map((r) => ({ issues: r.validation.issues, capture: r.capture })), null, 2));
      console.error(`\n${rejected.length} capture(s) FAILED contract validation → NOT writing evidence output. See ${rejPath}`);
      process.exitCode = 1; return;
    }
    const outPath = join(ROOT, 'scripts/evidence/out-bybit-official-sources.json');
    writeFileSync(outPath, JSON.stringify(captures, null, 2));
    console.log(`\nWrote ${captures.length} validated official-source capture(s) → ${outPath} (TRANSIENT; fold into the packet under human review).`);
  } finally { cleanup(); }
}

main().catch((e) => { console.error(e); process.exit(1); });
