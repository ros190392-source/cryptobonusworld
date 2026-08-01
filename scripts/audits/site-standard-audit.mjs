import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const TEXT_EXTENSIONS = new Set(['.astro', '.css', '.ts', '.tsx', '.js', '.mjs', '.cjs']);
const PAGE_EXTENSION = '.astro';

const WIDTH_VALUE_RE = /max-width\s*:\s*([^;}{]+)/gi;
const WIDTH_VAR_RE = /--([a-z0-9-]*?(?:max|width)[a-z0-9-]*)\s*:\s*([^;}{]+)/gi;
const HEIGHT_RE = /(?:min-height|height)\s*:\s*([^;}{]+)/gi;
const LAYOUT_IMPORT_RE = /from\s+['"]([^'"]*layouts\/[^'"]+\.astro)['"]/g;
const STYLE_TAG_RE = /<style(?:\s[^>]*)?>/g;
const CSS_IMPORT_RE = /import\s+['"]([^'"]+\.css)['"]/g;

const FAMILY_RULES = [
  ['design-review', route => route.startsWith('/__design/') || route.startsWith('/preview/')],
  ['homepage', route => route === '/'],
  ['exchange-review', route => /^\/(?:bybit|mexc|okx|bitget|kucoin|bingx|coinex)\/$/.test(route)],
  ['exchange-directory-detail', route => route.startsWith('/exchanges/') && route !== '/exchanges/'],
  ['exchange-directory', route => route === '/exchanges/'],
  ['promo-directory', route => route === '/promo-codes/' || route === '/bonus-codes/' || route === '/bonuses/'],
  ['guide-detail', route => route.startsWith('/guides/') && route !== '/guides/'],
  ['guide-directory', route => route === '/guides/'],
  ['methodology-trust', route => ['/methodology/', '/editorial-policy/', '/update-policy/', '/about/', '/reviewers/'].includes(route)],
  ['faq', route => route === '/faq/'],
  ['legal-contact', route => ['/affiliate-disclosure/', '/disclaimer/', '/privacy-policy/', '/terms/', '/contact/'].includes(route)],
  ['country-foundation', route => route === '/countries/' || route.startsWith('/countries/')],
  ['affiliate-redirect', route => route.startsWith('/go/')],
  ['utility-directory', route => ['/categories/', '/coins/', '/compare/', '/use-cases/'].includes(route)],
  ['system', route => ['/404.html', '/sitemap.xml'].includes(route)],
];

function normalizeSlashes(value) {
  return value.split(path.sep).join('/');
}

async function walk(root) {
  const files = [];
  async function visit(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        files.push(absolute);
      }
    }
  }
  await visit(root);
  return files.sort();
}

function deriveRoute(relativePagePath) {
  let route = normalizeSlashes(relativePagePath)
    .replace(/^src\/pages\//, '')
    .replace(/\.astro$/, '');

  if (route === 'index') return '/';
  if (route === '404') return '/404.html';
  if (route === 'sitemap.xml') return '/sitemap.xml';

  route = route
    .replace(/\/index$/, '')
    .replace(/^\[designRoot\]/, '__design')
    .replace(/\[\.\.\.([^\]]+)\]/g, ':$1*')
    .replace(/\[([^\]]+)\]/g, ':$1');

  return `/${route}/`.replace(/\/+/g, '/');
}

function classifyRoute(route) {
  for (const [family, predicate] of FAMILY_RULES) {
    if (predicate(route)) return family;
  }
  return 'unclassified';
}

function collectMatches(content, regex) {
  const values = [];
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    values.push(match.slice(1));
  }
  return values;
}

