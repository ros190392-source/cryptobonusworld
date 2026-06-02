#!/usr/bin/env node
/**
 * affiliate-link-inventory.mjs
 *
 * Scans the entire project for outbound exchange URLs, /go/ links,
 * affiliate/tracking links, promo params, and hardcoded URLs outside
 * the affiliate registry. Groups findings by exchange.
 *
 * Usage:
 *   node scripts/affiliate-link-inventory.mjs
 *   node scripts/affiliate-link-inventory.mjs --json
 *   node scripts/affiliate-link-inventory.mjs --md
 */

import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, relative } from 'path';
import { fileURLToPath } from 'url';

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const MD_OUT   = args.includes('--md');
const WRITE    = args.includes('--write');

const __dir = fileURLToPath(new URL('.', import.meta.url));
const ROOT  = resolve(__dir, '..');

// Load exchanges.json early for bonus data fallback
const exchanges = JSON.parse(readFileSync(join(ROOT, 'src/data/exchanges.json'), 'utf8'));

// ── Registry slugs and domains ────────────────────────────────────────────────

const REGISTRY = {
  bybit:    { domains: ['bybit.com', 'partner.bybit.com'], affiliatePattern: /partner\.bybit\.com\/b\// },
  binance:  { domains: ['binance.com'], affiliatePattern: /binance\.com\/join/ },
  mexc:     { domains: ['mexc.com'], affiliatePattern: /mexc\.com\/acquisition/ },
  okx:      { domains: ['okx.com'], affiliatePattern: /okx\.com\/join/ },
  bitget:   { domains: ['bitget.com', 'partner.bitget.com'], affiliatePattern: /partner\.bitget\.com\/bg\// },
  bingx:    { domains: ['bingx.com', 'bingxdao.com'], affiliatePattern: /bingxdao\.com\/partner/ },
  'gate-io':{ domains: ['gate.io', 'gate.com'], affiliatePattern: /gate\.com\/share/ },
  kucoin:   { domains: ['kucoin.com'], affiliatePattern: /kucoin\.com.*rcode=/ },
  htx:      { domains: ['htx.com', 'htx.com.ph'], affiliatePattern: /htx\.com.*invite_code=/ },
  coinex:   { domains: ['coinex.com'], affiliatePattern: /coinex\.com\/register/ },
  phemex:   { domains: ['phemex.com'], affiliatePattern: /phemex\.com.*referralCode=/ },
  bitunix:  { domains: ['bitunix.com'], affiliatePattern: /bitunix\.com\/register/ },
  lbank:    { domains: ['lbank.com'], affiliatePattern: null },
  coinbase: { domains: ['coinbase.com'], affiliatePattern: null },
};

const ALL_DOMAINS = Object.values(REGISTRY).flatMap(r => r.domains);

// ── Files/directories allowed to contain direct exchange URLs ────────────────
// These are data/evidence/source files — not UI components that serve links.

const ALLOWED_PATH_PREFIXES = [
  'src/data/',          // all data files (exchanges.json, bonus-codes.ts, content-status.ts, etc.)
  'src/data/evidence/', // evidence JSON source files
  'scripts/',           // all scripts (including this one and the audit)
  'reports/',           // generated reports
];

function isAllowedFile(relFile) {
  return ALLOWED_PATH_PREFIXES.some(p => relFile.startsWith(p));
}

// Contexts that are never flagged as hardcoded (editorial/schema URLs)
const SAFE_CONTEXTS = /officialSourceUrl|bonusSourceUrl|termsUrl|evidence|schema|canonical|sameAs|officialSite|logoUrl|fee|fees|legal|user_agreement|invite|register|promo|activity/;

// ── Walk file tree ────────────────────────────────────────────────────────────

const SCAN_DIRS = ['src', 'scripts', 'public'].filter(d => existsSync(join(ROOT, d)));

function walk(dir, files = []) {
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
          walk(full, files);
        } else if (/\.(ts|tsx|astro|js|mjs|cjs|json|md|html|svg)$/.test(entry)) {
          files.push(full);
        }
      } catch { /* skip inaccessible */ }
    }
  } catch { /* skip inaccessible dir */ }
  return files;
}

const files = SCAN_DIRS.flatMap(d => walk(join(ROOT, d)));

// ── Promo param detector ──────────────────────────────────────────────────────

