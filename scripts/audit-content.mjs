#!/usr/bin/env node
/**
 * audit-content.mjs — CryptoBonusWorld Content Quality Audit
 *
 * Scores editorial content quality for all exchanges and generates
 * a report showing what's missing and what needs improvement.
 *
 * Usage:
 *   node scripts/audit-content.mjs          # colored table
 *   node scripts/audit-content.mjs --json   # JSON output
 *   node scripts/audit-content.mjs --slug bybit  # single exchange detail
 *
 * Exit codes:
 *   0 — all exchanges grade B or above (ready for production)
 *   1 — one or more exchanges grade D (critical content gaps)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

// ── Load data ─────────────────────────────────────────────────────────────────

const exchanges = JSON.parse(
  readFileSync(join(ROOT, 'src/data/exchanges.json'), 'utf8')
);

// ── Content quality scoring (mirrors contentEngine.ts) ────────────────────────

function scoreContentQuality(ex) {
  const missing = [];
  const suggestions = [];
  let score = 0;

  // Long description (most impactful for SEO)
  const longDesc = ex.longDescription ?? '';
  if (longDesc.length >= 150) {
    score += 25;
  } else if (longDesc.length > 0) {
    score += 10;
    suggestions.push('Expand longDescription to 150+ chars');
  } else {
    missing.push('longDescription');
    suggestions.push('Add longDescription (200+ chars) covering exchange strengths');
  }

  // Short description
  const shortDesc = ex.shortDescription ?? '';
  if (shortDesc.length >= 60) {
    score += 15;
  } else if (shortDesc.length > 0) {
    score += 8;
    suggestions.push('Expand shortDescription to 60+ chars');
  } else {
    missing.push('shortDescription');
    suggestions.push('Add shortDescription (60-160 chars)');
  }

  // Editor note — editorial voice (new in this release)
  const editorNote = ex.editorNote ?? '';
  if (editorNote.length >= 80) {
    score += 15;
  } else if (editorNote.length > 0) {
    score += 7;
    suggestions.push('Expand editorNote to 80+ chars');
  } else {
    missing.push('editorNote');
    suggestions.push('Add editorNote — editorial verdict, who it\'s best for');
  }

  // Licences (trust / EEAT)
  if (ex.licences && ex.licences.length > 0) {
    score += 10;
  } else {
    missing.push('licences');
    suggestions.push('Add regulatory licences if available');
  }

  // Founded + HQ (authority)
  if (ex.founded) score += 5;
  else suggestions.push('Add founded year');

  if (ex.headquarters) score += 5;

  // Users (social proof)
  if (ex.users) score += 5;
  else suggestions.push('Add users field (e.g. "20M+")');

  // bestFor (compare page + editor summary)
  if (ex.bestFor && ex.bestFor.length >= 2) {
    score += 10;
  } else {
    missing.push('bestFor');
    suggestions.push('Add 2-4 bestFor tags');
  }

  // Bonus expiry
  if (ex.bonusExpiry) score += 5;
  else suggestions.push('Add bonusExpiry.days');

  // Trading volume
  if (ex.tradingVolumeRequired !== undefined && ex.tradingVolumeRequired !== null) {
    score += 5;
  }

  // Risk notes
  if (ex.riskNotes && ex.riskNotes.length > 30) {
    score += 5;
  } else {
    missing.push('riskNotes');
  }

  score = Math.min(score, 100);
  const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';

  return { score, grade, missing, suggestions };
}

// ── ANSI helpers ───────────────────────────────────────────────────────────────

const isJson = process.argv.includes('--json');
const slugFilter = (() => {
  const idx = process.argv.indexOf('--slug');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  gray:   '\x1b[90m',
};

function gradeColor(grade) {
  return { A: c.green, B: c.cyan, C: c.yellow, D: c.red }[grade] ?? c.white;
}

function scoreBar(score) {
  const filled = Math.round(score / 10);
  const empty  = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// ── Run audit ─────────────────────────────────────────────────────────────────

const targets = slugFilter
  ? exchanges.filter(e => e.slug === slugFilter)
  : exchanges;

if (slugFilter && targets.length === 0) {
  console.error(`Exchange not found: ${slugFilter}`);
  process.exit(1);
}

const results = targets.map(ex => ({
  slug:  ex.slug,
  name:  ex.name,
  ...scoreContentQuality(ex),
}));

// ── Output ────────────────────────────────────────────────────────────────────

if (isJson) {
  const out = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      byGrade: { A: 0, B: 0, C: 0, D: 0 },
      avgScore: 0,
    },
    exchanges: results,
  };
  results.forEach(r => out.summary.byGrade[r.grade]++);
  out.summary.avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  process.exit(results.some(r => r.grade === 'D') ? 1 : 0);
}

// ── Colored table ─────────────────────────────────────────────────────────────

const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
const gradeCounts = results.reduce((acc, r) => { acc[r.grade] = (acc[r.grade] ?? 0) + 1; return acc; }, {});

console.log('\n' + c.bold + '  CryptoBonusWorld — Content Quality Audit' + c.reset);
console.log(c.gray + '  ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) + c.reset);
console.log();

// Header
console.log(
  c.dim +
  '  ' +
  'Exchange'.padEnd(14) +
  'Score'.padEnd(8) +
  'Grade'.padEnd(7) +
  'Bar'.padEnd(14) +
  'Missing fields' +
  c.reset
);
console.log(c.dim + '  ' + '─'.repeat(70) + c.reset);

results.forEach(r => {
  const gc = gradeColor(r.grade);
  const missingStr = r.missing.length > 0 ? r.missing.join(', ') : c.green + '✓ complete' + c.reset;
  const scoreStr = String(r.score).padStart(3) + '/100';
  process.stdout.write(
    '  ' +
    c.white + r.name.padEnd(14) + c.reset +
    scoreStr.padEnd(8) +
    gc + c.bold + r.grade.padEnd(7) + c.reset +
    c.dim + scoreBar(r.score).padEnd(14) + c.reset +
    missingStr + '\n'
  );
});

console.log(c.dim + '  ' + '─'.repeat(70) + c.reset);

// Summary line
const gradeStr = Object.entries(gradeCounts)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([g, n]) => `${gradeColor(g)}${g}:${n}${c.reset}`)
  .join('  ');

console.log(
  '\n  ' +
  c.bold + `Avg score: ${avg}/100` + c.reset +
  c.gray + '  |  Grades: ' + c.reset + gradeStr +
  '\n'
);

// ── Detail section for --slug or grade D items ────────────────────────────────

const detailTargets = slugFilter
  ? results
  : results.filter(r => r.grade === 'D' || r.missing.length >= 3);

if (detailTargets.length > 0) {
  console.log(c.bold + '  Action Items' + c.reset);
  console.log(c.dim + '  ' + '─'.repeat(70) + c.reset);

  detailTargets.forEach(r => {
    const gc = gradeColor(r.grade);
    console.log(`\n  ${gc}${c.bold}${r.name}${c.reset} ${c.gray}(${r.score}/100 · Grade ${r.grade})${c.reset}`);
    if (r.missing.length > 0) {
      console.log(c.red + `  Missing: ${r.missing.join(', ')}` + c.reset);
    }
    r.suggestions.slice(0, 4).forEach(s => {
      console.log(c.gray + '  → ' + c.reset + s);
    });
  });
  console.log();
}

// ── AI Draft Prompts for worst exchanges ─────────────────────────────────────

const needsDraft = results
  .filter(r => !r.missing.includes('longDescription') === false || !r.missing.includes('editorNote') === false)
  .filter(r => r.grade === 'C' || r.grade === 'D')
  .slice(0, 3);

if (needsDraft.length > 0) {
  console.log(c.yellow + '  Tip: Run "npm run content:draft -- --slug <slug>" to generate an AI draft prompt.' + c.reset);
  console.log(c.gray  + '  Low-scoring exchanges: ' + needsDraft.map(r => r.slug).join(', ') + c.reset + '\n');
}

// ── Exit code ────────────────────────────────────────────────────────────────

const hasCritical = results.some(r => r.grade === 'D');
process.exit(hasCritical ? 1 : 0);
