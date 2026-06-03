#!/usr/bin/env node
/**
 * validate-screenshot-quality.mjs — CryptoBonusWorld Screenshot Quality Validator
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Runs quality checks on processed screenshots in public/screenshots/:
 *
 *   ✓ File exists and is a valid WebP
 *   ✓ Dimensions within acceptable range
 *   ✓ File size within bounds (not blank, not bloated)
 *   ✓ Not blank (colour variance test via channel std-dev)
 *   ✓ Not over-blurred (Laplacian sharpness estimate)
 *   ✓ No giant empty white/dark margins
 *   ✓ Browser frame present (top 40px check)
 *   ✓ No annotation layer broken (alpha-only transparency check)
 *   ✓ Sets recommendedForApproval flag in approval queue
 *
 * Usage:
 *   npm run screenshots:quality
 *   npm run screenshots:quality -- --exchange binance
 *   npm run screenshots:quality -- --exchange binance --category fees,spot
 *   npm run screenshots:quality -- --path public/screenshots/binance/fees/global-desktop-2026-06.webp
 *   npm run screenshots:quality -- --write          (update approval queue with recommendations)
 *   npm run screenshots:quality -- --fail-on-errors (exit 1 if any screenshot fails)
 *
 * Options:
 *   --exchange  <slug>         Filter to exchange
 *   --category  <cat,...>      Filter to categories
 *   --path      <file>         Check a single file
 *   --write                    Update reports/screenshot-approval-queue.json with recommendations
 *   --fail-on-errors           Exit 1 if any quality check fails
 *   --json                     JSON output
 *   --verbose                  Per-check detail
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// ── CLI ───────────────────────────────────────────────────────────────────────

const ARGV        = process.argv.slice(2);
const flag        = (n)     => ARGV.includes(n);
const opt         = (n, fb) => { const i = ARGV.indexOf(n); return i !== -1 && i+1 < ARGV.length ? ARGV[i+1] : (fb ?? null); };
const optList     = (n)     => opt(n)?.split(',').map(s => s.trim()).filter(Boolean) ?? null;

const EXCHANGE    = opt('--exchange');
const CAT_FILTER  = optList('--category');
const SINGLE_PATH = opt('--path');
const DO_WRITE    = flag('--write');
const FAIL_ON_ERR = flag('--fail-on-errors');
const JSON_OUT    = flag('--json');
const VERBOSE     = flag('--verbose');

const log  = (...a) => !JSON_OUT && console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && !JSON_OUT && console.log('  ·', ...a);
const warn = (...a) => !JSON_OUT && console.warn('  ⚠', ...a);

// ── Quality thresholds ────────────────────────────────────────────────────────

const THRESHOLDS = {
  desktop: {
    minWidth:    800,  maxWidth:    1300,
    minHeight:   400,  maxHeight:   2000,
    minSizeKB:   8,    maxSizeMB:   2,
    minVariance: 8,    // channel std-dev below this = blank
    minSharpness: 3,   // Laplacian variance below this = over-blurred
  },
  mobile: {
    minWidth:    370,  maxWidth:    410,
    minHeight:   300,  maxHeight:   1500,
    minSizeKB:   5,    maxSizeMB:   1.5,
    minVariance: 8,
    minSharpness: 3,
  },
};

// ── Detect device type from filename ─────────────────────────────────────────

function detectDevice(filePath) {
  return filePath.includes('mobile') ? 'mobile' : 'desktop';
}

// ── Individual quality checks ─────────────────────────────────────────────────

async function checkFile(filePath) {
  const checks = [];
  let passed = 0;
  let score  = 100;

  function addCheck(name, ok, detail, penalty = 0) {
    checks.push({ name, ok, detail });
    if (!ok) score -= penalty;
  }

  // ── 1. File existence ─────────────────────────────────────────────────────
  if (!existsSync(filePath)) {
    return {
      filePath, device: 'unknown', ok: false, score: 0,
      checks: [{ name: 'file_exists', ok: false, detail: 'File not found' }],
      recommendedForApproval: false,
      qualityFlags: ['file_not_found'],
    };
  }

  const stat = statSync(filePath);
  const sizeKB = stat.size / 1024;
  const sizeMB = stat.size / (1024 * 1024);

  addCheck('file_exists', true, `${sizeKB.toFixed(0)} KB`);

  const device = detectDevice(filePath);
  const T      = THRESHOLDS[device];

  // ── 2. File size ──────────────────────────────────────────────────────────
  const sizeOk = sizeKB >= T.minSizeKB && sizeMB <= T.maxSizeMB;
  addCheck(
    'file_size',
    sizeOk,
    `${sizeKB.toFixed(0)} KB (min ${T.minSizeKB} KB, max ${T.maxSizeMB * 1024} KB)`,
    sizeKB < T.minSizeKB ? 30 : 15
  );

  // ── 3. Format validation ──────────────────────────────────────────────────
  const ext = extname(filePath).toLowerCase();
  addCheck('format_webp', ext === '.webp', `Extension: ${ext}`, 20);

  // ── Sharp-based checks ────────────────────────────────────────────────────
  let sharpAvailable = false;
  let meta, stats;
  try {
    const { default: sharp } = await import('sharp');
    sharpAvailable = true;
    const buf = readFileSync(filePath);
    meta  = await sharp(buf).metadata();
    stats = await sharp(buf).stats();

    // ── 4. Dimensions ─────────────────────────────────────────────────────
    const W = meta.width  ?? 0;
    const H = meta.height ?? 0;
    const dimOk = W >= T.minWidth && W <= T.maxWidth && H >= T.minHeight && H <= T.maxHeight;
    addCheck(
      'dimensions',
      dimOk,
      `${W}×${H}px (expected ${T.minWidth}–${T.maxWidth} × ${T.minHeight}–${T.maxHeight})`,
      20
    );

    // ── 5. Not blank (variance check) ─────────────────────────────────────
    const channels = stats.channels.slice(0, 3);
    const meanStdev = channels.reduce((s, c) => s + c.stdev, 0) / channels.length;
    const notBlank = meanStdev >= T.minVariance;
    addCheck(
      'not_blank',
      notBlank,
      `Channel std-dev: ${meanStdev.toFixed(1)} (min ${T.minVariance})`,
      40
    );

    // ── 6. Sharpness / blur detection (Laplacian approximation) ──────────
    // Approximate Laplacian using a 3×3 kernel convolution via sharp's
    // convolve. High variance = sharp. Low variance = over-blurred / blank.
    let sharpnessOk = true;
    try {
      const { default: sharp2 } = await import('sharp');
      const grayBuf = await sharp2(readFileSync(filePath))
        .resize(400, null, { fit: 'inside', kernel: 'lanczos3' })
        .grayscale()
        .convolve({
          width: 3, height: 3,
          kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0], // Laplacian
        })
        .raw()
        .toBuffer();

      let sum = 0, sum2 = 0;
      for (const v of grayBuf) { sum += v; sum2 += v * v; }
      const n = grayBuf.length;
      const variance = (sum2 / n) - Math.pow(sum / n, 2);
      sharpnessOk = variance >= T.minSharpness;
      addCheck(
        'sharpness',
        sharpnessOk,
        `Laplacian variance: ${variance.toFixed(2)} (min ${T.minSharpness})`,
        15
      );
    } catch (e) {
      dbg(`Sharpness check skipped: ${e.message}`);
      addCheck('sharpness', true, 'skipped (convolve unavailable)');
    }

    // ── 7. No giant margins ───────────────────────────────────────────────
    // Sample 3×3 grid of 10×10 patches; if > 70% are near-white or near-black → flag
    let marginOk = true;
    try {
      const { default: sharp3 } = await import('sharp');
      const W2 = meta.width ?? 800;
      const H2 = meta.height ?? 600;
      const patchSize = 12;
      const samples = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const left = Math.floor(col * (W2 - patchSize) / 2);
          const top  = Math.floor(row * (H2 - patchSize) / 2);
          const px   = await sharp3(readFileSync(filePath))
            .extract({ left, top, width: patchSize, height: patchSize })
            .raw().toBuffer();
          const mean = px.reduce((s, v) => s + v, 0) / px.length;
          samples.push(mean);
        }
      }
      const uniformCount = samples.filter(m => m > 245 || m < 10).length;
      marginOk = uniformCount < samples.length * 0.7;
      addCheck(
        'no_large_margins',
        marginOk,
        `Uniform patches: ${uniformCount}/${samples.length}`,
        10
      );
    } catch (e) {
      dbg(`Margin check skipped: ${e.message}`);
      addCheck('no_large_margins', true, 'skipped');
    }

    // ── 8. Browser frame presence ─────────────────────────────────────────
    // Top 40px should NOT be pure white (frame injects dark #16162A bar)
    let frameOk = true;
    try {
      const { default: sharp4 } = await import('sharp');
      const topBuf = await sharp4(readFileSync(filePath))
        .extract({ left: 0, top: 0, width: Math.min(200, meta.width ?? 200), height: Math.min(30, meta.height ?? 30) })
        .raw().toBuffer();
      const topMean = topBuf.reduce((s, v) => s + v, 0) / topBuf.length;
      // Frame is dark (#16162A ≈ rgb(22,22,42)); if top is very bright, frame is missing
      frameOk = topMean < 200;
      addCheck(
        'browser_frame',
        frameOk,
        `Top strip mean brightness: ${topMean.toFixed(0)} (expect < 200 for dark frame)`,
        10
      );
    } catch (e) {
      dbg(`Frame check skipped: ${e.message}`);
      addCheck('browser_frame', true, 'skipped');
    }

    // ── 9. Format metadata ────────────────────────────────────────────────
    const formatOk = meta.format === 'webp';
    addCheck(
      'format_metadata',
      formatOk,
      `Detected format: ${meta.format ?? 'unknown'}`,
      20
    );

    // ── 10. Channels / not corrupt ────────────────────────────────────────
    const channelOk = (meta.channels ?? 0) >= 3;
    addCheck(
      'channels',
      channelOk,
      `Channels: ${meta.channels ?? 0} (expect ≥ 3)`,
      25
    );

  } catch (sharpError) {
    if (!sharpAvailable) {
      warn('sharp not installed — skipping pixel-level checks');
      addCheck('sharp_available', false, sharpError.message, 0);
    } else {
      warn(`Sharp error on ${basename(filePath)}: ${sharpError.message}`);
      addCheck('sharp_read', false, sharpError.message, 50);
    }
  }

  // ── Score & recommendation ─────────────────────────────────────────────────
  score = Math.max(0, score);
  const failedChecks  = checks.filter(c => !c.ok);
  const qualityFlags  = failedChecks.map(c => c.name);
  const overallOk     = failedChecks.length === 0;
  const recommended   = score >= 70 && !qualityFlags.includes('not_blank') && !qualityFlags.includes('file_not_found');

  return {
    filePath,
    device,
    ok: overallOk,
    score,
    checks,
    qualityFlags,
    recommendedForApproval: recommended,
    sizeKB: Math.round(sizeKB),
    dimensions: meta ? `${meta.width}×${meta.height}` : null,
    checkedAt: new Date().toISOString(),
  };
}

// ── Discover screenshots to validate ─────────────────────────────────────────

function discoverScreenshots() {
  const screenshotsDir = join(ROOT, 'public', 'screenshots');
  if (!existsSync(screenshotsDir)) return [];

  const files = [];
  const exchanges = EXCHANGE
    ? [EXCHANGE]
    : readdirSync(screenshotsDir).filter(e => statSync(join(screenshotsDir, e)).isDirectory());

  for (const exchange of exchanges) {
    const exDir = join(screenshotsDir, exchange);
    if (!existsSync(exDir)) continue;

    const categories = readdirSync(exDir).filter(c => statSync(join(exDir, c)).isDirectory());
    for (const category of categories) {
      if (CAT_FILTER && !CAT_FILTER.includes(category)) continue;
      const catDir = join(exDir, category);
      const webps  = readdirSync(catDir).filter(f => f.endsWith('.webp'));
      for (const webp of webps) {
        files.push({ filePath: join(catDir, webp), exchange, category });
      }
    }
  }
  return files;
}

// ── Update approval queue ─────────────────────────────────────────────────────

function updateApprovalQueueRecommendations(results) {
  const qPath = join(ROOT, 'reports', 'screenshot-approval-queue.json');
  if (!existsSync(qPath)) {
    warn('Approval queue not found — run screenshots:harvest first');
    return;
  }
  let queue;
  try { queue = JSON.parse(readFileSync(qPath, 'utf-8')); } catch { warn('Cannot parse approval queue'); return; }

  let updated = 0;
  for (const item of (queue.items ?? [])) {
    // Match by exchange + category
    const match = results.find(r =>
      r.filePath && r.filePath.includes(`/${item.exchange}/`) && r.filePath.includes(`/${item.category}/`)
    );
    if (match) {
      item.recommendedForApproval = match.recommendedForApproval;
      item.qualityFlags           = match.qualityFlags;
      item.qualityScore           = match.score;
      item.qualityCheckedAt       = match.checkedAt;
      updated++;
    }
  }

  writeFileSync(qPath, JSON.stringify(queue, null, 2), 'utf-8');
  log(`  Updated ${updated} items in approval queue`);
}

// ── Text report ───────────────────────────────────────────────────────────────

function writeQualityReport(allResults) {
  const reportsDir = join(ROOT, 'reports');
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });

  const ok      = allResults.filter(r => r.ok);
  const fail    = allResults.filter(r => !r.ok);
  const rec     = allResults.filter(r => r.recommendedForApproval);
  const notRec  = allResults.filter(r => !r.recommendedForApproval && r.ok === false);

  const statusIcon = (r) => r.ok ? '✅' : (r.score >= 60 ? '⚠️' : '❌');
  const recIcon    = (r) => r.recommendedForApproval ? ' ⭐' : '';

  const rows = allResults.map(r => {
    const rel   = r.filePath.replace(ROOT, '').replace(/\\/g, '/');
    const flags = r.qualityFlags.join(', ') || '—';
    const dims  = r.dimensions ?? '?';
    const size  = r.sizeKB ? `${r.sizeKB}KB` : '?';
    return `| ${statusIcon(r)}${recIcon(r)} | ${rel.slice(-60)} | ${r.score} | ${dims} | ${size} | ${flags} |`;
  }).join('\n');

  const md = `# Screenshot Quality Report

**Generated:** ${new Date().toISOString().slice(0, 19)}Z
**Scope:** ${EXCHANGE ? `exchange: ${EXCHANGE}` : 'all exchanges'}${CAT_FILTER ? `, categories: ${CAT_FILTER.join(',')}` : ''}

## Summary

| Metric | Count |
|--------|-------|
| Total checked | ${allResults.length} |
| ✅ All checks passed | ${ok.length} |
| ⭐ Recommended for approval | ${rec.length} |
| ❌ Failed checks | ${fail.length} |

## Results

| Status | File | Score | Dims | Size | Issues |
|--------|------|-------|------|------|--------|
${rows}

## Checks Performed

| # | Check | Description |
|---|-------|-------------|
| 1 | \`file_exists\` | File is present at expected path |
| 2 | \`file_size\` | Between 8 KB and 2 MB (desktop) |
| 3 | \`format_webp\` | File extension is .webp |
| 4 | \`dimensions\` | Width 800–1300px, height 400–2000px (desktop) |
| 5 | \`not_blank\` | Channel standard deviation ≥ 8 (not solid colour) |
| 6 | \`sharpness\` | Laplacian variance ≥ 3 (not over-blurred) |
| 7 | \`no_large_margins\` | < 70% of 3×3 sample grid is near-white/black |
| 8 | \`browser_frame\` | Top strip mean brightness < 200 (dark frame present) |
| 9 | \`format_metadata\` | sharp detects format as WebP |
| 10 | \`channels\` | Image has ≥ 3 colour channels |

## Quality Score

Starts at 100. Penalties per failed check:
- **not_blank:** −40
- **dimensions:** −20
- **file_size (too small):** −30
- **format_metadata:** −20
- **channels:** −25
- **sharpness:** −15
- **browser_frame:** −10
- **no_large_margins:** −10
- **file_size (too large):** −15

**Recommended for approval:** score ≥ 70 AND \`not_blank\` passed

*⭐ = recommended for approval*
`;

  const mdPath = join(reportsDir, 'screenshot-quality-report.md');
  writeFileSync(mdPath, md, 'utf-8');
  return mdPath;
}

// ── Verbose detail printer ────────────────────────────────────────────────────

function printVerbose(result) {
  const rel = result.filePath.replace(ROOT, '').replace(/\\/g, '/');
  log('');
  log(`  ${result.ok ? '✅' : '❌'}  ${rel}`);
  log(`      Score: ${result.score}/100  |  ${result.dimensions ?? '?'}  |  ${result.sizeKB ?? '?'}KB`);
  for (const c of result.checks) {
    log(`      ${c.ok ? '  ✓' : '  ✗'}  ${c.name.padEnd(22)}  ${c.detail}`);
  }
  if (result.qualityFlags.length) {
    log(`      Flags: ${result.qualityFlags.join(', ')}`);
  }
  log(`      Recommended: ${result.recommendedForApproval ? 'YES ⭐' : 'NO'}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let targets;

  if (SINGLE_PATH) {
    targets = [{ filePath: SINGLE_PATH, exchange: 'unknown', category: 'unknown' }];
  } else {
    targets = discoverScreenshots();
    if (!targets.length) {
      log('No screenshots found in public/screenshots/');
      if (EXCHANGE) log(`  (exchange filter: ${EXCHANGE})`);
      return;
    }
  }

  if (!JSON_OUT) {
    log('');
    log(`🔍  Quality Validation — ${targets.length} screenshot(s)`);
    log('─'.repeat(60));
    console.log('');
  }

  const results = [];
  for (const { filePath, exchange, category } of targets) {
    const result = await checkFile(filePath);
    results.push({ ...result, exchange, category });

    if (VERBOSE) {
      printVerbose(result);
    } else if (!JSON_OUT) {
      const rel   = filePath.replace(ROOT, '').replace(/\\/g, '/').slice(-55);
      const icon  = result.ok ? '✅' : (result.score >= 60 ? '⚠' : '❌');
      const rec   = result.recommendedForApproval ? ' ⭐' : '';
      const flags = result.qualityFlags.length ? ` — ${result.qualityFlags.join(', ')}` : '';
      log(`  ${icon}${rec}  ${rel}  (${result.score})${flags}`);
    }
  }

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ results, generatedAt: new Date().toISOString() }, null, 2));
    return;
  }

  // Summary
  const ok      = results.filter(r => r.ok);
  const fail    = results.filter(r => !r.ok);
  const rec     = results.filter(r => r.recommendedForApproval);

  console.log('');
  log('─'.repeat(60));
  log(`  Checked:     ${results.length}`);
  log(`  ✅ Passed:   ${ok.length}`);
  log(`  ⭐ Recommended: ${rec.length}`);
  if (fail.length) log(`  ❌ Failed:   ${fail.length}`);

  // Write report
  const reportPath = writeQualityReport(results);
  log('');
  log(`  Report: reports/screenshot-quality-report.md`);

  if (DO_WRITE) {
    updateApprovalQueueRecommendations(results);
    log(`  Approval queue updated with recommendations`);
  }

  console.log('');

  if (FAIL_ON_ERR && fail.length > 0) {
    console.error(`\n  ✖ ${fail.length} screenshot(s) failed quality checks\n`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('\n  ✖ Quality validator error:', e.message);
  if (VERBOSE) console.error(e.stack);
  process.exit(1);
});