const PROMO_PARAMS = ['ref', 'invite', 'inviteCode', 'shareCode', 'referralCode',
  'invite_code', 'rcode', 'rc', 'promo', 'code', 'aff', 'partner', 'affiliate_id'];

function detectParamsInUrl(url) {
  try {
    const u = new URL(url);
    const found = [];
    for (const p of PROMO_PARAMS) {
      if (u.searchParams.has(p)) found.push(`${p}=${u.searchParams.get(p)}`);
    }
    if (/\/join\/|\/share\/|\/invite\/|\/b\/|\/bg\//.test(u.pathname)) {
      found.push(`path:${u.pathname}`);
    }
    return found;
  } catch { return []; }
}

function classifyUrl(url, slug) {
  if (!url || url === '#') return 'placeholder';
  if (url.includes('/go/')) return 'go_redirect';
  const reg = REGISTRY[slug];
  if (!reg) return 'unknown';
  if (reg.affiliatePattern && reg.affiliatePattern.test(url)) return 'affiliate';
  const params = detectParamsInUrl(url);
  if (params.length > 0) return 'affiliate_with_params';
  for (const domain of reg.domains) {
    if (url.includes(domain)) return 'clean';
  }
  return 'external';
}

function detectNearbyBonus(lines, lineIdx) {
  const window = lines.slice(Math.max(0, lineIdx - 5), lineIdx + 6).join(' ');
  const bonusMatch = window.match(/(\d[\d,]*)\s*(USDT|USD|BTC|ETH|BNB|USDC)/i);
  if (bonusMatch) return `${bonusMatch[1]} ${bonusMatch[2].toUpperCase()}`;
  if (/bonus|reward|promo|welcome|signup|cashback/i.test(window)) return 'bonus mentioned';
  return null;
}

function detectContext(lines, lineIdx) {
  const window = lines.slice(Math.max(0, lineIdx - 3), lineIdx).join(' ');
  if (/component|Component/.test(window)) return 'component';
  if (/page|Page/.test(window)) return 'page';
  if (/layout|Layout/.test(window)) return 'layout';
  if (/util|helper/.test(window)) return 'util';
  if (/schema|Schema/.test(window)) return 'schema';
  return 'unknown';
}

// ── Scan ──────────────────────────────────────────────────────────────────────

// Structure: { [slug]: { slug, urls: [...] } }
const inventory = {};
const hardcoded = [];   // URLs outside registry, outside ALLOWED_FILES
const goLinks = [];     // /go/{exchange} redirect usages

for (const slug of Object.keys(REGISTRY)) {
  inventory[slug] = { slug, urls: [] };
}
inventory['_unknown'] = { slug: '_unknown', urls: [] };

