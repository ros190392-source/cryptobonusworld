#!/usr/bin/env node
/**
 * verify-geo-bonus.mjs — GEO Bonus Discovery & Verification (v1 SKELETON)
 * ─────────────────────────────────────────────────────────────────────────
 * Plans and validates a country × device × exchange capture run for the GEO
 * Bonus Evidence model (src/data/geoBonusEvidence.ts). v1 is a skeleton:
 * it validates arguments against the verification matrix, resolves proxy
 * env-var placeholders, builds the task list, and writes a PLAN file — it
 * does NOT yet drive Playwright/proxy captures. Wire that in a follow-up
 * once proxy access per PROXY_ENV_PLACEHOLDERS is provisioned.
 *
 * This is deliberately separate from scripts/verify-bonus-capture.mjs (the
 * existing `bonus:verify` tool), which checks global/default bonus text
 * against site data and is not country/device/proxy-aware.
 *
 * Usage:
 *   npm run verify:geo-bonus -- --country=poland --exchange=bybit --device=mobile
 *   npm run verify:geo-bonus -- --country=poland --all-exchanges --all-devices
 *   npm run verify:geo-bonus -- --list                 (print the matrix, no plan)
 *
 * Output:
 *   reports/geo-bonus-verification-plan-{timestamp}.json  (task list, untracked)
 *   reports/evidence/geo-bonus/{country}/{date}/{exchange}/{device}/  (future capture output folder — untracked)
 *
 * Rules (non-negotiable — mirrors src/data/geoBonusEvidence.ts):
 *   - Never mark postSignupVerification anything but 'not_available' without
 *     a real, dated post-signup check.
 *   - Never run a country capture without its proxy env var set — skip and
 *     report 'blocked' instead of silently testing un-proxied.
 *   - Never fabricate a screenshot/HTML snapshot path — only reference files
 *     that were actually written.
 *   - Do NOT stage generated screenshots or HTML snapshots (reports/ and
 *     evidence output are untracked by design).
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Mirror of src/data/geoBonusEvidence.ts constants — kept manually in sync
// because this is a plain .mjs script and cannot import a .ts module
// directly. If you change the matrix in geoBonusEvidence.ts, update here too.
const VERIFICATION_COUNTRIES = ['global', 'poland', 'germany', 'kazakhstan', 'turkey', 'united-kingdom', 'united-states'];
const VERIFICATION_DEVICES = ['desktop', 'mobile'];
const VERIFICATION_EXCHANGES = ['bybit', 'mexc', 'okx', 'bitget', 'kucoin', 'bingx'];
const PROXY_ENV_PLACEHOLDERS = {
  poland: 'PROXY_PL',
  germany: 'PROXY_DE',
  kazakhstan: 'PROXY_KZ',
  turkey: 'PROXY_TR',
  'united-kingdom': 'PROXY_UK',
  'united-states': 'PROXY_US',
  // 'global' intentionally has no proxy — direct connection is correct there.
};

// ── CLI ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? null;
const hasFlag = (name) => args.includes(`--${name}`);

if (hasFlag('list')) {
  console.log('Countries:', VERIFICATION_COUNTRIES.join(', '));
  console.log('Devices:  ', VERIFICATION_DEVICES.join(', '));
  console.log('Exchanges:', VERIFICATION_EXCHANGES.join(', '));
  console.log('Proxy env placeholders:', JSON.stringify(PROXY_ENV_PLACEHOLDERS, null, 2));
  process.exit(0);
}

const country = getArg('country');
const exchangeArg = getArg('exchange');
const deviceArg = getArg('device');
const allExchanges = hasFlag('all-exchanges');
const allDevices = hasFlag('all-devices');

if (!country) {
  console.error('Missing --country=<slug>. Run with --list to see valid values.');
  process.exit(1);
}
if (!VERIFICATION_COUNTRIES.includes(country)) {
  console.error(`Unknown country "${country}". Valid: ${VERIFICATION_COUNTRIES.join(', ')}`);
  process.exit(1);
}

const exchanges = allExchanges ? VERIFICATION_EXCHANGES : (exchangeArg ? [exchangeArg] : null);
if (!exchanges) {
  console.error('Missing --exchange=<slug> or --all-exchanges.');
  process.exit(1);
}
for (const ex of exchanges) {
  if (!VERIFICATION_EXCHANGES.includes(ex)) {
    console.error(`Unknown exchange "${ex}". Valid: ${VERIFICATION_EXCHANGES.join(', ')}`);
    process.exit(1);
  }
}

const devices = allDevices ? VERIFICATION_DEVICES : (deviceArg ? [deviceArg] : VERIFICATION_DEVICES);
for (const d of devices) {
  if (!VERIFICATION_DEVICES.includes(d)) {
    console.error(`Unknown device "${d}". Valid: ${VERIFICATION_DEVICES.join(', ')}`);
    process.exit(1);
  }
}

// ── Proxy resolution (placeholders only — no real credentials handled) ─────
const proxyEnvKey = PROXY_ENV_PLACEHOLDERS[country] ?? null;
const proxyConfigured = proxyEnvKey ? Boolean(process.env[proxyEnvKey]) : (country === 'global');
const proxyStatus = country === 'global'
  ? 'not_required'
  : (proxyConfigured ? 'configured' : 'missing');

// ── Build the task list (plan only — no browser/network calls in v1) ───────
const capturedAt = new Date().toISOString();
const tasks = [];
for (const ex of exchanges) {
  for (const device of devices) {
    tasks.push({
      exchangeSlug: ex,
      countrySlug: country,
      deviceViewport: device,
      proxyEnvKey,
      proxyStatus,
      plannedOutputDir: `reports/evidence/geo-bonus/${country}/${capturedAt.slice(0, 10)}/${ex}/${device}/`,
      status: proxyStatus === 'missing' ? 'blocked' : 'planned',
      note: proxyStatus === 'missing'
        ? `Skipped: ${proxyEnvKey} not set. A country-specific capture must not run un-proxied.`
        : 'v1 skeleton — capture execution not yet implemented. Plan only.',
    });
  }
}

console.log(`GEO bonus verification PLAN — country=${country}, ${exchanges.length} exchange(s) × ${devices.length} device(s) = ${tasks.length} task(s)`);
for (const t of tasks) {
  console.log(`  [${t.status}] ${t.exchangeSlug} / ${t.deviceViewport} — ${t.note}`);
}

const reportsDir = join(ROOT, 'reports');
if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
const planPath = join(reportsDir, `geo-bonus-verification-plan-${capturedAt.replace(/[:.]/g, '-')}.json`);
writeFileSync(planPath, JSON.stringify({ country, capturedAt, tasks }, null, 2));
console.log(`\nPlan written to ${planPath} (untracked — do not stage).`);
console.log('NOTE: this is a v1 skeleton. No screenshots, HTML snapshots, or bonus/eligibility data were captured or claimed.');
