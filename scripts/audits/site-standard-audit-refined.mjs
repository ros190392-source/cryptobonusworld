import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  runSiteStandardAudit as runBaseAudit,
  renderSiteStandardAuditMarkdown as renderBaseMarkdown,
} from './site-standard-audit.mjs';

const TEXT_EXTENSIONS = new Set(['.astro', '.css', '.ts', '.tsx', '.js', '.mjs', '.cjs']);
const CSS_MAX_WIDTH_RE = /(?:^|[;{])\s*max-width\s*:\s*([^;}{]+)/gim;
const CANONICAL_CONTAINER_WIDTHS = new Set([560, 760, 960, 1180]);

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
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  }
  await visit(root);
  return files.sort();
}

function normalizeCssValue(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function pxValue(value) {
  const match = normalizeCssValue(value).match(/^(-?\d+(?:\.\d+)?)px(?:\s*!important)?$/i);
  return match ? Number(match[1]) : null;
}

function countBy(items, selector) {
  const counts = new Map();
  for (const item of items) {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

function unique(values) {
  return [...new Set(values)];
}

function collectCssMaxWidths(content) {
  const values = [];
  CSS_MAX_WIDTH_RE.lastIndex = 0;
  let match;
  while ((match = CSS_MAX_WIDTH_RE.exec(content)) !== null) {
    values.push(normalizeCssValue(match[1]));
  }
  return values;
}

function isContainerLike(item) {
  if (item.px !== null) return item.px >= 500;
  return /(?:page|max|wide|standard|prose|content|container|wrap)/i.test(item.value);
}

function appendRefinedMarkdown(markdown, audit) {
  const rows = audit.containerLikeWidthDeclarations
    .slice()
    .sort((a, b) => (b.px ?? 0) - (a.px ?? 0) || a.path.localeCompare(b.path))
    .map(item => `| ${item.path} | ${item.kind} | ${item.value} | ${item.px ?? 'token'} | ${item.canonical ? 'canonical' : 'migrate/exception'} |`);

  return `${markdown}\n\n## Refined container-width classification\n\n` +
    `Media-query breakpoints are excluded from this section. Small component widths remain inventoried separately.\n\n` +
    `- Actual CSS max-width declarations: ${audit.summary.actualCssMaxWidthDeclarations}\n` +
    `- Distinct actual values: ${audit.summary.distinctActualCssMaxWidthValues}\n` +
    `- Page-local declarations: ${audit.summary.pageLocalMaxWidthDeclarations}\n` +
    `- Container-like declarations: ${audit.summary.containerLikeWidthDeclarations}\n` +
    `- Distinct container-like pixel widths: ${audit.summary.distinctContainerLikePixelWidths}\n` +
    `- Non-canonical container-like declarations: ${audit.summary.nonCanonicalContainerLikeDeclarations}\n\n` +
    `| Source | Kind | Value | Pixels | Decision |\n` +
    `| --- | --- | --- | ---: | --- |\n` +
    `${rows.join('\n')}\n`;
}

export async function runSiteStandardAuditRefined(options = {}) {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const audit = await runBaseAudit({ ...options, repoRoot });
  const sourceRoots = [
    path.join(repoRoot, 'src', 'pages'),
    path.join(repoRoot, 'src', 'layouts'),
    path.join(repoRoot, 'src', 'components'),
    path.join(repoRoot, 'src', 'styles'),
  ];
  const allFiles = (await Promise.all(sourceRoots.map(walk))).flat();
  const textFiles = allFiles.filter(file => TEXT_EXTENSIONS.has(path.extname(file)));
  const pageSourcePaths = new Set(audit.pageSources.map(page => page.path));
  const declarations = [];
  const perFile = new Map();

  for (const absolutePath of textFiles) {
    const content = await fs.readFile(absolutePath, 'utf8');
    const relativePath = normalizeSlashes(path.relative(repoRoot, absolutePath));
    const kind = relativePath.startsWith('src/pages/')
      ? 'page'
      : relativePath.startsWith('src/layouts/')
        ? 'layout'
        : relativePath.startsWith('src/components/')
          ? 'component'
          : 'style';
    const values = collectCssMaxWidths(content);
    perFile.set(relativePath, values);
    for (const value of values) {
      const px = pxValue(value);
      declarations.push({
        path: relativePath,
        kind,
        value,
        px,
        pageLocal: pageSourcePaths.has(relativePath),
      });
    }
  }

  const pixelDeclarations = declarations.filter(item => item.px !== null);
  const pageLocalDeclarations = declarations.filter(item => item.pageLocal);
  const containerLikeWidthDeclarations = declarations
    .filter(isContainerLike)
    .map(item => ({ ...item, canonical: item.px !== null && CANONICAL_CONTAINER_WIDTHS.has(item.px) }));
  const nonCanonicalContainerLikeDeclarations = containerLikeWidthDeclarations.filter(item => !item.canonical);

  audit.generatedAt = new Date().toISOString();
  audit.widthDeclarations = declarations;
  audit.maxWidthValueCounts = countBy(declarations, item => item.value);
  audit.pixelMaxWidthCounts = countBy(pixelDeclarations, item => item.px);
  audit.pageLocalWidthDeclarations = pageLocalDeclarations;
  audit.containerLikeWidthDeclarations = containerLikeWidthDeclarations;
  audit.nonCanonicalContainerLikeDeclarations = nonCanonicalContainerLikeDeclarations;
  audit.arbitraryPixelWidths = pixelDeclarations.filter(item => item.px >= 500 && !CANONICAL_CONTAINER_WIDTHS.has(item.px));
  audit.pageSources = audit.pageSources.map(page => ({
    ...page,
    maxWidths: perFile.get(page.path) ?? [],
  }));
  audit.summary.maxWidthDeclarations = declarations.length;
  audit.summary.distinctMaxWidthValues = unique(declarations.map(item => item.value)).length;
  audit.summary.distinctPixelMaxWidths = unique(pixelDeclarations.map(item => item.px)).length;
  audit.summary.actualCssMaxWidthDeclarations = declarations.length;
  audit.summary.distinctActualCssMaxWidthValues = unique(declarations.map(item => item.value)).length;
  audit.summary.pageLocalMaxWidthDeclarations = pageLocalDeclarations.length;
  audit.summary.containerLikeWidthDeclarations = containerLikeWidthDeclarations.length;
  audit.summary.distinctContainerLikePixelWidths = unique(containerLikeWidthDeclarations.filter(item => item.px !== null).map(item => item.px)).length;
  audit.summary.nonCanonicalContainerLikeDeclarations = nonCanonicalContainerLikeDeclarations.length;
  audit.status = audit.summary.unclassifiedPublicPageSources === 0
    ? 'INVENTORY_REFINED_REMEDIATION_REQUIRED'
    : 'INVENTORY_INCOMPLETE_UNCLASSIFIED_ROUTES';

  return audit;
}

export function renderSiteStandardAuditRefinedMarkdown(audit) {
  return appendRefinedMarkdown(renderBaseMarkdown(audit), audit);
}

async function main() {
  const audit = await runSiteStandardAuditRefined();
  const args = new Set(process.argv.slice(2));
  const outDir = path.resolve(process.cwd(), 'reports', 'site-standard');
  await fs.mkdir(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'CBW_SITE_STANDARD_INVENTORY_053A.json');
  const markdownPath = path.join(outDir, 'CBW_SITE_STANDARD_INVENTORY_053A.md');
  await fs.writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`);
  await fs.writeFile(markdownPath, `${renderSiteStandardAuditRefinedMarkdown(audit)}\n`);

  if (args.has('--json')) process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
  else {
    console.log(`Site-standard audit: ${audit.status}`);
    console.log(`Pages: ${audit.summary.pageSourceFiles}; public: ${audit.summary.publicPageSourceFiles}; families: ${audit.summary.routeFamilies}`);
    console.log(`Actual max-width declarations: ${audit.summary.actualCssMaxWidthDeclarations}; distinct values: ${audit.summary.distinctActualCssMaxWidthValues}`);
    console.log(`Container-like declarations: ${audit.summary.containerLikeWidthDeclarations}; non-canonical: ${audit.summary.nonCanonicalContainerLikeDeclarations}`);
    console.log(`Local-style pages: ${audit.summary.pagesWithLocalStyleBlocks}`);
  }

  if (audit.summary.unclassifiedPublicPageSources > 0 && args.has('--fail-on-unclassified')) process.exitCode = 1;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