for (const file of files) {
  const relFile = relative(ROOT, file).replace(/\\/g, '/');
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }
  const lines = src.split('\n');

  lines.forEach((line, i) => {
    // Skip pure comments
    if (/^\s*(\/\/|\/\*|\*|#)/.test(line)) return;

    const lineNum = i + 1;
    const linePreview = line.trim().slice(0, 120);

    // ── /go/ redirect links ──────────────────────────────────────────────────
    const goMatch = line.match(/\/go\/([\w-]+)/g);
    if (goMatch) {
      for (const m of goMatch) {
        const slug = m.replace('/go/', '');
        goLinks.push({ file: relFile, line: lineNum, slug, preview: linePreview });
      }
    }

    // ── Outbound exchange URLs ───────────────────────────────────────────────
    const urlMatches = line.match(/https?:\/\/[^\s'"`,>\)]+/g) || [];
    for (const url of urlMatches) {
      const cleanUrl = url.replace(/['"`,>\)]+$/, '');
      if (!cleanUrl.startsWith('http')) continue;

      // Find which exchange this belongs to
      let matchedSlug = null;
      for (const [slug, reg] of Object.entries(REGISTRY)) {
        if (reg.domains.some(d => cleanUrl.toLowerCase().includes(d))) {
          matchedSlug = slug;
          break;
        }
      }
      if (!matchedSlug) continue;

      const params = detectParamsInUrl(cleanUrl);
      const linkType = classifyUrl(cleanUrl, matchedSlug);
      const nearbyBonus = detectNearbyBonus(lines, i);
      const context = detectContext(lines, i);
      const isAllowed = isAllowedFile(relFile);
      const isSafeContext = SAFE_CONTEXTS.test(line);

      const entry = {
        url: cleanUrl,
        file: relFile,
        line: lineNum,
        linkType,
        params,
        nearbyBonus,
        context,
        isAllowed,
        isSafeContext,
        preview: linePreview,
      };

      inventory[matchedSlug].urls.push(entry);

      // Flag hardcoded URLs outside registry
      if (!isAllowed && !isSafeContext) {
        hardcoded.push({ slug: matchedSlug, ...entry });
      }
    }
  });
}

// ── Load registry for cross-check (block-based parser) ───────────────────────
// Parses each entry block independently so optional fields don't cause index drift.

function extractField(block, fieldName) {
  // Matches:  fieldName: 'value'  OR  fieldName: null
  const re = new RegExp(`${fieldName}:\\s*(?:'([^']*)'|null)`, 's');
  const m = block.match(re);
  if (!m) return undefined;
  return m[1] ?? null; // null when the literal "null" was matched
}

function extractNumber(block, fieldName) {
  const re = new RegExp(`${fieldName}:\\s*(\\d[\\d.]*|null)`);
  const m = block.match(re);
  if (!m) return undefined;
  if (m[1] === 'null') return null;
  return Number(m[1]);
}

function parseAffiliateLinkBlocks(src) {
  const arrayStart = src.indexOf('export const AFFILIATE_LINKS');
  if (arrayStart === -1) return [];
  const bracketOpen = src.indexOf('[', arrayStart);
  if (bracketOpen === -1) return [];

  const blocks = [];
  let depth = 1; // we start right after the opening '[', so depth=1 = inside the array
  let entryStart = -1;

  for (let i = bracketOpen + 1; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      if (depth === 1) entryStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 1 && entryStart !== -1) {
        blocks.push(src.slice(entryStart, i + 1));
        entryStart = -1;
      }
      if (depth === 0) break;
    }
  }
  return blocks;
}

// Load exchanges.json for bonus data (authoritative source)
const exchangeMap = new Map(exchanges.map(e => [e.slug, e]));

let registryMap = new Map();
try {
  const src = readFileSync(join(ROOT, 'src/data/affiliate-links.ts'), 'utf8');
  const blocks = parseAffiliateLinkBlocks(src);

  for (const block of blocks) {
    const slug = extractField(block, 'slug');
    if (!slug) continue;

    // Get affiliateWithCode — first occurrence in this block
    const withCodeM = block.match(/affiliateWithCode:\s*'([^']+)'/);
    const cleanM    = block.match(/clean:\s*'([^']+)'/);
    // For bingx-style, also check affiliate
    const affiliateM = block.match(/(?<!\w)affiliate:\s*'([^']+)'/);

    const exJson = exchangeMap.get(slug);

    registryMap.set(slug, {
      slug,
      partnerStatus:     extractField(block, 'partnerStatus') ?? 'unknown',
      primaryLinkType:   extractField(block, 'primaryLinkType') ?? 'unknown',
      promoCode:         extractField(block, 'promoCode'),
      refCode:           extractField(block, 'refCode'),
      bonusLabel:        extractField(block, 'bonusLabel') ?? exJson?.bonusTitle ?? null,
      maxBonusAmount:    extractNumber(block, 'maxBonusAmount') ?? exJson?.bonusAmount ?? null,
      bonusCurrency:     extractField(block, 'bonusCurrency') ?? exJson?.bonusCurrency ?? null,
      affiliateWithCodeUrl: withCodeM?.[1] ?? null,
      affiliateUrl:        affiliateM?.[1] ?? null,
      cleanUrl:            cleanM?.[1] ?? null,
    });
  }
} catch (e) {
  console.warn('⚠️  Could not parse affiliate-links.ts for cross-check:', e.message);
  // Fallback: use exchanges.json data only
  for (const ex of exchanges) {
    registryMap.set(ex.slug, {
      slug: ex.slug,
      partnerStatus: ex.partner_status ?? 'full',
      primaryLinkType: 'unknown',
      promoCode: ex.promoCode || null,
      bonusLabel: ex.bonusTitle ?? null,
      maxBonusAmount: ex.bonusAmount ?? null,
      bonusCurrency: ex.bonusCurrency ?? null,
      affiliateWithCodeUrl: null,
      cleanUrl: ex.affiliateUrl ?? null,
    });
  }
}

