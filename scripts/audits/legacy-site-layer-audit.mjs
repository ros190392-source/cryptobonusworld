import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');
const reportDir = path.join(repoRoot, 'reports', 'site-standard');
const TEXT_EXTENSIONS = new Set(['.astro', '.css', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json']);
const GOVERNANCE_SNAPSHOTS = new Set(['src/data/layout/sitewideLayoutAudit.ts']);

const deletedLayers = [
  'src/styles/exchange-page-v2.css',
  'src/styles/directory-pages-v2.css',
];

const deletionCandidates = [
  'src/components/exchange/ExchangePromoPage.astro',
  'src/components/PageHero.astro',
  'src/components/home/ExchangeCard.astro',
];

async function walk(root) {
  const files = [];
  async function visit(current) {
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) files.push(absolute);
    }
  }
  await visit(root);
  return files.sort();
}

const normalize = value => value.split(path.sep).join('/');

function collectModuleReferences(content) {
  const references = [];
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) references.push(match[1]);
  }
  return [...new Set(references)];
}

function referencesBasename(file, basename) {
  return file.moduleReferences.some(reference => reference.split('/').at(-1) === basename);
}

const files = await walk(srcRoot);
const source = [];
for (const absolute of files) {
  const content = await fs.readFile(absolute, 'utf8');
  const relativePath = normalize(path.relative(repoRoot, absolute));
  source.push({
    absolute,
    path: relativePath,
    content,
    moduleReferences: collectModuleReferences(content),
    governanceSnapshot: GOVERNANCE_SNAPSHOTS.has(relativePath),
  });
}

const runtimeSource = source.filter(file => !file.governanceSnapshot);

const exists = async relative => {
  try {
    await fs.access(path.join(repoRoot, relative));
    return true;
  } catch {
    return false;
  }
};

const deletedLayerState = [];
for (const layer of deletedLayers) {
  const basename = layer.split('/').at(-1);
  deletedLayerState.push({
    path: layer,
    exists: await exists(layer),
    importReferences: runtimeSource
      .filter(file => file.path !== layer && referencesBasename(file, basename))
      .map(file => file.path),
    historicalMentions: source
      .filter(file => file.governanceSnapshot && file.content.includes(basename))
      .map(file => file.path),
  });
}

const candidateState = [];
for (const candidate of deletionCandidates) {
  const basename = candidate.split('/').at(-1);
  candidateState.push({
    path: candidate,
    exists: await exists(candidate),
    importReferences: runtimeSource
      .filter(file => file.path !== candidate && referencesBasename(file, basename))
      .map(file => file.path),
    historicalMentions: source
      .filter(file => file.governanceSnapshot && file.content.includes(basename))
      .map(file => file.path),
  });
}

const finderReferences = runtimeSource
  .filter(file => file.content.includes('/#finder'))
  .map(file => file.path);
const historicalFinderMentions = source
  .filter(file => file.governanceSnapshot && file.content.includes('/#finder'))
  .map(file => file.path);
const legacyRedirectSources = runtimeSource
  .filter(file => file.path.startsWith('src/pages/') && /class=["']msg["']/.test(file.content))
  .map(file => file.path);
const standaloneRedirectStyles = runtimeSource
  .filter(file => file.path.startsWith('src/pages/exchanges/') && /<style>/.test(file.content) && /http-equiv=["']refresh["']/.test(file.content))
  .map(file => file.path);
const oldWidthAliases = runtimeSource
  .filter(file => file.path === 'src/layouts/CleanLayout.astro')
  .flatMap(file => [
    ...(file.content.includes('--cbw-wide-max: 1120px') ? ['--cbw-wide-max:1120px'] : []),
    ...(file.content.includes('--cbw-prose-max: 800px') ? ['--cbw-prose-max:800px'] : []),
  ]);
const oldGlobalGreenActionTokens = runtimeSource
  .filter(file => file.path === 'src/styles/tokens.css' && /Button: primary \(green CTA\)/.test(file.content))
  .map(file => file.path);

const blockers = [
  ...deletedLayerState.flatMap(item => item.exists ? [`DELETED_LAYER_EXISTS:${item.path}`] : []),
  ...deletedLayerState.flatMap(item => item.importReferences.map(ref => `DELETED_LAYER_IMPORTED:${item.path}:${ref}`)),
  ...finderReferences.map(ref => `LEGACY_FINDER_REFERENCE:${ref}`),
  ...legacyRedirectSources.map(ref => `LEGACY_REDIRECT_MSG:${ref}`),
  ...standaloneRedirectStyles.map(ref => `STANDALONE_REDIRECT_STYLE:${ref}`),
  ...oldWidthAliases.map(value => `OLD_WIDTH_ALIAS:${value}`),
];

const report = {
  generatedAt: new Date().toISOString(),
  status: blockers.length ? 'LEGACY_LAYER_DELETION_BLOCKED' : 'LEGACY_LAYER_DELETION_BASELINE_PASS',
  summary: {
    filesScanned: source.length,
    runtimeFilesScanned: runtimeSource.length,
    governanceSnapshotsExcluded: source.length - runtimeSource.length,
    deletedLayers: deletedLayerState.length,
    deletedLayerImportReferences: deletedLayerState.reduce((sum, item) => sum + item.importReferences.length, 0),
    finderReferences: finderReferences.length,
    historicalFinderMentions: historicalFinderMentions.length,
    legacyRedirectSources: legacyRedirectSources.length,
    standaloneRedirectStyles: standaloneRedirectStyles.length,
    oldWidthAliases: oldWidthAliases.length,
    oldGlobalGreenActionTokens: oldGlobalGreenActionTokens.length,
    blockers: blockers.length,
  },
  deletedLayerState,
  deletionCandidates: candidateState,
  finderReferences,
  historicalFinderMentions,
  legacyRedirectSources,
  standaloneRedirectStyles,
  oldWidthAliases,
  oldGlobalGreenActionTokens,
  blockers,
};

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(path.join(reportDir, 'CBW_LEGACY_LAYER_AUDIT_053F.json'), `${JSON.stringify(report, null, 2)}\n`);
const markdown = [
  '# CBW Legacy Layer Audit — 053F',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: **${report.status}**`,
  '',
  '## Summary',
  '',
  ...Object.entries(report.summary).map(([key, value]) => `- ${key}: ${value}`),
  '',
  '## Deleted layers',
  '',
  ...deletedLayerState.map(item => `- ${item.path}: exists=${item.exists}; runtime imports=${item.importReferences.length ? item.importReferences.join(', ') : 'none'}; historical mentions=${item.historicalMentions.length ? item.historicalMentions.join(', ') : 'none'}`),
  '',
  '## Component deletion candidates',
  '',
  ...candidateState.map(item => `- ${item.path}: exists=${item.exists}; runtime imports=${item.importReferences.length ? item.importReferences.join(', ') : 'none'}; historical mentions=${item.historicalMentions.length ? item.historicalMentions.join(', ') : 'none'}`),
  '',
  '## Blockers',
  '',
  ...(blockers.length ? blockers.map(item => `- ${item}`) : ['- none']),
  '',
].join('\n');
await fs.writeFile(path.join(reportDir, 'CBW_LEGACY_LAYER_AUDIT_053F.md'), markdown);

console.log(`${report.status}: blockers=${blockers.length}`);
for (const candidate of candidateState) {
  console.log(`candidate ${candidate.path}: exists=${candidate.exists}; runtime imports=${candidate.importReferences.length}`);
}

if (blockers.length) process.exitCode = 1;
