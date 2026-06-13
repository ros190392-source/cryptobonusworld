/**
 * audit-responsive-site.mjs
 * Full-site Playwright responsive audit — detects horizontal overflow,
 * clipped text, broken images, and console errors across mobile/desktop.
 *
 * Usage:
 *   node scripts/audit-responsive-site.mjs                # full audit
 *   node scripts/audit-responsive-site.mjs --fast         # mobile+desktop only, key pages
 *   node scripts/audit-responsive-site.mjs --page /exchanges/binance/
 *
 * Requires:
 *   - npm run build (dist/ must exist)
 *   - playwright package installed
 *   - Chromium: npx playwright install chromium
 */

import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { extname } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const REPORTS = join(ROOT, 'reports', 'responsive-audit');

const args = process.argv.slice(2);
const FAST_MODE    = args.includes('--fast');
const SINGLE_PAGE  = args.find(a => a.startsWith('--page='))?.replace('--page=', '') || null;
const CONCURRENCY  = 4;   // parallel pages
const SERVER_PORT  = 4399; // avoid conflict with astro preview

// ── Viewport matrix ───────────────────────────────────────────────────────────
const VIEWPORTS_FULL = [
  { label: 'mobile-360',   width: 360,  height: 800  },
  { label: 'mobile-375',   width: 375,  height: 812  },
  { label: 'mobile-390',   width: 390,  height: 844  },
  { label: 'mobile-414',   width: 414,  height: 896  },
  { label: 'tablet-768',   width: 768,  height: 1024 },
  { label: 'desktop-1366', width: 1366, height: 768  },
  { label: 'desktop-1440', width: 1440, height: 900  },
];
const VIEWPORTS_FAST = [
  { label: 'mobile-375',   width: 375,  height: 812  },
  { label: 'desktop-1440', width: 1440, height: 900  },
];
const VIEWPORTS = FAST_MODE ? VIEWPORTS_FAST : VIEWPORTS_FULL;

// ── Page collection from dist/ ────────────────────────────────────────────────
function walkDist(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkDist(p, out);
    else if (e.name === 'index.html') out.push(p);
  }
  return out;
}

function routeOf(file) {
  let r = relative(DIST, file).replace(/\\/g, '/');
  r = r.replace(/index\.html$/, '');
  return '/' + r;
}

function getAllRoutes() {
  if (!existsSync(DIST)) throw new Error('dist/ not found — run npm run build first');
  return walkDist(DIST).map(routeOf).sort();
}

// Priority order for fast mode / issue ranking
const PRIORITY_PREFIXES = [
  '/exchanges/',
  '/',
  '/compare/',
  '/coins/',
  '/best-exchanges-for/',
  '/guides/',
  '/use-cases/',
  '/bonuses',
];
function pagePriority(route) {
  for (let i = 0; i < PRIORITY_PREFIXES.length; i++) {
    if (route.startsWith(PRIORITY_PREFIXES[i])) return i;
  }
  return PRIORITY_PREFIXES.length;
}

// ── Static file server ────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain',
  '.xml':  'application/xml',
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      if (urlPath.endsWith('/')) urlPath += 'index.html';
      const filePath = join(DIST, urlPath);
      // fallback to index.html for SPA-style routes
      const tryPaths = [
        filePath,
        join(DIST, urlPath + '.html'),
        join(DIST, urlPath + '/index.html'),
        join(DIST, '404.html'),
      ];
      let served = false;
      for (const fp of tryPaths) {
        if (existsSync(fp) && statSync(fp).isFile()) {
          const ext = extname(fp);
          const mime = MIME[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': mime });
          res.end(readFileSync(fp));
          served = true;
          break;
        }
      }
      if (!served) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found: ' + urlPath);
      }
    });
    server.listen(SERVER_PORT, '127.0.0.1', () => resolve(server));
  });
}