// ── Build summary ─────────────────────────────────────────────────────────────

const summary = [];
for (const [slug, data] of Object.entries(inventory)) {
  if (slug === '_unknown') continue;
  const reg = registryMap.get(slug) || {};
  const totalUsages = data.urls.length;
  const hardcodedCount = data.urls.filter(u => !u.isAllowed && !u.isSafeContext).length;
  const registryUsages = data.urls.filter(u => u.isAllowed).length;
  const goUsages = goLinks.filter(g => g.slug === slug).length;

  const warnings = [];
  if (reg.partnerStatus === 'full' && !reg.affiliateWithCodeUrl && reg.primaryLinkType !== 'affiliate' && reg.primaryLinkType !== 'clean') {
    warnings.push('Full partner missing affiliateWithCode URL');
  }
  if (hardcodedCount > 0) {
    warnings.push(`${hardcodedCount} hardcoded URL(s) outside registry`);
  }
  if (slug === 'coinbase') {
    // Only flag if referral params found in UI files (components/pages), not data sources
    const coinbaseUrls = data.urls.filter(u => u.params.length > 0 && !isAllowedFile(u.file) && !u.isSafeContext);
    if (coinbaseUrls.length > 0) warnings.push(`⚠️ COINBASE: referral params in UI file(s)! (${coinbaseUrls.map(u => u.file + ':' + u.line).join(', ')})`);
  }

  summary.push({
    slug,
    name: slug.charAt(0).toUpperCase() + slug.slice(1).replace('-', '.'),
    partnerStatus: reg.partnerStatus ?? 'unknown',
    primaryLinkType: reg.primaryLinkType ?? 'unknown',
    primaryUrl: reg.affiliateWithCodeUrl ?? reg.affiliateUrl ?? reg.cleanUrl ?? '—',
    promoCode: reg.promoCode ?? null,
    bonusLabel: reg.bonusLabel ?? null,
    maxBonusAmount: reg.maxBonusAmount ?? null,
    bonusCurrency: reg.bonusCurrency ?? null,
    totalUsages,
    hardcodedUsages: hardcodedCount,
    registryUsages,
    goRedirectUsages: goUsages,
    warnings,
    actionNeeded: warnings.length > 0 ? 'REVIEW' : 'OK',
  });
}

// ── Output ────────────────────────────────────────────────────────────────────

