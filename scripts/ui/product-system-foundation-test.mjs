#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-product-system-'));
const OUT = join(TMP, 'site-standard.mjs');

const css = readFileSync(join(ROOT, 'src/styles/site-standard-v1.css'), 'utf8');
const firstViewport = readFileSync(join(ROOT, 'src/components/site-standard/FirstViewport.astro'), 'utf8');
const standardTs = join(ROOT, 'src/data/siteStandard/siteStandardV1.ts');

let checks = 0;
const failures = [];
function check(name, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${name}: ${detail}` : name);
}

function cssToken(name) {
  const match = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return match?.[1]?.trim() ?? null;
}

try {
  await build({
    stdin: {
      contents: `export * from ${JSON.stringify(standardTs)};`,
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'product-system-test-entry.ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: OUT,
    logLevel: 'silent',
  });
  const m = await import(`${pathToFileURL(OUT).href}?v=${Date.now()}`);

  check('width: shell 1180', cssToken('--cbw-width-shell') === '1180px');
  check('width: wide 1180', cssToken('--cbw-width-wide') === '1180px');
  check('width: standard 960', cssToken('--cbw-width-standard') === '960px');
  check('width: prose 760', cssToken('--cbw-width-prose') === '760px');
  check('width: narrow 560', cssToken('--cbw-width-narrow') === '560px');
  check('width: TS/CSS shell aligned', m.CONTAINER_WIDTHS.shell === 1180 && m.CONTAINER_WIDTHS.shell === m.CONTAINER_WIDTHS.wide);
  check('width: TS/CSS standard aligned', m.CONTAINER_WIDTHS.standard === 960 && m.CONTAINER_WIDTHS.prose === 760 && m.CONTAINER_WIDTHS.narrow === 560);

  check('gutter: mobile 20', cssToken('--cbw-gutter') === '20px');
  check('header: canonical mobile height 56', cssToken('--cbw-header-height') === '56px');
  check('foundation: validation remains clean', Array.isArray(m.SITE_STANDARD_V1_ISSUES) && m.SITE_STANDARD_V1_ISSUES.length === 0);

  const firstViewportBlock = css.match(/\.cbw-first-viewport\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  check('hero: no max-height clipping', !/max-height\s*:/.test(firstViewportBlock));
  check('hero: content-driven minimum target', /min-height\s*:\s*var\(--cbw-first-viewport-target/.test(firstViewportBlock));
  check('hero: direct family class', firstViewport.includes('`cbw-first-viewport--${family}`'));
  for (const family of ['homepage','exchange','directory','guide','trust','legal','utility']) {
    check(`hero: ${family} family token`, css.includes(`.cbw-first-viewport--${family}`));
  }

  check('primitive: shared section header', css.includes('.cbw-section-header') && css.includes('.cbw-section-title') && css.includes('.cbw-section-lede'));
  check('primitive: shared card grid', css.includes('.cbw-card-grid'));
  check('primitive: shared FAQ', css.includes('.cbw-faq-list') && css.includes('.cbw-faq-item') && css.includes('.cbw-faq-summary'));
  for (const tone of ['verified','limited','review','blocked','neutral']) {
    check(`primitive: status ${tone}`, css.includes(`.cbw-status-badge--${tone}`));
  }

  const hardWidthTokens = [...css.matchAll(/--cbw-width-[a-z-]+\s*:\s*(\d+)px/g)].map(match => Number(match[1]));
  const allowed = new Set([1180,960,760,560]);
  check('foundation: no unregistered width token', hardWidthTokens.every(width => allowed.has(width)), JSON.stringify(hardWidthTokens));

  if (failures.length) {
    console.error(`CBW PRODUCT SYSTEM FOUNDATION: FAIL (${failures.length}/${checks})`);
    failures.forEach(failure => console.error(` - ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(`CBW PRODUCT SYSTEM FOUNDATION: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW PRODUCT SYSTEM FOUNDATION: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