// ── Overflow detection (runs in-page) ─────────────────────────────────────────
// Must be a real function — Playwright wraps string in an async arrow fn (no `arguments`)
function OVERFLOW_FN(vpWidth) {
  const issues = [];
  const seen = new Set();

  function tagEl(el) {
    const t = el.tagName.toLowerCase();
    const id = el.id ? '#' + el.id : '';
    const cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    return t + id + cls;
  }

  function textSnippet(el) {
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 60);
    if (/api[_-]?key|secret|token|password|private/i.test(t)) return '[redacted]';
    return t;
  }

  function classifyOverflow(el) {
    const style = window.getComputedStyle(el);
    const tagName = el.tagName.toUpperCase();
    if (tagName === 'IMG') return 'image_overflow';
    if (tagName === 'TABLE') return 'table_overflow';
    const w = style.width;
    if (w && w.endsWith('px') && parseFloat(w) > vpWidth) return 'fixed_width';
    const mw = style.minWidth;
    if (mw && mw.endsWith('px') && parseFloat(mw) > 60) return 'min_width';
    if (el.scrollWidth > el.clientWidth + 2) return 'inner_overflow';
    if (tagName === 'A' || tagName === 'BUTTON') return 'long_text_no_wrap';
    return 'unknown';
  }

  const all = document.querySelectorAll('*');
  for (const el of all) {
    try {
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      if (rect.top < -200) continue;

      const rightEdge = Math.round(rect.right);
      if (rightEdge > vpWidth + 2) {
        const key = tagEl(el) + '|' + rightEdge;
        if (seen.has(key)) continue;
        seen.add(key);

        issues.push({
          tagName: el.tagName.toLowerCase(),
          selector: tagEl(el),
          id: el.id || '',
          className: typeof el.className === 'string' ? el.className.trim().substring(0, 80) : '',
          text: textSnippet(el),
          rect: {
            top: Math.round(rect.top), right: rightEdge,
            bottom: Math.round(rect.bottom), left: Math.round(rect.left),
            width: Math.round(rect.width),
          },
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          overflow: rightEdge - vpWidth,
          cause: classifyOverflow(el),
        });
      }
    } catch (e) { /* skip unreadable elements */ }
  }

  const bodyScrollWidth = document.body ? document.body.scrollWidth : 0;
  const docScrollWidth = document.documentElement.scrollWidth;
  const pageOverflow = Math.max(bodyScrollWidth, docScrollWidth) - vpWidth;

  const imgs = document.querySelectorAll('img');
  const brokenImgs = [];
  for (const img of imgs) {
    if (img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith('data:')) {
      brokenImgs.push({ src: img.src.replace(window.location.origin, ''), alt: img.alt || '', width: img.width });
    }
  }

  return { issues, pageOverflow, brokenImgs };
}

// ── Single-page audit ─────────────────────────────────────────────────────────
async function auditPage(page, route, viewport, screenshotDir) {
  const url = `http://127.0.0.1:${SERVER_PORT}${route}`;
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('404')) {
        consoleErrors.push(text.substring(0, 200));
      }
    }
  });

  page.on('requestfailed', req => {
    const url = req.url();
    if (!url.includes('favicon')) {
      networkErrors.push({ url: url.replace(`http://127.0.0.1:${SERVER_PORT}`, ''), reason: req.failure()?.errorText || 'unknown' });
    }
  });

  try {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' });
    // small delay for CSS/fonts
    await page.waitForTimeout(300);

    const result = await page.evaluate(OVERFLOW_FN, viewport.width);

    let screenshotPath = null;
    const hasIssues = result.issues.length > 0 || result.brokenImgs.length > 0 || consoleErrors.length > 0;
    if (hasIssues) {
      const slug = route.replace(/\//g, '_').replace(/^_/, '') || 'home';
      const fname = `${slug}__${viewport.label}__overflow.png`;
      screenshotPath = join(screenshotDir, fname);
      try {
        await page.screenshot({ path: screenshotPath, fullPage: false, type: 'png' });
      } catch(e) {}
    }

    return {
      route,
      viewport: viewport.label,
      pageOverflow: result.pageOverflow,
      elementIssues: result.issues,
      brokenImgs: result.brokenImgs,
      consoleErrors,
      networkErrors: networkErrors.filter(n => !n.url.includes('.png') && !n.url.includes('.webp')).slice(0, 5),
      screenshotPath: screenshotPath ? screenshotPath.replace(ROOT + '/', '') : null,
      hasIssues,
    };
  } catch (e) {
    process.stderr.write(`  ERR [${viewport.label}] ${route}: ${e.message.substring(0, 150)}\n`);
    return {
      route, viewport: viewport.label, error: e.message.substring(0, 200),
      pageOverflow: 0, elementIssues: [], brokenImgs: [], consoleErrors: [], networkErrors: [], hasIssues: false,
    };
  }
}

// ── Batch runner ──────────────────────────────────────────────────────────────
async function runBatch(browser, tasks, screenshotDir) {
  const results = [];
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    const pages = await Promise.all(batch.map(() => browser.newPage()));
    try {
      const batchResults = await Promise.all(
        batch.map((task, idx) => auditPage(pages[idx], task.route, task.viewport, screenshotDir))
      );
      results.push(...batchResults);
    } finally {
      await Promise.all(pages.map(p => p.close().catch(() => {})));
    }
    // progress
    const done = Math.min(i + CONCURRENCY, tasks.length);
    process.stdout.write(`\r  Checked ${done}/${tasks.length} (${Math.round(done/tasks.length*100)}%)  `);
  }
  console.log('');
  return results;
}