function buildMarkdownReport() {
  const lines = [];
  lines.push('# Affiliate Link Inventory');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');

  lines.push('## Summary Table');
  lines.push('');
  lines.push('| Exchange | Status | Type | Primary URL | Code | Bonus | Max Amount | Usages | Hardcoded | /go/ | Action |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|');

  for (const s of summary) {
    const url = s.primaryUrl.length > 55 ? s.primaryUrl.slice(0, 52) + '...' : s.primaryUrl;
    const bonus = s.bonusLabel ? s.bonusLabel.slice(0, 30) : '—';
    const amount = s.maxBonusAmount ? `${s.maxBonusAmount} ${s.bonusCurrency}` : '—';
    lines.push(`| ${s.slug} | ${s.partnerStatus} | ${s.primaryLinkType} | \`${url}\` | ${s.promoCode ?? '—'} | ${bonus} | ${amount} | ${s.totalUsages} | ${s.hardcodedUsages} | ${s.goRedirectUsages} | ${s.actionNeeded} |`);
  }

  lines.push('');
  lines.push('## Inventory by Exchange');
  lines.push('');

  for (const [slug, data] of Object.entries(inventory)) {
    if (slug === '_unknown' || data.urls.length === 0) continue;
    lines.push(`### ${slug}`);
    lines.push('');
    for (const u of data.urls) {
      const flag = !u.isAllowed && !u.isSafeContext ? ' ⚠️ HARDCODED' : '';
      lines.push(`- **${u.file}:${u.line}** — \`${u.url}\``);
      lines.push(`  - type: ${u.linkType}${flag}`);
      if (u.params.length) lines.push(`  - params: ${u.params.join(', ')}`);
      if (u.nearbyBonus) lines.push(`  - nearby bonus: ${u.nearbyBonus}`);
    }
    lines.push('');
  }

  lines.push('## /go/ Redirect Usages');
  lines.push('');
  for (const g of goLinks) {
    lines.push(`- **${g.file}:${g.line}** → /go/${g.slug}`);
  }
  lines.push('');

  if (hardcoded.length > 0) {
    lines.push('## ⚠️ Hardcoded URLs Outside Registry');
    lines.push('');
    for (const h of hardcoded) {
      lines.push(`- **${h.file}:${h.line}** [${h.slug}] \`${h.url}\``);
      if (h.params.length) lines.push(`  - params: ${h.params.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function buildDashboard() {
  const lines = [];
  lines.push('# Affiliate Link Dashboard');
  lines.push('');
  lines.push(`> Auto-generated ${new Date().toISOString().slice(0, 10)} · Run \`npm run affiliate:inventory\` to refresh`);
  lines.push('');

  const full    = summary.filter(s => s.partnerStatus === 'full');
  const limited = summary.filter(s => s.partnerStatus === 'limited');
  const pending = summary.filter(s => s.partnerStatus === 'pending');
  const broken  = summary.filter(s => s.warnings.length > 0);
  const hc      = summary.filter(s => s.hardcodedUsages > 0);

  lines.push('## ✅ Full Partners');
  lines.push('');
  lines.push('| Exchange | Bonus | Code | Primary URL | /go/ usages |');
  lines.push('|---|---|---|---|---|');
  for (const s of full) {
    const amt = s.maxBonusAmount ? `${s.maxBonusAmount.toLocaleString()} ${s.bonusCurrency}` : '—';
    lines.push(`| **${s.slug}** | ${amt} | \`${s.promoCode ?? '—'}\` | \`${(s.primaryUrl || '—').slice(0, 55)}\` | ${s.goRedirectUsages} |`);
  }
  lines.push('');

  lines.push('## ⚠️ Limited Partners');
  lines.push('');
  for (const s of limited) {
    lines.push(`### ${s.slug}`);
    lines.push(`- **Status:** ${s.partnerStatus}`);
    lines.push(`- **Clean URL:** \`${s.primaryUrl}\``);
    lines.push(`- **Bonus:** ${s.bonusLabel ?? '—'}`);
    lines.push(`- **Note:** Editorial listing only. No referral link. No promo code.`);
    lines.push('');
  }

  lines.push('## ⏳ Pending Partners');
  lines.push('');
  for (const s of pending) {
    lines.push(`### ${s.slug}`);
    lines.push(`- **Status:** pending — affiliate deal not yet confirmed`);
    lines.push(`- **Clean URL:** \`${s.primaryUrl}\``);
    lines.push(`- **Bonus:** ${s.bonusLabel ?? '—'}`);
    lines.push(`- **Action:** Confirm affiliate deal → update to full + set affiliateWithCode URL`);
    lines.push('');
  }

  if (broken.length > 0) {
    lines.push('## ❌ Broken / Issues');
    lines.push('');
    for (const s of broken) {
      lines.push(`### ${s.slug}`);
      for (const w of s.warnings) lines.push(`- ⚠️ ${w}`);
      lines.push('');
    }
  } else {
    lines.push('## ❌ Broken / Issues');
    lines.push('');
    lines.push('✅ No broken links or issues found.');
    lines.push('');
  }

  if (hc.length > 0) {
    lines.push('## 🔍 Hardcoded URLs Outside Registry');
    lines.push('');
    for (const s of hc) {
      lines.push(`- **${s.slug}** — ${s.hardcodedUsages} hardcoded URL(s)`);
    }
    lines.push('');
  } else {
    lines.push('## 🔍 Hardcoded URLs Outside Registry');
    lines.push('');
    lines.push('✅ None found.');
    lines.push('');
  }

  lines.push('## 🔒 Coinbase Verification');
  lines.push('');
  const cb = summary.find(s => s.slug === 'coinbase');
  lines.push(`- partnerStatus: \`${cb?.partnerStatus ?? 'NOT FOUND'}\``);
  lines.push(`- primaryLinkType: \`${cb?.primaryLinkType ?? '—'}\``);
  lines.push(`- clean URL: \`${cb?.primaryUrl ?? '—'}\``);
  lines.push(`- promoCode: \`${cb?.promoCode ?? 'null'}\``);
  lines.push(`- Referral params: ${cb?.warnings.some(w => w.includes('COINBASE')) ? '❌ DETECTED' : '✅ NONE'}`);
  lines.push('');

  lines.push('## 💰 Bonus / Code Reference Table');
  lines.push('');
  lines.push('| Exchange | Bonus | Code | Type |');
  lines.push('|---|---|---|---|');
  for (const s of summary) {
    if (s.partnerStatus !== 'full') continue;
    const amt = s.maxBonusAmount ? `${s.maxBonusAmount.toLocaleString()} ${s.bonusCurrency}` : '—';
    lines.push(`| ${s.slug} | ${amt} | \`${s.promoCode ?? '—'}\` | ${s.primaryLinkType} |`);
  }
  lines.push('');

  lines.push('## 📋 Next Actions');
  lines.push('');
  for (const s of summary) {
    if (s.actionNeeded !== 'OK') {
      lines.push(`- **${s.slug}:** ${s.warnings.join('; ')}`);
    }
  }
  if (summary.every(s => s.actionNeeded === 'OK')) {
    lines.push('✅ All links are clean. No actions needed.');
  }
  lines.push('');

  return lines.join('\n');
}

function buildSummaryMarkdown() {
  const lines = [];
  lines.push('# Affiliate Link Summary');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push('| Exchange | Status | Type | Primary URL | Code | Bonus | Max | Usages | HC | Warns | Action |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const s of summary) {
    const url = (s.primaryUrl || '—').slice(0, 45);
    const amt = s.maxBonusAmount ? `${s.maxBonusAmount} ${s.bonusCurrency}` : '—';
    const w = s.warnings.length;
    lines.push(`| ${s.slug} | ${s.partnerStatus} | ${s.primaryLinkType} | \`${url}\` | ${s.promoCode ?? '—'} | ${(s.bonusLabel ?? '—').slice(0, 25)} | ${amt} | ${s.totalUsages} | ${s.hardcodedUsages} | ${w} | ${s.actionNeeded} |`);
  }
  lines.push('');
  lines.push(`**Totals:** ${summary.length} exchanges · ${summary.filter(s=>s.partnerStatus==='full').length} full · ${summary.filter(s=>s.partnerStatus==='limited').length} limited · ${summary.filter(s=>s.partnerStatus==='pending').length} pending · ${hardcoded.length} hardcoded issues`);
  lines.push('');
  return lines.join('\n');
}

if (JSON_OUT) {
  const out = {
    generatedAt: new Date().toISOString(),
    summary,
    inventory: Object.fromEntries(Object.entries(inventory).map(([k,v]) => [k, v.urls])),
    hardcoded,
    goLinks,
  };
  if (WRITE) {
    mkdirSync(join(ROOT, 'reports'), { recursive: true });
    writeFileSync(join(ROOT, 'reports/affiliate-link-inventory.json'), JSON.stringify(out, null, 2));
    console.log('✅ Wrote reports/affiliate-link-inventory.json');
  } else {
    console.log(JSON.stringify(out, null, 2));
  }
} else if (MD_OUT || WRITE) {
  mkdirSync(join(ROOT, 'reports'), { recursive: true });
  const mdReport   = buildMarkdownReport();
  const dashboard  = buildDashboard();
  const summaryMd  = buildSummaryMarkdown();

  if (WRITE) {
    writeFileSync(join(ROOT, 'reports/affiliate-link-inventory.md'), mdReport);
    writeFileSync(join(ROOT, 'reports/affiliate-dashboard.md'), dashboard);
    writeFileSync(join(ROOT, 'reports/affiliate-link-summary.md'), summaryMd);
    console.log('✅ Wrote reports/affiliate-link-inventory.md');
    console.log('✅ Wrote reports/affiliate-dashboard.md');
    console.log('✅ Wrote reports/affiliate-link-summary.md');
  } else {
    console.log(dashboard);
  }
} else {
  // Default: print dashboard to stdout
  console.log(buildDashboard());
  console.log('─'.repeat(60));
  if (hardcoded.length > 0) {
    console.log(`\n⚠️  ${hardcoded.length} hardcoded URL(s) outside registry:`);
    for (const h of hardcoded.slice(0, 10)) {
      console.log(`  ${h.file}:${h.line} [${h.slug}] ${h.url.slice(0, 80)}`);
    }
  } else {
    console.log('\n✅ No hardcoded URLs outside registry.');
  }
  console.log(`\n📊 /go/ redirect usages: ${goLinks.length}`);
  console.log(`📊 Total exchange URLs found: ${Object.values(inventory).flatMap(d => d.urls).length}`);
}
