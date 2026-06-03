#!/usr/bin/env node
/**
 * generate-screenshot-review.mjs — Visual Review Contact Sheet Generator
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Generates a self-contained HTML + Markdown review sheet for all processed
 * screenshots from a given exchange. Images are embedded as base64 data URIs
 * so the HTML file can be opened directly in any browser without a server.
 *
 * Pulls quality scores from reports/screenshot-quality-report.md (if present)
 * and approval status from reports/screenshot-approval-queue.json.
 *
 * Usage:
 *   node scripts/generate-screenshot-review.mjs --exchange binance
 *   npm run screenshots:review -- --exchange binance
 *
 * Options:
 *   --exchange <slug>   Exchange to review (required)
 *   --out <dir>         Output directory (default: reports/)
 *   --no-embed          Use relative image paths instead of base64 (smaller file)
 *   --verbose           Extra output
 *
 * Outputs:
 *   reports/{exchange}-screenshot-review.html   (self-contained, openable directly)
 *   reports/{exchange}-screenshot-review.md     (table with metadata + CLI commands)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// ── CLI ───────────────────────────────────────────────────────────────────────

const ARGV      = process.argv.slice(2);
const flag      = (n)     => ARGV.includes(n);
const opt       = (n, fb) => { const i = ARGV.indexOf(n); return i !== -1 && i+1 < ARGV.length ? ARGV[i+1] : (fb ?? null); };

const EXCHANGE  = opt('--exchange');
const OUT_DIR   = opt('--out', join(ROOT, 'reports'));
const NO_EMBED  = flag('--no-embed');
const VERBOSE   = flag('--verbose');

const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);

if (!EXCHANGE) {
  console.log('Usage: node scripts/generate-screenshot-review.mjs --exchange <slug>');
  process.exit(0);
}

// ── Screenshot discovery ──────────────────────────────────────────────────────

function discoverScreenshots(exchange) {
  const exDir = join(ROOT, 'public', 'screenshots', exchange);
  if (!existsSync(exDir)) return [];

  const shots = [];
  const categories = readdirSync(exDir)
    .filter(c => statSync(join(exDir, c)).isDirectory())
    .sort();

  for (const category of categories) {
    const catDir = join(exDir, category);
    const files  = readdirSync(catDir)
      .filter(f => f.endsWith('.webp') || f.endsWith('.png'))
      .sort();

    for (const file of files) {
      const filePath = join(catDir, file);
      const stat     = statSync(filePath);
      shots.push({
        exchange,
        category,
        filename: file,
        filePath,
        publicPath: `/screenshots/${exchange}/${category}/${file}`,
        relativePath: `../public/screenshots/${exchange}/${category}/${file}`,
        sizeKB: Math.round(stat.size / 1024),
        device: file.includes('mobile') ? 'mobile' : 'desktop',
        date: (file.match(/(\d{4}-\d{2})/) ?? ['', '?'])[1],
      });
    }
  }
  return shots;
}

// ── Load quality data ─────────────────────────────────────────────────────────

function loadQualityData() {
  const qPath = join(ROOT, 'reports', 'screenshot-approval-queue.json');
  if (!existsSync(qPath)) return {};

  try {
    const queue = JSON.parse(readFileSync(qPath, 'utf-8'));
    const map   = {};
    for (const item of (queue.items ?? [])) {
      map[`${item.exchange}/${item.category}`] = item;
    }
    return map;
  } catch { return {}; }
}

// ── Image → base64 ────────────────────────────────────────────────────────────

function toDataUri(filePath) {
  const buf  = readFileSync(filePath);
  const ext  = extname(filePath).toLowerCase();
  const mime = ext === '.webp' ? 'image/webp' : ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

// ── HTML generator ────────────────────────────────────────────────────────────

function generateHTML(exchange, shots, qualityMap) {
  const generatedAt = new Date().toISOString().slice(0, 19) + 'Z';
  const total       = shots.length;
  const recommended = shots.filter(s => qualityMap[`${s.exchange}/${s.category}`]?.recommendedForApproval === true).length;

  const cards = shots.map(shot => {
    const key   = `${shot.exchange}/${shot.category}`;
    const qData = qualityMap[key] ?? {};
    const rec   = qData.recommendedForApproval;
    const score = qData.qualityScore ?? qData.score ?? null;
    const flags = qData.qualityFlags ?? [];
    const status = qData.status ?? 'unknown';

    const recBadge = rec === true
      ? '<span class="badge rec">⭐ Recommended</span>'
      : rec === false
        ? '<span class="badge fail">⚠ Issues</span>'
        : '<span class="badge unknown">? Unvalidated</span>';

    const statusBadge = status === 'pending_approval'
      ? '<span class="badge pending">🟡 Pending</span>'
      : status === 'approved'
        ? '<span class="badge approved">✅ Approved</span>'
        : status === 'skipped'
          ? '<span class="badge skip">— Skipped</span>'
          : `<span class="badge fail">❌ ${status}</span>`;

    const imgSrc = NO_EMBED ? shot.relativePath : toDataUri(shot.filePath);
    const deviceIcon = shot.device === 'mobile' ? '📱' : '🖥';
    const flagsHtml = flags.length
      ? `<div class="flags">⚠ ${flags.map(f => `<code>${f}</code>`).join(' ')}</div>`
      : '';

    return `
    <div class="card" id="${shot.category}">
      <div class="card-header">
        <span class="cat">${deviceIcon} ${shot.category}</span>
        <span class="meta">${shot.device} · ${shot.date}</span>
      </div>
      <div class="img-wrap ${shot.device}">
        <img src="${imgSrc}" alt="${shot.category} screenshot" loading="lazy">
      </div>
      <div class="card-body">
        <div class="badges">${recBadge} ${statusBadge}</div>
        <table class="meta-table">
          <tr><td>File</td><td><code>${shot.filename}</code></td></tr>
          <tr><td>Size</td><td>${shot.sizeKB} KB</td></tr>
          ${score !== null ? `<tr><td>Quality score</td><td><strong>${score}/100</strong></td></tr>` : ''}
          <tr><td>Path</td><td><code>${shot.publicPath}</code></td></tr>
        </table>
        ${flagsHtml}
        <div class="cli">
          <div class="cli-label">Approve:</div>
          <code class="cmd">npm run screenshots:approve -- --approve ${key}</code>
          <div class="cli-label mt">Reject:</div>
          <code class="cmd">npm run screenshots:approve -- --reject ${key} --reason "..."</code>
        </div>
      </div>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${exchange.toUpperCase()} Screenshot Review — CryptoBonusWorld</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0f0f1a; color: #e2e2f0; margin: 0; padding: 24px;
    line-height: 1.5;
  }
  h1 { font-size: 1.6rem; font-weight: 700; color: #a78bfa; margin: 0 0 4px; }
  .subtitle { color: #6b7280; font-size: 0.9rem; margin-bottom: 32px; }
  .summary-bar {
    display: flex; gap: 24px; flex-wrap: wrap;
    background: #1a1a2e; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px; padding: 20px 24px; margin-bottom: 40px;
  }
  .stat { display: flex; flex-direction: column; }
  .stat-value { font-size: 1.8rem; font-weight: 700; color: #a78bfa; line-height: 1; }
  .stat-label { font-size: 0.78rem; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
  .toc { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 32px; }
  .toc a {
    background: #1e1e30; border: 1px solid rgba(255,255,255,0.1);
    color: #a78bfa; padding: 6px 14px; border-radius: 20px;
    text-decoration: none; font-size: 0.82rem;
    transition: background 0.15s;
  }
  .toc a:hover { background: #2a2a42; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(520px, 1fr)); gap: 28px; }
  .card {
    background: #16162a; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px; overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  }
  .card-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 20px; background: #1e1e30;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .cat { font-weight: 600; font-size: 1rem; color: #e2e2f0; }
  .meta { font-size: 0.8rem; color: #6b7280; }
  .img-wrap { background: #0d0d1a; display: flex; justify-content: center; padding: 16px; }
  .img-wrap.desktop img { width: 100%; max-width: 480px; border-radius: 6px; display: block; }
  .img-wrap.mobile img { width: 160px; border-radius: 12px; display: block; }
  .card-body { padding: 16px 20px; }
  .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 600;
  }
  .badge.rec     { background: rgba(52,211,153,0.15); color: #34d399; border: 1px solid rgba(52,211,153,0.3); }
  .badge.fail    { background: rgba(248,113,113,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.3); }
  .badge.pending { background: rgba(251,191,36,0.15);  color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
  .badge.approved { background: rgba(52,211,153,0.15); color: #34d399; border: 1px solid rgba(52,211,153,0.3); }
  .badge.skip    { background: rgba(107,114,128,0.15); color: #6b7280; border: 1px solid rgba(107,114,128,0.3); }
  .badge.unknown { background: rgba(167,139,250,0.15); color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); }
  .meta-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 12px; }
  .meta-table td { padding: 3px 0; }
  .meta-table td:first-child { color: #6b7280; width: 110px; }
  code { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.8rem; }
  .flags { background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.2);
    color: #fbbf24; padding: 6px 10px; border-radius: 6px; font-size: 0.78rem; margin-bottom: 12px; }
  .cli { background: #0d0d1a; border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px; padding: 10px 14px; }
  .cli-label { font-size: 0.72rem; color: #6b7280; text-transform: uppercase;
    letter-spacing: 0.06em; margin-bottom: 4px; }
  .cli-label.mt { margin-top: 10px; }
  .cmd { display: block; color: #a78bfa; font-size: 0.78rem; word-break: break-all; }
  footer { margin-top: 40px; text-align: center; color: #4b5563; font-size: 0.8rem; }
</style>
</head>
<body>

<h1>📸 ${exchange.toUpperCase()} Screenshot Review</h1>
<div class="subtitle">Generated: ${generatedAt} · ${total} screenshots · ${recommended} recommended for approval</div>

<div class="summary-bar">
  <div class="stat"><span class="stat-value">${total}</span><span class="stat-label">Total</span></div>
  <div class="stat"><span class="stat-value" style="color:#fbbf24">${shots.filter(s => (qualityMap[`${s.exchange}/${s.category}`]?.status) === 'pending_approval').length}</span><span class="stat-label">Pending Approval</span></div>
  <div class="stat"><span class="stat-value" style="color:#34d399">${recommended}</span><span class="stat-label">Recommended ⭐</span></div>
  <div class="stat"><span class="stat-value" style="color:#34d399">${shots.filter(s => (qualityMap[`${s.exchange}/${s.category}`]?.status) === 'approved').length}</span><span class="stat-label">Approved</span></div>
  <div class="stat"><span class="stat-value">${shots.filter(s => s.device === 'desktop').length}</span><span class="stat-label">Desktop</span></div>
  <div class="stat"><span class="stat-value">${shots.filter(s => s.device === 'mobile').length}</span><span class="stat-label">Mobile</span></div>
</div>

<div class="toc">
${shots.map(s => `  <a href="#${s.category}">${s.device === 'mobile' ? '📱' : '🖥'} ${s.category}</a>`).join('\n')}
</div>

<div class="grid">
${cards}
</div>

<footer>
  CryptoBonusWorld · Screenshot Review Sheet · ${exchange} · ${generatedAt}<br>
  Approve all: <code>npm run screenshots:approve -- --exchange ${exchange} --approve-all</code>
</footer>

</body>
</html>`;
}

// ── Markdown generator ────────────────────────────────────────────────────────

function generateMarkdown(exchange, shots, qualityMap) {
  const generatedAt = new Date().toISOString().slice(0, 19) + 'Z';
  const total       = shots.length;
  const recommended = shots.filter(s => qualityMap[`${s.exchange}/${s.category}`]?.recommendedForApproval === true).length;

  const rows = shots.map(shot => {
    const key   = `${shot.exchange}/${shot.category}`;
    const qData = qualityMap[key] ?? {};
    const rec   = qData.recommendedForApproval === true ? '⭐ Yes' : qData.recommendedForApproval === false ? '⚠ No' : '?';
    const score = qData.qualityScore ?? qData.score ?? '?';
    const status = qData.status ?? '?';
    const flags = (qData.qualityFlags ?? []).join(', ') || '—';
    const statusIcon = status === 'pending_approval' ? '🟡'
                     : status === 'approved' ? '✅'
                     : status === 'skipped' ? '—' : '❌';
    return `| ${statusIcon} \`${shot.category}\` | ${shot.device} | ${shot.sizeKB} KB | ${score}/100 | ${rec} | ${flags} |`;
  }).join('\n');

  const cliSection = shots.map(shot => {
    const key = `${shot.exchange}/${shot.category}`;
    return `# ${shot.category}\nnpm run screenshots:approve -- --approve ${key}\nnpm run screenshots:approve -- --reject ${key} --reason "..."`;
  }).join('\n\n');

  return `# ${exchange.toUpperCase()} Screenshot Review
**Generated:** ${generatedAt}
**Exchange:** ${exchange}
**Total:** ${total} screenshots — ${recommended} recommended for approval

## Review Table

| Category | Device | Size | Quality | Recommended | Issues |
|----------|--------|------|---------|-------------|--------|
${rows}

## Screenshot Paths

${shots.map(s => `- \`${s.device === 'mobile' ? '📱' : '🖥'}\` **${s.category}** → \`${s.publicPath}\` (${s.sizeKB} KB)`).join('\n')}

## Approval Commands

\`\`\`bash
# Approve ALL pending (after visual review):
npm run screenshots:approve -- --exchange ${exchange} --approve-all

# Approve individual screenshots:
${shots.map(s => `npm run screenshots:approve -- --approve ${exchange}/${s.category}`).join('\n')}
\`\`\`

## Reject Commands

\`\`\`bash
# Reject with reason:
npm run screenshots:approve -- --reject ${exchange}/registration --reason "wrong page state"
npm run screenshots:approve -- --reject ${exchange}/spot --reason "chart did not render"
npm run screenshots:approve -- --reject ${exchange}/p2p --reason "merchant names visible"
\`\`\`

## Individual Commands Reference

\`\`\`bash
${cliSection}
\`\`\`

---
*HTML review sheet: \`reports/${exchange}-screenshot-review.html\` (open in browser for image previews)*
`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log('');
  log(`🖼  Generating screenshot review sheet for ${EXCHANGE.toUpperCase()}`);
  log('─'.repeat(56));

  const shots = discoverScreenshots(EXCHANGE);
  if (!shots.length) {
    log(`No screenshots found at public/screenshots/${EXCHANGE}/`);
    return;
  }
  log(`  Found: ${shots.length} screenshot(s)`);

  const qualityMap = loadQualityData();
  log(`  Quality entries: ${Object.keys(qualityMap).length}`);

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // HTML
  const htmlContent = generateHTML(EXCHANGE, shots, qualityMap);
  const htmlPath    = join(OUT_DIR, `${EXCHANGE}-screenshot-review.html`);
  writeFileSync(htmlPath, htmlContent, 'utf-8');
  const htmlKB = Math.round(Buffer.byteLength(htmlContent, 'utf-8') / 1024);
  log(`  ✅ HTML: reports/${EXCHANGE}-screenshot-review.html (${htmlKB} KB)`);

  // Markdown
  const mdContent = generateMarkdown(EXCHANGE, shots, qualityMap);
  const mdPath    = join(OUT_DIR, `${EXCHANGE}-screenshot-review.md`);
  writeFileSync(mdPath, mdContent, 'utf-8');
  log(`  ✅ MD:   reports/${EXCHANGE}-screenshot-review.md`);

  log('');
  log(`  Open in browser:`);
  log(`    ${htmlPath}`);
  log('');

  // Summary
  const recommended = shots.filter(s => qualityMap[`${s.exchange}/${s.category}`]?.recommendedForApproval === true).length;
  log(`  ${shots.length} screenshots · ${recommended} recommended · ${shots.length - recommended} need review`);
  log('');
}

main().catch(e => {
  console.error('\n  ✖ Review generator error:', e.message);
  if (VERBOSE) console.error(e.stack);
  process.exit(1);
});