// ── Cause suggestion for fix ──────────────────────────────────────────────────
function suggestFix(cause, el) {
  switch(cause) {
    case 'image_overflow':    return 'Add max-width:100% to img elements';
    case 'table_overflow':    return 'Wrap table in overflow-x:auto container';
    case 'fixed_width':       return 'Replace fixed px width with max-width or %';
    case 'min_width':         return 'Remove or reduce min-width; use min-width:0 in flex/grid';
    case 'long_text_no_wrap': return 'Add overflow-wrap:anywhere or word-break:break-word';
    case 'inner_overflow':    return 'Add min-width:0 to flex/grid child; check inner content width';
    case 'grid_overflow':     return 'Use minmax(0,1fr) in grid-template-columns';
    default:                  return 'Add max-width:100%; overflow-wrap:anywhere';
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  CryptoBonusWorld — Responsive Site Audit');
  console.log('  Playwright / Chromium');
  console.log('══════════════════════════════════════════════════════\n');

  mkdirSync(REPORTS, { recursive: true });
  const screenshotDir = join(REPORTS, 'screenshots');
  mkdirSync(screenshotDir, { recursive: true });

  // Collect routes
  let routes = getAllRoutes();
  if (SINGLE_PAGE) {
    routes = routes.filter(r => r === SINGLE_PAGE || r.includes(SINGLE_PAGE));
    if (!routes.length) routes = [SINGLE_PAGE];
  } else if (FAST_MODE) {
    routes = routes.sort((a,b) => pagePriority(a) - pagePriority(b)).slice(0, 50);
  }

  console.log(`  Pages     : ${routes.length}`);
  console.log(`  Viewports : ${VIEWPORTS.map(v=>v.label).join(', ')}`);
  console.log(`  Total checks : ${routes.length * VIEWPORTS.length}`);
  console.log(`  Mode: ${FAST_MODE?'FAST':'FULL'}\n`);

  // Build task list
  const tasks = [];
  for (const route of routes) {
    for (const viewport of VIEWPORTS) {
      tasks.push({ route, viewport });
    }
  }

  // Start server
  console.log(`  Starting static server on port ${SERVER_PORT}...`);
  const server = await startServer();
  console.log('  Server ready.\n');

  // Launch browser
  const browser = await chromium.launch({ headless: true });

  let results = [];
  try {
    console.log('  Running checks...');
    results = await runBatch(browser, tasks, screenshotDir);
  } finally {
    await browser.close();
    server.close();
  }

  // ── Analyze results ──────────────────────────────────────────────────────
  const issues = results.filter(r => r.hasIssues);
  const allOverflowElements = results.flatMap(r => r.elementIssues.map(e => ({...e, route:r.route, viewport:r.viewport})));
  const allBrokenImgs = results.flatMap(r => r.brokenImgs.map(i => ({...i, route:r.route, viewport:r.viewport})));
  const allConsoleErrors = results.flatMap(r => r.consoleErrors.map(e => ({error:e, route:r.route, viewport:r.viewport})));
  const pageErrors = results.filter(r => r.error);

  // Deduplicate broken images
  const uniqueBrokenImgs = [...new Map(allBrokenImgs.map(i=>[i.src, i])).values()];

  // Cause frequency
  const causeCounts = {};
  for (const el of allOverflowElements) {
    causeCounts[el.cause] = (causeCounts[el.cause] || 0) + 1;
  }

  // Pages with overflow grouped
  const pageOverflowMap = {};
  for (const r of results) {
    if (r.pageOverflow > 2 || r.elementIssues.length > 0) {
      const key = r.route;
      if (!pageOverflowMap[key]) pageOverflowMap[key] = { route:r.route, viewports:[], maxOverflow:0 };
      pageOverflowMap[key].viewports.push(r.viewport);
      pageOverflowMap[key].maxOverflow = Math.max(pageOverflowMap[key].maxOverflow, r.pageOverflow);
    }
  }
  const pagesWithOverflow = Object.values(pageOverflowMap).sort((a,b)=>b.maxOverflow-a.maxOverflow);

  // Unique elements causing overflow (by selector)
  const uniqueElements = [...new Map(allOverflowElements.map(e=>[e.selector+'|'+e.cause, e])).values()];

  // ── Summary print ────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  Pages scanned        : ${routes.length}`);
  console.log(`  Viewports            : ${VIEWPORTS.length}`);
  console.log(`  Total checks         : ${tasks.length}`);
  console.log(`  Pages with issues    : ${issues.length}`);
  console.log(`  Pages with overflow  : ${pagesWithOverflow.length}`);
  console.log(`  Overflow elements    : ${allOverflowElements.length} (${uniqueElements.length} unique)`);
  console.log(`  Broken images        : ${uniqueBrokenImgs.length}`);
  console.log(`  Console errors       : ${allConsoleErrors.length}`);
  console.log(`  Page load errors     : ${pageErrors.length}`);

  if (Object.keys(causeCounts).length) {
    console.log('\n  Cause breakdown:');
    Object.entries(causeCounts).sort((a,b)=>b[1]-a[1]).forEach(([c,n])=>console.log(`    ${n.toString().padStart(4)}  ${c}`));
  }

  if (pagesWithOverflow.length > 0) {
    console.log('\n  Top overflow pages:');
    pagesWithOverflow.slice(0,10).forEach(p=>console.log(`    +${p.maxOverflow}px  ${p.route}  [${p.viewports.join(', ')}]`));
  }
  console.log('══════════════════════════════════════════════════════\n');

  // ── JSON report ──────────────────────────────────────────────────────────
  const jsonReport = {
    generatedAt: new Date().toISOString(),
    mode: FAST_MODE ? 'fast' : 'full',
    pagesScanned: routes.length,
    viewports: VIEWPORTS.length,
    totalChecks: tasks.length,
    pagesWithIssues: issues.length,
    pagesWithOverflow: pagesWithOverflow.length,
    overflowElementCount: allOverflowElements.length,
    uniqueOverflowElements: uniqueElements.length,
    brokenImagesCount: uniqueBrokenImgs.length,
    consoleErrorCount: allConsoleErrors.length,
    causeCounts,
    pagesWithOverflowList: pagesWithOverflow,
    uniqueElements: uniqueElements.slice(0, 50).map(e => ({
      ...e,
      suggestedFix: suggestFix(e.cause, e),
    })),
    brokenImages: uniqueBrokenImgs,
    consoleErrors: allConsoleErrors.slice(0, 20),
    rawResults: results.filter(r=>r.hasIssues).map(r => ({
      route: r.route, viewport: r.viewport, pageOverflow: r.pageOverflow,
      elementCount: r.elementIssues.length, brokenImgCount: r.brokenImgs.length,
      consoleErrorCount: r.consoleErrors.length, screenshotPath: r.screenshotPath,
    })),
  };

  const jsonPath = join(ROOT, 'reports', 'full-site-responsive-audit.json');
  writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');

  // ── Markdown report ───────────────────────────────────────────────────────
  const lines = [
    '# Full-Site Responsive Audit',
    `**Generated:** ${new Date().toISOString()}  **Mode:** ${FAST_MODE?'FAST':'FULL'}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Pages scanned | ${routes.length} |`,
    `| Viewports | ${VIEWPORTS.length} (${VIEWPORTS.map(v=>v.label).join(', ')}) |`,
    `| Total checks | ${tasks.length} |`,
    `| Pages with issues | ${issues.length} |`,
    `| Pages with overflow | ${pagesWithOverflow.length} |`,
    `| Overflow elements (unique) | ${uniqueElements.length} |`,
    `| Broken images | ${uniqueBrokenImgs.length} |`,
    `| Console errors | ${allConsoleErrors.length} |`,
    '',
    '## Cause Breakdown',
    '',
    '| Cause | Count |',
    '|-------|-------|',
    ...Object.entries(causeCounts).sort((a,b)=>b[1]-a[1]).map(([c,n]) => `| ${c} | ${n} |`),
    '',
    '## Pages with Overflow',
    '',
    '| Route | Max Overflow (px) | Viewports |',
    '|-------|------------------|-----------|',
    ...pagesWithOverflow.map(p => `| \`${p.route}\` | +${p.maxOverflow}px | ${p.viewports.join(', ')} |`),
    '',
    '## Unique Overflow Elements',
    '',
    '| Selector | Cause | Overflow | Suggested Fix |',
    '|----------|-------|----------|---------------|',
    ...uniqueElements.slice(0, 30).map(e =>
      `| \`${e.selector.substring(0,40)}\` | ${e.cause} | +${e.overflow}px | ${suggestFix(e.cause, e)} |`
    ),
    '',
  ];

  if (uniqueBrokenImgs.length > 0) {
    lines.push('## Broken Images', '', '| Path | First seen on |', '|------|--------------|',
      ...uniqueBrokenImgs.map(i => `| \`${i.src}\` | \`${i.route}\` |`), '');
  }

  const mdPath = join(ROOT, 'reports', 'full-site-responsive-audit.md');
  writeFileSync(mdPath, lines.join('\n'), 'utf8');

  console.log(`  Reports written:`);
  console.log(`    reports/full-site-responsive-audit.json`);
  console.log(`    reports/full-site-responsive-audit.md`);
  if (existsSync(screenshotDir)) {
    const shots = readdirSync(screenshotDir).filter(f=>f.endsWith('.png'));
    if (shots.length) console.log(`    reports/responsive-audit/screenshots/ (${shots.length} screenshots)`);
  }

  return jsonReport;
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