function normalizeCssValue(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function pxValue(value) {
  const match = normalizeCssValue(value).match(/^(-?\d+(?:\.\d+)?)px$/i);
  return match ? Number(match[1]) : null;
}

function unique(values) {
  return [...new Set(values)];
}

function countBy(items, selector) {
  const counts = new Map();
  for (const item of items) {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

function markdownTable(rows, headers) {
  const escape = value => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${headers.map(header => escape(row[header])).join(' | ')} |`),
  ].join('\n');
}

export async function runSiteStandardAudit(options = {}) {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const sourceRoots = [
    path.join(repoRoot, 'src', 'pages'),
    path.join(repoRoot, 'src', 'layouts'),
    path.join(repoRoot, 'src', 'components'),
    path.join(repoRoot, 'src', 'styles'),
  ];

  const allFiles = (await Promise.all(sourceRoots.map(walk))).flat();
  const textFiles = allFiles.filter(file => TEXT_EXTENSIONS.has(path.extname(file)));
  const records = [];

  for (const absolutePath of textFiles) {
    const content = await fs.readFile(absolutePath, 'utf8');
    const relativePath = normalizeSlashes(path.relative(repoRoot, absolutePath));
    const maxWidths = collectMatches(content, WIDTH_VALUE_RE).map(([value]) => normalizeCssValue(value));
    const widthVars = collectMatches(content, WIDTH_VAR_RE).map(([name, value]) => ({ name, value: normalizeCssValue(value) }));
    const heights = collectMatches(content, HEIGHT_RE).map(([value]) => normalizeCssValue(value));
    const layouts = collectMatches(content, LAYOUT_IMPORT_RE).map(([value]) => value);
    const cssImports = collectMatches(content, CSS_IMPORT_RE).map(([value]) => value);
    const localStyleBlocks = (content.match(STYLE_TAG_RE) ?? []).length;

    records.push({
      path: relativePath,
      kind: relativePath.startsWith('src/pages/') ? 'page' : relativePath.startsWith('src/layouts/') ? 'layout' : relativePath.startsWith('src/components/') ? 'component' : 'style',
      route: relativePath.startsWith('src/pages/') && path.extname(absolutePath) === PAGE_EXTENSION ? deriveRoute(relativePath) : null,
      family: relativePath.startsWith('src/pages/') && path.extname(absolutePath) === PAGE_EXTENSION ? classifyRoute(deriveRoute(relativePath)) : null,
      maxWidths,
      widthVars,
      heights,
      layouts,
      cssImports,
      localStyleBlocks,
      bytes: Buffer.byteLength(content),
    });
  }

  const pageRecords = records.filter(record => record.kind === 'page' && record.route);
  const publicPages = pageRecords.filter(record => record.family !== 'design-review');
  const unclassifiedPages = publicPages.filter(record => record.family === 'unclassified');
  const widthDeclarations = records.flatMap(record => record.maxWidths.map(value => ({ path: record.path, value, px: pxValue(value), kind: record.kind })));
  const pixelWidths = widthDeclarations.filter(item => item.px !== null);
  const arbitraryPixelWidths = pixelWidths.filter(item => ![360, 480, 640, 720, 760, 800, 860, 900, 1120, 1180].includes(item.px));
  const localStylePages = pageRecords.filter(record => record.localStyleBlocks > 0);

  const findings = {
    generatedAt: new Date().toISOString(),
    repoRoot: normalizeSlashes(repoRoot),
    summary: {
      sourceFilesScanned: records.length,
      pageSourceFiles: pageRecords.length,
      publicPageSourceFiles: publicPages.length,
      designReviewPageSourceFiles: pageRecords.length - publicPages.length,
      routeFamilies: unique(pageRecords.map(record => record.family)).length,
      unclassifiedPublicPageSources: unclassifiedPages.length,
      maxWidthDeclarations: widthDeclarations.length,
      distinctMaxWidthValues: unique(widthDeclarations.map(item => item.value)).length,
      distinctPixelMaxWidths: unique(pixelWidths.map(item => item.px)).length,
      pagesWithLocalStyleBlocks: localStylePages.length,
      totalLocalStyleBlocksInPages: localStylePages.reduce((sum, record) => sum + record.localStyleBlocks, 0),
    },
    canonicalProposal: {
      widths: {
        shell: '100%',
        wide: '1180px',
        standard: '960px',
        prose: '760px',
        narrow: '560px',
      },
      gutters: {
        mobile: '20px',
        tablet: '24px',
        desktop: '32px',
      },
      rule: 'No page-local max-width without a documented exception in the route inventory.',
    },
    routeFamilyCounts: countBy(pageRecords, record => record.family),
    sourceKindCounts: countBy(records, record => record.kind),
    maxWidthValueCounts: countBy(widthDeclarations, item => item.value),
    pixelMaxWidthCounts: countBy(pixelWidths, item => item.px),
    pageSources: pageRecords.map(record => ({
      route: record.route,
      family: record.family,
      path: record.path,
      layoutImports: record.layouts,
      localStyleBlocks: record.localStyleBlocks,
      maxWidths: record.maxWidths,
      heights: record.heights,
    })),
    widthDeclarations,
    widthVariables: records.flatMap(record => record.widthVars.map(variable => ({ path: record.path, ...variable }))),
    localStylePages: localStylePages.map(record => ({ path: record.path, route: record.route, family: record.family, blocks: record.localStyleBlocks })),
    arbitraryPixelWidths,
    unclassifiedPages: unclassifiedPages.map(record => ({ route: record.route, path: record.path })),
  };

  findings.status = unclassifiedPages.length === 0 ? 'INVENTORY_COMPLETE_REMEDIATION_REQUIRED' : 'INVENTORY_INCOMPLETE_UNCLASSIFIED_ROUTES';
  return findings;
}

export function renderSiteStandardAuditMarkdown(audit) {
  const routeRows = audit.pageSources.map(page => ({
    Route: page.route,
    Family: page.family,
    Source: page.path,
    Layouts: page.layoutImports.join(', ') || 'none',
    'Local styles': page.localStyleBlocks,
    'Max widths': page.maxWidths.join(', ') || 'none',
  }));

  const widthRows = Object.entries(audit.maxWidthValueCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ Value: value, Count: count }));

  return `# CBW Site Standard Inventory — 053A\n\n` +
    `Status: **${audit.status}**  \nGenerated: ${audit.generatedAt}\n\n` +
    `## Summary\n\n` +
    `- Source files scanned: ${audit.summary.sourceFilesScanned}\n` +
    `- Page source files: ${audit.summary.pageSourceFiles}\n` +
    `- Public page sources: ${audit.summary.publicPageSourceFiles}\n` +
    `- Route families: ${audit.summary.routeFamilies}\n` +
    `- Unclassified public pages: ${audit.summary.unclassifiedPublicPageSources}\n` +
    `- max-width declarations: ${audit.summary.maxWidthDeclarations}\n` +
    `- Distinct max-width values: ${audit.summary.distinctMaxWidthValues}\n` +
    `- Pages with local style blocks: ${audit.summary.pagesWithLocalStyleBlocks}\n\n` +
    `## Canonical width proposal\n\n` +
    `- Wide: ${audit.canonicalProposal.widths.wide}\n` +
    `- Standard: ${audit.canonicalProposal.widths.standard}\n` +
    `- Prose: ${audit.canonicalProposal.widths.prose}\n` +
    `- Narrow: ${audit.canonicalProposal.widths.narrow}\n` +
    `- Gutters: ${audit.canonicalProposal.gutters.mobile} / ${audit.canonicalProposal.gutters.tablet} / ${audit.canonicalProposal.gutters.desktop}\n\n` +
    `## max-width inventory\n\n${markdownTable(widthRows, ['Value', 'Count'])}\n\n` +
    `## Route-family inventory\n\n${markdownTable(routeRows, ['Route', 'Family', 'Source', 'Layouts', 'Local styles', 'Max widths'])}\n`;
}

async function main() {
  const audit = await runSiteStandardAudit();
  const args = new Set(process.argv.slice(2));
  const outDir = path.resolve(process.cwd(), 'reports', 'site-standard');
  await fs.mkdir(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'CBW_SITE_STANDARD_INVENTORY_053A.json');
  const markdownPath = path.join(outDir, 'CBW_SITE_STANDARD_INVENTORY_053A.md');
  await fs.writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`);
  await fs.writeFile(markdownPath, `${renderSiteStandardAuditMarkdown(audit)}\n`);

  if (args.has('--json')) {
    process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
  } else {
    console.log(`Site-standard audit: ${audit.status}`);
    console.log(`Pages: ${audit.summary.pageSourceFiles}; public: ${audit.summary.publicPageSourceFiles}; families: ${audit.summary.routeFamilies}`);
    console.log(`max-width declarations: ${audit.summary.maxWidthDeclarations}; distinct values: ${audit.summary.distinctMaxWidthValues}`);
    console.log(`Local-style pages: ${audit.summary.pagesWithLocalStyleBlocks}`);
    console.log(`Reports: ${path.relative(process.cwd(), jsonPath)}, ${path.relative(process.cwd(), markdownPath)}`);
  }

  if (audit.summary.unclassifiedPublicPageSources > 0 && args.has('--fail-on-unclassified')) {
    process.exitCode = 1;
  }
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
