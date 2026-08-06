#!/usr/bin/env node
/**
 * Public anonymous OFFICIAL-SOURCE capture runner — Bybit (Issue #260).
 *
 * Probes ONLY the code-owned official Bybit source candidates
 * (`BYBIT_OFFICIAL_SOURCE_CANDIDATES`) with anonymous HTTPS requests — NEVER: logs in,
 * sends/imports cookies or storage, uses a proxy/VPN/geo-bypass, bypasses CAPTCHA/anti-
 * bot, registers, performs KYC/deposit/transaction/account actions, submits a form or
 * clicks an affiliate link. It records bounded, copyright-safe OfficialSourceCapture
 * artifacts (validated against the contract): only concise normalized fragments +
 * allowlisted scalar metadata + sha256 digests — never full HTML, page body, HAR,
 * cookies or tokens. Any wall / redirect / error is classified honestly and the probe
 * stops — no bypass, no retry that hides the result.
 *
 * MANUAL command (never run in build/CI). It requires `--live --confirm-live` to touch
 * the network; the default run performs NO network access. It writes to a TRANSIENT,
 * gitignored path first, validates every artifact, and refuses to emit invalid output
 * (non-zero exit + a clearly-named `.rejected.json`). It NEVER writes into the committed
 * evidence packet — a human folds validated artifacts into the packet under review.
 *
 * Offline replay (CI-safe, no network):
 *   node scripts/evidence/capture-bybit-official-sources.mjs --replay <artifacts.json>
 *
 * Live capture (manual only):
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
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
const bounded = (s) => norm(s).slice(0, MAX_FRAGMENT);
const sha256 = (s) => 'sha256:' + createHash('sha256').update(s, 'utf8').digest('hex');
const iso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

/** Classify the observed scope from the official final URL. */
function classifyScope(finalUrl, declaredScope) {
  if (!finalUrl) return declaredScope;
  try {
    const p = new URL(finalUrl);
    const path = p.pathname.replace(/\/+$/, '');
    if (path === '' || path === '/en' || path === '/en/') return 'account_wide_general';
    if (/\/promo\//i.test(path)) return 'promotion_specific';
    if (/identity-verification|kyc/i.test(path)) return 'identity_verification_general';
    if (/help-center/i.test(path)) return 'account_wide_general';
    if (/restrict|jurisdiction|prohibited/i.test(path)) return 'legal_restrictions';
    return 'ambiguous';
  } catch { return declaredScope; }
}

/**
 * Code-owned per-claim extraction plan. A fragment is associated with a claim ONLY
 * through a rule declared here, via a narrowly-scoped locator + pattern, and ONLY on a
 * `content` outcome. Presence of matching text never auto-marks a claim supported — the
 * source plan's deterministic assessment + human review decide that.
 */
const EXTRACTION_PLAN = [
  { claimId: 'bybit.bonus_headline', componentIds: ['max-reward-figure'], pattern: /\bup to\s*[\d,]+\s*USDT\b/i, limitation: 'Headline figure is region/tier-dependent; exact CBW wording needs human confirmation.' },
  { claimId: 'bybit.fee_discount', componentIds: ['fee-discount-figure'], pattern: /\b\d{1,3}%\s*(?:fee|trading fee)\b/i, limitation: 'Fee-discount wording is promo-specific.' },
];

function classifyOutcome({ error, timedOut, externalBlocked, status, finalUrl, requestedUrl, bodyText, title }) {
  if (timedOut) return 'timeout';
  if (externalBlocked) return 'external_redirect';
  if (error) return 'network_error';
  if (!finalUrl || !OFFICIAL(finalUrl)) return 'external_redirect';
  if (status === 404) return 'not_found';
  const t = `${title} ${bodyText}`.toLowerCase();
  if (/captcha|are you a human|verify you are human|unusual traffic|access denied|checking your browser|cloudflare/.test(t)) return 'captcha_or_bot_wall';
  if (/log in to continue|sign in to (?:view|continue)|please log in/.test(t)) return 'login_wall';
  if (/not available in your (?:region|country|location)|restricted in your (?:region|country)|service is not available in your/.test(t)) return 'geo_restricted';
  // A client-render shell ("not supported on this site") means the content was NOT
  // server-observable — that is a reachable-but-not-served shell, not a definitive
  // absence. Fail-closed: classify as spa_shell (→ inaccessible), never not_found.
  if (/this article is currently not supported on this site/.test(t)) return 'spa_shell';
  const visible = norm(bodyText);
  const hasOffer = /\bup to\s*[\d,]+\s*usdt\b|welcome (?:package|bonus|gift)|new[- ]user (?:promo|reward)/.test(t);
  if (status >= 300 && status < 400) return 'redirect_only';
  if (finalUrl !== requestedUrl && !hasOffer) return 'redirect_only';
  if (!visible) return 'empty';
  if (hasOffer && visible.length > 400) return 'content';
  return 'spa_shell';
}

async function probeOne(m, candidate) {
  const requestedUrl = candidate.url;
  const capturedAt = iso();
  const warnings = [];
  const limitations = [
    'OFFICIAL_SOURCE_ONLY anonymous HTTPS probe: no account, cookies, proxy, storage, forms or transactions.',
    'Only bounded normalized fragments + allowlisted scalar metadata + sha256 digests are recorded; no full page content.',
  ];
  const receipt = { authenticationUsed: false, cookiesSent: false, cookiesStored: false, proxyConfigured: false, bodyPersisted: false, redirectsObserved: 0, externalRedirectsBlocked: 0 };

  let url = requestedUrl;
  const redirectChain = [];
  let status = null, contentType = null, finalUrl = null, body = '', error = false, timedOut = false, externalBlocked = false;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 20000);
      let res;
      try { res = await fetch(url, { redirect: 'manual', signal: ac.signal, headers: { 'user-agent': 'Mozilla/5.0 (CBW anonymous official-source evidence probe)' } }); }
      finally { clearTimeout(timer); }
      status = res.status;
      contentType = (res.headers.get('content-type') || '').split(';')[0].trim() || null;
      if (status >= 300 && status < 400) {
        const loc = res.headers.get('location');
        if (!loc) { finalUrl = OFFICIAL(url) ? url : null; break; }
        const next = new URL(loc, url).toString();
        receipt.redirectsObserved += 1;
        if (!OFFICIAL(next)) { externalBlocked = true; receipt.externalRedirectsBlocked += 1; warnings.push('external redirect blocked'); break; }
        redirectChain.push(next);
        url = next;
        continue;
      }
      // terminal (2xx/4xx/5xx)
      finalUrl = OFFICIAL(url) ? url : null;
      if (!finalUrl) { externalBlocked = true; break; }
      body = await res.text().catch(() => '');
      break;
    }
  } catch (e) {
    if (/abort/i.test(String(e && e.name))) timedOut = true; else error = true;
    warnings.push(`probe ${timedOut ? 'timeout' : 'network_error'}: ${String(e && e.name)}`);
  }

  const responseBytes = Buffer.byteLength(body, 'utf8');
  const bodyText = norm(body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')).slice(0, 4000);
  const title = bounded((body.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '');
  const outcome = classifyOutcome({ error, timedOut, externalBlocked, status, finalUrl, requestedUrl, bodyText, title });

  const noDoc = outcome === 'timeout' || outcome === 'network_error' || outcome === 'external_redirect';
  const observedScope = noDoc ? candidate.declaredScope : classifyScope(finalUrl, candidate.declaredScope);
  const currency = 'ambiguous';

  // Bounded structured metadata (only from a reachable official document).
  let meta = { pageTitle: null, description: null, canonicalUrl: null, ogTitle: null, ogDescription: null, jsonLdType: null };
  if (!noDoc && body) {
    const desc = (body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1] || null;
    const ogt = (body.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) || [])[1] || null;
    const canon = (body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) || [])[1] || null;
    meta = { pageTitle: title || null, description: desc ? bounded(desc) : null, canonicalUrl: canon && OFFICIAL(canon) ? canon : null, ogTitle: ogt ? bounded(ogt) : null, ogDescription: null, jsonLdType: null };
  }

  // Claim-oriented fragments — ONLY on a content outcome, ONLY via the code-owned plan.
  const fragments = [];
  if (outcome === 'content' && finalUrl) {
    for (const rule of EXTRACTION_PLAN) {
      if (!candidate.targetClaimIds.includes(rule.claimId)) continue;
      const match = bodyText.match(rule.pattern);
      if (!match) continue;
      const text = bounded(match[0]);
      if (!text) continue;
      const frag = { fragmentId: `${candidate.sourceId}-${rule.claimId.replace(/[^a-z0-9]+/g, '-')}`, sourceId: candidate.sourceId, extractionType: 'visible_text', locator: 'body-text-pattern', text, textLength: text.length, claimIds: [rule.claimId], assertionComponentIds: rule.componentIds, stance: 'supports', limitation: rule.limitation };
      frag.fragmentDigest = m.computeOfficialFragmentDigest(frag);
      fragments.push(frag);
    }
    if (fragments.length === 0) {
      // Reachable content but no admissible fragment: downgrade to spa_shell honestly.
      warnings.push('content reached but no code-owned fragment matched; recorded as spa_shell');
    }
  }
  const finalOutcome = (outcome === 'content' && fragments.length === 0) ? 'spa_shell' : outcome;

  const capture = {
    sourceId: candidate.sourceId, exchangeId: 'bybit', requestedUrl,
    finalUrl: noDoc ? null : finalUrl, redirectChain: noDoc ? [] : redirectChain, capturedAt,
    captureMethod: 'http_probe_no_auth_no_cookies', captureTool: 'node-fetch anonymous redirect=manual timeout=20000ms', runtimeVersion: process.version,
    httpStatus: noDoc ? null : status, contentType: noDoc ? null : contentType,
    declaredScope: candidate.declaredScope, observedScope, currency, outcome: finalOutcome,
    responseBytes: noDoc ? 0 : responseBytes, bodyDigest: sha256(noDoc ? '' : body),
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
        `export { BYBIT_OFFICIAL_SOURCE_CANDIDATES, assessAllOfferClaims, validateSourcePlanCoverage } from ${JSON.stringify(join(ROOT, 'src/data/contracts/bybitOfferClaimSourcePlan.ts'))};\n` +
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
  for (const c of captures) {
    console.log(`${c.sourceId} [${c.declaredScope} → ${c.observedScope}/${c.currency}] outcome=${c.outcome} status=${c.httpStatus} frags=${c.fragments.length}`);
    console.log(`  requested: ${c.requestedUrl}`);
    console.log(`  final:     ${c.finalUrl === null ? '(null)' : c.finalUrl}  redirects=${c.redirectChain.length}`);
    console.log(`  digest:    ${c.sourceDigest}`);
    if (c.warnings.length) console.log(`  warnings:  ${c.warnings.join(' | ')}`);
  }
  console.log('\n=== deterministic claim assessment (source plan) ===');
  for (const a of m.assessAllOfferClaims(captures, nowMs)) {
    const proven = a.components.filter((x) => x.proven).length;
    console.log(`${a.claimId} [${a.requirement}] → ${a.result}  (components ${proven}/${a.components.length}; ${a.reason})`);
  }
}

