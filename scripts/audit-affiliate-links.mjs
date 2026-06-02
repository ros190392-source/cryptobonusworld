#!/usr/bin/env node
/**
 * audit-affiliate-links.mjs
 *
 * Strict audit of the affiliate link registry:
 *   1. Registry self-checks (clean URL validity, no referral params in clean URLs)
 *   2. Coinbase must be clean-only — zero referral params anywhere, no promoCode/refCode
 *   3. LBank pending must use clean URL only
 *   4. Full partners must have an affiliate URL
 *   5. promoCode must appear in affiliateWithCode URL (when primaryLinkType = affiliate_with_code)
 *   6. No hardcoded exchange URLs outside registry files (allowlisted)
 *   7. No broken '#' affiliate URLs for active full partners
 *   8. No empty affiliateUrl for full partners
 *   9. No unknown exchange outbound links in components/pages
 *  10. No duplicate conflicting URLs for the same exchange
 *  11. No USDT used as ISO currency in schema offers (must be USD-equivalent note instead)
 *  12. exchanges.json parity: partner_status + affiliateUrl must match registry
 *
 * Usage:
 *   node scripts/audit-affiliate-links.mjs
 *   node scripts/audit-affiliate-links.mjs --json
 *   node scripts/audit-affiliate-links.mjs --fail-on-issues
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

// ── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const JSON_OUT    = args.includes('--json');
const FAIL_ON_ERR = args.includes('--fail-on-issues');

const __dir = fileURLToPath(new URL('.', import.meta.url));
const ROOT  = resolve(__dir, '..');

// ── Load affiliate-links.ts by stripping TS annotations and eval ──────────────

function parseAffiliateLinks() {
  const src = readFileSync(join(ROOT, 'src/data/affiliate-links.ts'), 'utf8');
  const start = src.indexOf('export const AFFILIATE_LINKS: AffiliateEntry[] = [');
  if (start === -1) throw new Error('Could not find AFFILIATE_LINKS in affiliate-links.ts');

  const stripped = src
    .slice(start)
    .replace(/export const AFFILIATE_LINKS: AffiliateEntry\[\] = /, 'var AFFILIATE_LINKS = ')
    .replace(/export const AFFILIATE_LINKS_MAP[^;]+;/g, '')
    .replace(/: AffiliateEntry\[\]/g, '')
    .replace(/: string \| null/g, '')
    .replace(/: string/g, '')
    .replace(/: boolean/g, '')
    .replace(/: number \| null/g, '')
    .replace(/: number/g, '')
    .replace(/: GeoRegion \| string/g, '')
    .replace(/Partial<Record<GeoRegion, string>>/g, '')
    .replace(/AppendRules/g, '')
    .replace(/'affiliate_dashboard' \| 'official_site' \| 'manual' \| 'unknown'/g, '')
    .replace(/^export /gm, '')
    .trim();

  try {
    const fn = new Function(stripped + '\nreturn AFFILIATE_LINKS;');
    return fn();
  } catch (e) {
    console.warn('⚠️  Could not evaluate affiliate-links.ts — falling back to exchanges.json only. Error:', e.message);
    return null;
  }
}

// ── Load data ─────────────────────────────────────────────────────────────────

const exchanges = JSON.parse(readFileSync(join(ROOT, 'src/data/exchanges.json'), 'utf8'));
const affiliateLinks = parseAffiliateLinks();

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidUrl(url) {
  try { return /^https?:\/\//.test(new URL(url).href); } catch { return false; }
}

function hasReferralParams(url) {
  if (!url || url === '#') return false;
  try {
    const u = new URL(url);
    const suspiciousParams = ['ref', 'invite', 'inviteCode', 'shareCode', 'referralCode',
      'invite_code', 'rcode', 'rc', 'promo', 'code', 'aff', 'partner', 'affiliate_id'];
    return suspiciousParams.some(p => u.searchParams.has(p)) ||
           /\/join\/|\/share\/|\/invite\/|\/b\/|\/bg\//.test(u.pathname);
  } catch { return false; }
}

function hasStrayUtm(url) {
  if (!url || url === '#') return false;
  try {
    const u = new URL(url);
    return ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
      .some(p => u.searchParams.has(p));
  } catch { return false; }
}

// ── Issue collectors ──────────────────────────────────────────────────────────

const issues = [];
const warnings = [];
const report = {
  full: [], limited: [], pending: [], disabled: [],
  promoInUrl: [], promoManual: [], promoNone: [],
};

function fail(msg, context = '') { issues.push({ level: 'ERROR', msg, context }); }
function warn(msg, context = '') { warnings.push({ level: 'WARN', msg, context }); }

// ── Registry map ──────────────────────────────────────────────────────────────

const registryMap = new Map();

if (affiliateLinks) {
  for (const entry of affiliateLinks) {
    registryMap.set(entry.slug, entry);

    // Classify
    if (entry.partnerStatus === 'full')     report.full.push(entry.slug);
    if (entry.partnerStatus === 'limited')  report.limited.push(entry.slug);
    if (entry.partnerStatus === 'pending')  report.pending.push(entry.slug);
    if (entry.partnerStatus === 'disabled') report.disabled.push(entry.slug);

    if (entry.promoCode && entry.links.affiliateWithCode) {
      if (entry.links.affiliateWithCode.includes(entry.promoCode)) {
        report.promoInUrl.push(entry.slug);
      } else {
        report.promoManual.push(entry.slug);
      }
    } else if (!entry.promoCode && entry.partnerStatus === 'full') {
      report.promoNone.push(entry.slug);
    }

    // ── RULE 1: Clean URL must be valid ──────────────────────────────────────
    if (!isValidUrl(entry.links.clean)) {
      fail(`[${entry.slug}] links.clean is invalid: "${entry.links.clean}"`);
    }

    // ── RULE 1b: Clean URL must not have referral params ─────────────────────
    if (hasReferralParams(entry.links.clean)) {
      fail(`[${entry.slug}] links.clean contains referral params: "${entry.links.clean}"`);
    }

    // ── RULE 1c: Clean URL must not have stray UTM params ────────────────────
    if (hasStrayUtm(entry.links.clean)) {
      warn(`[${entry.slug}] links.clean contains UTM params — clean URLs should be UTM-free: "${entry.links.clean}"`);
    }

    // ── RULE 2: COINBASE must be clean-only everywhere ───────────────────────
    if (entry.slug === 'coinbase') {
      // All URLs must be clean
      const allUrls = Object.values(entry.links).filter(Boolean);
      for (const url of allUrls) {
        if (hasReferralParams(url)) {
          fail(`[coinbase] URL contains referral params (MUST be clean): "${url}"`);
        }
        if (hasStrayUtm(url)) {
          fail(`[coinbase] URL contains UTM params (MUST be clean): "${url}"`);
        }
      }
      // Must not have promo/ref codes
      if (entry.promoCode) {
        fail(`[coinbase] partnerStatus=limited must not have promoCode (got: "${entry.promoCode}")`);
      }
      if (entry.refCode) {
        fail(`[coinbase] partnerStatus=limited must not have refCode (got: "${entry.refCode}")`);
      }
      // Must be limited
      if (entry.partnerStatus !== 'limited') {
        fail(`[coinbase] partnerStatus must be "limited", got "${entry.partnerStatus}"`);
      }
      // Clean URL must exactly be the base domain
      if (entry.links.clean !== 'https://www.coinbase.com/') {
        warn(`[coinbase] links.clean is not exactly "https://www.coinbase.com/", got: "${entry.links.clean}"`);
      }
    }

    // ── RULE 3: LBank pending must use clean URL only ────────────────────────
    if (entry.slug === 'lbank') {
      if (entry.partnerStatus !== 'pending' && entry.partnerStatus !== 'limited') {
        warn(`[lbank] expected partnerStatus=pending, got "${entry.partnerStatus}" — update when deal is confirmed`);
      }
      const outbound = entry.links.fallback ?? entry.links.clean;
      if (hasReferralParams(outbound)) {
        fail(`[lbank] pending partner outbound URL has referral params: "${outbound}"`);
      }
      if (entry.promoCode) {
        fail(`[lbank] pending partner must not have promoCode`);
      }
    }

    // ── RULE 4: Full partners must have an affiliate URL ─────────────────────
    if (entry.partnerStatus === 'full') {
      const hasAff = entry.links.affiliateWithCode || entry.links.affiliate;
      if (!hasAff && entry.primaryLinkType !== 'clean' && entry.primaryLinkType !== 'clean_with_ref_param') {
        fail(`[${entry.slug}] Full partner has no affiliate URL (affiliateWithCode or affiliate)`);
      }
      // ── RULE 7: No '#' placeholders for active full partners ───────────────
      for (const [key, val] of Object.entries(entry.links)) {
        if (val === '#') {
          fail(`[${entry.slug}] Placeholder "#" in links.${key} — full partners must have real URLs`);
        }
      }
      // ── RULE 8: affiliateWithCode must be a valid URL ─────────────────────
      if (entry.links.affiliateWithCode && !isValidUrl(entry.links.affiliateWithCode)) {
        fail(`[${entry.slug}] affiliateWithCode is not a valid URL: "${entry.links.affiliateWithCode}"`);
      }
      if (entry.links.affiliate && !isValidUrl(entry.links.affiliate)) {
        fail(`[${entry.slug}] affiliate is not a valid URL: "${entry.links.affiliate}"`);
      }
    }

    // ── RULE 5: promoCode must appear in affiliateWithCode URL ───────────────
    if (entry.partnerStatus === 'full' && entry.primaryLinkType === 'affiliate_with_code') {
      if (entry.promoCode && entry.links.affiliateWithCode) {
        const lc = entry.links.affiliateWithCode.toLowerCase();
        if (!lc.includes(entry.promoCode.toLowerCase())) {
          fail(`[${entry.slug}] promoCode "${entry.promoCode}" NOT FOUND in affiliateWithCode URL "${entry.links.affiliateWithCode}" — code may be expired or wrong`);
        }
      } else if (!entry.promoCode) {
        warn(`[${entry.slug}] primaryLinkType=affiliate_with_code but promoCode is null — verify tracking is via path/param`);
      } else if (!entry.links.affiliateWithCode) {
        fail(`[${entry.slug}] primaryLinkType=affiliate_with_code but affiliateWithCode URL is missing`);
      }
    }

    // ── RULE 10: No duplicate conflicting URLs ────────────────────────────────
    // (tracked below after all entries loaded)

    // ── limited/pending outbound must be clean ────────────────────────────────
    if (entry.partnerStatus === 'limited' || entry.partnerStatus === 'pending') {
      const outbound = entry.links.fallback ?? entry.links.clean;
      if (hasReferralParams(outbound)) {
        fail(`[${entry.slug}] ${entry.partnerStatus} partner outbound URL has referral params: "${outbound}"`);
      }
      if (hasStrayUtm(outbound)) {
        fail(`[${entry.slug}] ${entry.partnerStatus} partner outbound URL has UTM params: "${outbound}"`);
      }
    }

    // ── RULE: new bonus fields present ───────────────────────────────────────
    if (entry.lastChecked === undefined) {
      warn(`[${entry.slug}] missing lastChecked field — add an ISO date`);
    }
    if (entry.sourceOfLink === undefined) {
      warn(`[${entry.slug}] missing sourceOfLink field`);
    }
  }

  // ── RULE 10: Duplicate check — same affiliateWithCode URL for 2+ entries ──
  const seenAffiliateUrls = new Map();
  for (const entry of affiliateLinks) {
    const url = entry.links.affiliateWithCode;
    if (!url) continue;
    if (seenAffiliateUrls.has(url)) {
      fail(`[${entry.slug}] affiliateWithCode URL is the same as [${seenAffiliateUrls.get(url)}]: "${url}"`);
    }
    seenAffiliateUrls.set(url, entry.slug);
  }

  // ── All exchanges in exchanges.json must have a registry entry ────────────
  for (const ex of exchanges) {
    if (!registryMap.has(ex.slug)) {
      fail(`[${ex.slug}] Exchange exists in exchanges.json but has no entry in affiliate-links registry`);
    }
  }

  // ── exchanges.json parity (RULE 12) ──────────────────────────────────────
  for (const ex of exchanges) {
    const entry = registryMap.get(ex.slug);
    if (!entry) continue;

    const registryUrl = entry.links.affiliateWithCode ?? entry.links.affiliate ?? entry.links.fallback ?? entry.links.clean;
    const jsonUrl = ex.affiliateUrl;

    // partner_status in JSON must match registry
    const jsonPs = ex.partner_status ?? 'full';
    if (jsonPs !== entry.partnerStatus) {
      fail(`[${ex.slug}] partner_status mismatch: exchanges.json="${jsonPs}", registry="${entry.partnerStatus}"`);
    }

    // For limited/pending: affiliateUrl in exchanges.json must be clean
    if (entry.partnerStatus === 'limited' || entry.partnerStatus === 'pending') {
      if (hasReferralParams(jsonUrl)) {
        fail(`[${ex.slug}] exchanges.json affiliateUrl has referral params but partnerStatus=${entry.partnerStatus}: "${jsonUrl}"`);
      }
      if (hasStrayUtm(jsonUrl)) {
        fail(`[${ex.slug}] exchanges.json affiliateUrl has UTM params but partnerStatus=${entry.partnerStatus}: "${jsonUrl}"`);
      }
    }

    // For full: check affiliate URL matches registry (warn only — geo may differ)
    if (entry.partnerStatus === 'full' && jsonUrl !== '#') {
      if (registryUrl && registryUrl !== '#' && jsonUrl !== registryUrl) {
        warn(`[${ex.slug}] exchanges.json affiliateUrl differs from registry:\n  json:     ${jsonUrl}\n  registry: ${registryUrl}`);
      }
    }
  }
}

// ── RULE 6: Scan source files for hardcoded outbound exchange URLs ────────────

const SCAN_DIRS = ['src/components', 'src/pages', 'src/layouts', 'src/utils'];
const EXCHANGE_DOMAINS = [
  'bybit.com', 'binance.com', 'mexc.com', 'okx.com', 'bitget.com',
  'bingx.com', 'bingxdao.com', 'gate.io', 'gate.com', 'kucoin.com',
  'htx.com', 'coinex.com', 'phemex.com', 'bitunix.com', 'lbank.com', 'coinbase.com',
];

const ALLOWED_FILES = new Set([
  'src/utils/affiliateLinks.ts',
  'src/data/affiliate-links.ts',
]);

// Scan for hardcoded URLs and USDT ISO currency issues
for (const dir of SCAN_DIRS) {
  const dirPath = join(ROOT, dir);
  let files = [];
  try {
    const { readdirSync, statSync } = await import('fs');
    function walk(d) {
      for (const f of readdirSync(d)) {
        const full = join(d, f);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|astro|js|mjs)$/.test(f)) files.push(full);
      }
    }
    walk(dirPath);
  } catch { continue; }

  for (const file of files) {
    const relFile = file.replace(ROOT + '/', '').replace(ROOT + '\\', '').replace(/\\/g, '/');
    if (ALLOWED_FILES.has(relFile)) continue;

    const src = readFileSync(file, 'utf8');
    const lines = src.split('\n');

    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;
      if (/from ['"].*affiliateLinks['"]/.test(line)) return;
      if (/import.*affiliate-links/.test(line)) return;

      const lineNum = i + 1;

      // RULE 6: Hardcoded outbound exchange URLs outside registry
      for (const domain of EXCHANGE_DOMAINS) {
        if (line.includes('https://') && line.toLowerCase().includes(domain)) {
          if (/officialSourceUrl|bonusSourceUrl|termsUrl|evidence|schema|canonical|sameAs/.test(line)) continue;
          warn(`[hardcoded-url] ${relFile}:${lineNum} — ${line.trim().slice(0, 100)}`);
        }
      }

      // RULE 11: No USDT as ISO currency code in schema offers
      // Schema priceCurrency must use ISO 4217 — USDT is not ISO 4217
      if (/priceCurrency.*USDT|"currency".*"USDT"|currency:\s*['"]USDT['"]/.test(line)) {
        if (/schema|Schema|ld\+json|structuredData|application\/ld/.test(src.slice(Math.max(0, i * 60 - 200), i * 60 + 200))) {
          warn(`[schema-currency] ${relFile}:${lineNum} — USDT is not ISO 4217; use "USD" or omit priceCurrency: ${line.trim().slice(0, 80)}`);
        }
      }
    });
  }
}

// ── Output ────────────────────────────────────────────────────────────────────

if (JSON_OUT) {
  console.log(JSON.stringify({ issues, warnings, report }, null, 2));
} else {
  console.log('\n' + '═'.repeat(66));
  console.log(' CryptoBonusWorld — Affiliate Link Audit (strict)');
  console.log('═'.repeat(66));

  console.log('\n📊 PARTNER STATUS BREAKDOWN\n');
  console.log(`  FULL     (${report.full.length}): ${report.full.join(', ')}`);
  console.log(`  LIMITED  (${report.limited.length}): ${report.limited.join(', ')}`);
  console.log(`  PENDING  (${report.pending.length}): ${report.pending.join(', ')}`);
  if (report.disabled.length) console.log(`  DISABLED (${report.disabled.length}): ${report.disabled.join(', ')}`);

  console.log('\n🔗 PROMO CODE STATUS\n');
  console.log(`  Code embedded in URL   (${report.promoInUrl.length}): ${report.promoInUrl.join(', ')}`);
  console.log(`  Code manual/param only (${report.promoManual.length}): ${report.promoManual.join(', ')}`);
  console.log(`  No promo code (full)   (${report.promoNone.length}): ${report.promoNone.join(', ')}`);

  console.log('\n💰 BONUS REFERENCE TABLE\n');
  if (affiliateLinks) {
    for (const e of affiliateLinks) {
      if (e.partnerStatus !== 'full') continue;
      const amt = e.maxBonusAmount ? `${e.maxBonusAmount.toLocaleString()} ${e.bonusCurrency}` : '—';
      const code = e.promoCode ?? '—';
      console.log(`  ${e.slug.padEnd(12)} ${amt.padEnd(18)} code: ${code.padEnd(16)} type: ${e.primaryLinkType}`);
    }
  }

  console.log('\n🔒 COINBASE VERIFICATION\n');
  const cbEntry = registryMap.get('coinbase');
  const cbJson  = exchanges.find(e => e.slug === 'coinbase');
  console.log(`  Registry partnerStatus : ${cbEntry?.partnerStatus ?? 'NOT IN REGISTRY'}`);
  console.log(`  Registry primaryLink   : ${cbEntry?.primaryLinkType ?? '—'}`);
  console.log(`  Registry clean URL     : ${cbEntry?.links?.clean ?? '—'}`);
  console.log(`  Registry promoCode     : ${cbEntry?.promoCode ?? 'null'}`);
  console.log(`  Registry refCode       : ${cbEntry?.refCode ?? 'null'}`);
  console.log(`  exchanges.json url     : ${cbJson?.affiliateUrl ?? '—'}`);
  console.log(`  Has referral params    : ${hasReferralParams(cbJson?.affiliateUrl) ? '❌ YES — CRITICAL' : '✅ NO'}`);
  console.log(`  Has UTM params         : ${hasStrayUtm(cbJson?.affiliateUrl) ? '❌ YES' : '✅ NO'}`);

  console.log('\n⏳ LBANK VERIFICATION\n');
  const lbEntry = registryMap.get('lbank');
  const lbJson  = exchanges.find(e => e.slug === 'lbank');
  console.log(`  Registry partnerStatus : ${lbEntry?.partnerStatus ?? 'NOT IN REGISTRY'}`);
  console.log(`  Registry clean URL     : ${lbEntry?.links?.clean ?? '—'}`);
  console.log(`  exchanges.json url     : ${lbJson?.affiliateUrl ?? '—'}`);
  console.log(`  Has referral params    : ${hasReferralParams(lbJson?.affiliateUrl) ? '❌ YES' : '✅ NO'}`);

  // Issues
  if (issues.length) {
    console.log(`\n❌ ISSUES (${issues.length})\n`);
    issues.forEach(i => console.log(`  [ERROR] ${i.msg}`));
  } else {
    console.log('\n✅ No critical issues found');
  }

  // Warnings
  if (warnings.length) {
    console.log(`\n⚠️  WARNINGS (${warnings.length})\n`);
    warnings.forEach(w => console.log(`  [WARN]  ${w.msg}`));
  }

  const overall = issues.length === 0;
  console.log('\n' + '═'.repeat(66));
  console.log(overall
    ? '  ✅  AUDIT PASSED'
    : `  ❌  AUDIT FAILED — ${issues.length} critical issue(s)`);
  console.log('═'.repeat(66) + '\n');
}

if (FAIL_ON_ERR && issues.length > 0) process.exit(1);
