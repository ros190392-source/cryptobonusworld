#!/usr/bin/env node
/**
 * CBW Weekly Search & AI Intelligence Brief — generator (PROTOTYPE)
 *
 * Deterministic, offline. Reads the approved governance registries and emits a
 * DRAFT checklist report. It NEVER fetches the internet and NEVER invents findings.
 * Governance authority: owner-ops/governance/CBW_GOVERNANCE_COUNCIL_v1.md (§10 automation boundary).
 *
 * Usage:
 *   node scripts/governance/weekly-search-ai-brief.mjs --dry-run
 *   node scripts/governance/weekly-search-ai-brief.mjs --date 2026-07-20 --dry-run
 *   node scripts/governance/weekly-search-ai-brief.mjs --date 2026-07-20
 *   node scripts/governance/weekly-search-ai-brief.mjs --date 2026-07-20 --force
 *   node scripts/governance/weekly-search-ai-brief.mjs --help
 *
 * Exit codes: 0 success · 1 validation/usage error · 2 target exists without --force
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const GOV_DIR = join(REPO_ROOT, 'owner-ops', 'governance');
const OUT_DIR = join(REPO_ROOT, 'reports', 'governance', 'weekly');

const WEEKLY_OWNERS = ['R03', 'R04', 'R06', 'R09'];
const SUPPORTED_CADENCE = ['WEEKLY', 'MONTHLY', 'QUARTERLY'];
const GOVERNANCE_VERSION = '1.0';

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function usage(exitCode = 0) {
  console.log(`CBW Weekly Search & AI Intelligence Brief — generator (prototype)

Commands:
  --dry-run            Print the report to stdout; write nothing.
  --date YYYY-MM-DD    Deterministic report date (defaults to today when omitted).
  --force              Allow overwrite ONLY when the target report already exists.
  --help               Show this help.

Examples:
  node scripts/governance/weekly-search-ai-brief.mjs --dry-run
  node scripts/governance/weekly-search-ai-brief.mjs --date 2026-07-20 --dry-run
  node scripts/governance/weekly-search-ai-brief.mjs --date 2026-07-20
  node scripts/governance/weekly-search-ai-brief.mjs --date 2026-07-20 --force

Exit codes: 0 success · 1 validation/usage error · 2 target exists without --force
This tool is offline and never publishes, deploys, or invents findings.`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { dryRun: false, force: false, date: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--date') {
      args.date = argv[++i];
      if (args.date === undefined) fail('--date requires a YYYY-MM-DD value');
    } else if (a.startsWith('--date=')) {
      args.date = a.slice('--date='.length);
    } else {
      fail(`unknown argument: ${a} (use --help)`);
    }
  }
  return args;
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function todayISO() {
  const n = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}

function loadJSON(name) {
  const p = join(GOV_DIR, name);
  if (!existsSync(p)) fail(`missing governance file: ${name}`);
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    fail(`could not parse ${name}: ${e.message}`);
  }
}

function validateGovernance(reg, ksr, refresh, gates) {
  const roleIds = new Set((reg.roles || []).map((r) => r.id));
  if (roleIds.size === 0) fail('council-registry.json has no roles');

  // source IDs unique
  const seen = new Set();
  for (const s of ksr.sources) {
    if (seen.has(s.id)) fail(`duplicate source id: ${s.id}`);
    seen.add(s.id);
    // every source role exists
    for (const r of s.roles || []) {
      if (!roleIds.has(r)) fail(`source ${s.id} references unknown role ${r}`);
    }
    // cadence supported
    if (!SUPPORTED_CADENCE.includes(s.cadence)) {
      fail(`source ${s.id} has unsupported cadence ${s.cadence}`);
    }
  }

  // weekly owners exist
  const weeklyOwners = (refresh.weekly && refresh.weekly.owners) || [];
  for (const r of weeklyOwners) {
    if (!roleIds.has(r)) fail(`refresh weekly owner ${r} not in council-registry`);
  }
  // auto_publish must be false
  if (refresh.weekly.auto_publish !== false) {
    fail('refresh-policy.weekly.auto_publish must be false (automation boundary)');
  }
  // output path stays under reports/governance/weekly/
  const declaredOut = String(refresh.weekly.output || '');
  if (!declaredOut.startsWith('reports/governance/weekly/')) {
    fail(`refresh weekly.output must be under reports/governance/weekly/ (got: ${declaredOut})`);
  }
  // gates all have owners (referential sanity; read-only)
  for (const g of gates.gates || []) {
    if (!g.owner) fail(`gate ${g.id} has no owner`);
    if (g.owner !== 'OWNER' && !roleIds.has(g.owner)) fail(`gate ${g.id} owner ${g.owner} unknown`);
  }
  return { roleIds, weeklyOwners };
}

function selectWeeklySources(ksr) {
  const owners = new Set(WEEKLY_OWNERS);
  // WEEKLY cadence AND owned by at least one weekly owner. Deterministic order = registry order.
  return ksr.sources.filter((s) => s.cadence === 'WEEKLY' && (s.roles || []).some((r) => owners.has(r)));
}

function roleName(reg, id) {
  const r = (reg.roles || []).find((x) => x.id === id);
  return r ? `${id} ${r.name}` : id;
}

function buildReport(date, reg, ksr, refresh, selected) {
  const L = [];
  L.push('# CBW Weekly Search & AI Intelligence Brief');
  L.push('');
  L.push(`- Report date: ${date}`);
  L.push('- Status: DRAFT');
  L.push('- Generated by: scripts/governance/weekly-search-ai-brief.mjs (deterministic, offline)');
  L.push(`- Governance version: ${GOVERNANCE_VERSION}`);
  L.push(`- Weekly owners: ${WEEKLY_OWNERS.join(', ')}`);
  L.push('- Auto-publish: false');
  L.push(`- Source count: ${selected.length}`);
  L.push('');
  L.push('## Executive Summary');
  L.push('');
  L.push('- Material changes detected: UNKNOWN');
  L.push('- Standards requiring review: UNKNOWN');
  L.push('- Production action authorized: NO');
  L.push('- Owner decision required: NO — until findings are completed');
  L.push('');
  L.push('## Scope');
  L.push('');
  L.push('This report monitors official (Tier A) sources on the weekly cadence. It contains NO automatic');
  L.push('conclusions: this generator does not fetch the internet and does not invent findings. Every');
  L.push('finding below is a placeholder to be completed by a human council reviewer.');
  L.push('');
  L.push('## Freshness Evaluation');
  L.push('');
  L.push('DUE_SOON evaluation unavailable: no source review-state registry exists yet.');
  L.push('');
  L.push('DUE_SOON is not calculated from cadence alone. It will become available once a persisted');
  L.push('source-review-state registry (last-reviewed dates per source) is added under governance.');
  L.push('');
  L.push('## Sources Scheduled This Week');
  L.push('');
  if (selected.length === 0) {
    L.push('_No WEEKLY sources are currently owned by a weekly owner._');
    L.push('');
  }
  for (const s of selected) {
    L.push(`### ${s.id}`);
    L.push(`- Tier: ${s.tier}`);
    L.push(`- Cadence: ${s.cadence}`);
    L.push(`- URL (evidence): ${s.url}`);
    L.push(`- Assigned roles: ${(s.roles || []).join(', ')}`);
    L.push('- Freshness state: UNDER_REVIEW');
    L.push('- Last reviewed: NOT RECORDED');
    L.push('- Change detected: UNKNOWN');
    L.push('- Official finding: TO BE COMPLETED');
    L.push('- Affected CBW standards: TO BE ASSESSED');
    L.push('- Recommended action: NONE UNTIL REVIEWED');
    L.push('- Evidence notes: EMPTY');
    L.push('');
  }
  L.push('## Council Impact Review');
  L.push('');
  for (const rid of WEEKLY_OWNERS) {
    L.push(`### ${roleName(reg, rid)}`);
    L.push('- Review status: NOT REVIEWED');
    L.push('- Impact on CBW: TO BE ASSESSED');
    L.push('- Proposed action: NONE UNTIL REVIEWED');
    L.push('');
  }
  L.push('## Potentially Affected Areas');
  L.push('');
  const areas = [
    'Design system', 'Page templates', 'Indexability', 'Canonical / hreflang',
    'Structured data', 'AI-answer structure', 'GEO research', 'Affiliate offers',
    'Accessibility', 'Performance', 'Editorial policy', 'Monitoring automation',
  ];
  for (const a of areas) L.push(`- [ ] ${a}`);
  L.push('');
  L.push('## Proposed Decisions');
  L.push('');
  L.push('No decision may be marked Council Approved without a stored decision record');
  L.push('(owner-ops/governance/decision-record.schema.json) and owner approval.');
  L.push('');
  L.push('## Automation Boundary');
  L.push('');
  L.push('This draft cannot:');
  L.push('- publish;');
  L.push('- deploy;');
  L.push('- change rankings;');
  L.push('- change affiliate facts;');
  L.push('- modify legal conclusions;');
  L.push('- update governance standards;');
  L.push('- create public routes.');
  L.push('');
  L.push('## Required Human Follow-Up');
  L.push('');
  L.push('- [ ] Open each official source');
  L.push('- [ ] Record publication/update date');
  L.push('- [ ] Summarize actual change');
  L.push('- [ ] Capture evidence');
  L.push('- [ ] Assess affected standards');
  L.push('- [ ] Create decision record if material');
  L.push('- [ ] Request owner approval');
  L.push('');
  L.push('## Sign-off');
  L.push('');
  L.push('- R03: PENDING');
  L.push('- R04: PENDING');
  L.push('- R06: PENDING');
  L.push('- R09: PENDING');
  L.push('- Owner: NOT REQUESTED');
  L.push('');
  return L.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) usage(0);

  const date = args.date ?? todayISO();
  if (!validDate(date)) fail(`invalid --date: ${args.date} (expected YYYY-MM-DD)`);

  const reg = loadJSON('council-registry.json');
  const ksr = loadJSON('knowledge-source-registry.json');
  const refresh = loadJSON('refresh-policy.json');
  const gates = loadJSON('review-gates.json');

  validateGovernance(reg, ksr, refresh, gates);
  const selected = selectWeeklySources(ksr);

  const report = buildReport(date, reg, ksr, refresh, selected);
  const outPath = join(OUT_DIR, `${date}-search-ai-weekly.md`);
  const outRel = relative(REPO_ROOT, outPath).split(sep).join('/');

  // Safety: output path must remain under reports/governance/weekly/
  if (!outRel.startsWith('reports/governance/weekly/')) {
    fail(`refusing to write outside reports/governance/weekly/ (${outRel})`);
  }

  // Console summary
  console.log('CBW Weekly Search & AI Intelligence Brief — generator');
  console.log(`  selected date:      ${date}`);
  console.log(`  dry-run:            ${args.dryRun}`);
  console.log(`  source count:       ${selected.length}`);
  console.log(`  selected source IDs: ${selected.map((s) => s.id).join(', ') || '(none)'}`);
  console.log(`  output path:        ${outRel}`);
  console.log(`  auto_publish:       false`);

  if (args.dryRun) {
    console.log('  file written:       NO (dry-run)');
    console.log('----- BEGIN REPORT -----');
    process.stdout.write(report + '\n');
    console.log('----- END REPORT -----');
    process.exit(0);
  }

  if (existsSync(outPath) && !args.force) {
    console.error(`  file written:       NO`);
    console.error(`ERROR: target already exists: ${outRel} (use --force to overwrite)`);
    process.exit(2);
  }
  if (existsSync(outPath) && args.force) {
    console.log('  overwrite:          REQUESTED (--force)');
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(outPath, report, 'utf8');
  console.log('  file written:       YES');
  process.exit(0);
}

main();