async function replay(path) {
  const { m, cleanup } = await loadContract();
  try {
    const cov = m.validateSourcePlanCoverage();
    console.log(`source-plan coverage: ${cov.ok ? 'OK' : 'INVALID'}${cov.ok ? '' : ' — ' + JSON.stringify(cov.issues)}`);
    const captures = JSON.parse(readFileSync(path, 'utf8'));
    let bad = 0;
    for (const c of captures) {
      const v = m.validateOfficialSourceCapture(c, m.BYBIT_OFFER_CLAIM_INVENTORY);
      if (!v.ok) { bad++; console.log(`REJECT ${c && c.sourceId}: ${JSON.stringify(v.issues)}`); }
      else console.log(`OK     ${c.sourceId} (digest recomputed, outcome=${c.outcome})`);
    }
    printSummary(m, captures, Date.parse('2026-08-06T00:00:00Z'));
    if (bad || !cov.ok) { console.error(`\nOFFLINE REPLAY FAILED: ${bad} invalid artifact(s).`); process.exitCode = 1; }
    else console.log('\nOFFLINE REPLAY OK — all committed artifacts valid, all digests recompute.');
  } finally { cleanup(); }
}

async function main() {
  if (REPLAY) return replay(REPLAY);
  if (!LIVE) {
    console.log('DRY RUN — no network access. Re-run with: --live --confirm-live');
    console.log('This runner probes only public anonymous official Bybit content and never authenticates or bypasses walls.');
    const { m, cleanup } = await loadContract();
    try { const cov = m.validateSourcePlanCoverage(); console.log(`source-plan coverage: ${cov.ok ? 'OK' : 'INVALID ' + JSON.stringify(cov.issues)}`); console.log(`candidates: ${m.BYBIT_OFFICIAL_SOURCE_CANDIDATES.map((c) => c.sourceId).join(', ')}`); } finally { cleanup(); }
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
      console.error(`\n${rejected.length} capture(s) FAILED contract validation → NOT writing evidence output.`);
      console.error(`Transient rejected artifact (do NOT commit): ${rejPath}`);
      process.exitCode = 1;
      return;
    }
    const outPath = join(ROOT, 'scripts/evidence/out-bybit-official-sources.json');
    writeFileSync(outPath, JSON.stringify(captures, null, 2));
    console.log(`\nWrote ${captures.length} validated official-source capture(s) → ${outPath}`);
    console.log('This is a TRANSIENT artifact (gitignored). Fold validated captures into the packet under human review — never auto-commit.');
  } finally { cleanup(); }
}

main().catch((e) => { console.error(e); process.exit(1); });
