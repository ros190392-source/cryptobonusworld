import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');
const reportDir = path.join(repoRoot, 'reports', 'site-standard');
const TEXT_EXTENSIONS = new Set(['.astro', '.css', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json']);

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
const files = await walk(srcRoot);
const source = [];
for (const absolute of files) {
  source.push({
    absolute,
    path: normalize(path.relative(repoRoot, absolute)),
    content: await fs.readFile(absolute, 'utf8'),
  });
}

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
  const importNeedle = layer.split('/').at(-1);
  deletedLayerState.push({
    path: layer,
    exists: await exists(layer),
    importReferences: source
      .filter(file => file.path !== layer && file.content.includes(importNeedle))
      .map(file => file.path),
  });
}

const candidateState = deletionCandidates.map(candidate => {
  const basename = candidate.split('/').at(-1);
  return {
    path: candidate,
    exists: source.some(file => file.path === candidate),
    importReferences: source
      .filter(file => file.path !== candidate && file.content.includes(basename))
      .map(file => file.path),
  };
});

const finderReferences = source
  .filter(file => file.content.includes('/#finder'))
  .map(file => file.path);
const legacyRedirectSources = source
  .filter(file => file.path.startsWith('src/pages/') && /class=["']msg["']/.test(file.content))
  .map(file => file.path);
const standaloneRedirectStyles = source
  .filter(file => file.path.startsWith('src/pages/exchanges/') && /<style>/.test(file.content) && /http-equiv=["']refresh["']/.test(file.content))
  .map(file => file.path);
const oldWidthAliases = source
  .filter(file => file.path === 'src/layouts/CleanLayout.astro')
  .flatMap(file => [
    ...(file.content.includes('--cbw-wide-max: 1120px') ? ['--cbw-wide-max:1120px'] : []),
    ...(file.content.includes('--cbw-prose-max: 800px') ? ['--cbw-prose-max:800px'] : []),
  ]);
const oldGlobalGreenActionTokens = source
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
    deletedLayers: deletedLayerState.length,
    deletedLayerImportReferences: deletedLayerState.reduce((sum, item) => sum + item.importReferences.length, 0),
    finderReferences: finderReferences.length,
    legacyRedirectSources: legacyRedirectSources.length,
    standaloneRedirectStyles: standaloneRedirectStyles.length,
    oldWidthAliases: oldWidthAliases.length,
    oldGlobalGreenActionTokens: oldGlobalGreenActionTokens.length,
    blockers: blockers.length,
  },
  deletedLayerState,
  deletionCandidates: candidateState,
  finderReferences,
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
  ...deletedLayerState.map(item => `- ${item.path}: exists=${item.exists}; imports=${item.importReferences.length ? item.importReferences.join(', ') : 'none'}`),
  '',
  '## Component deletion candidates',
  '',
  ...candidateState.map(item => `- ${item.path}: exists=${item.exists}; imports=${item.importReferences.length ? item.importReferences.join(', ') : 'none'}`),
  '',
  '## Blockers',
  '',
  ...(blockers.length ? blockers.map(item => `- ${item}`) : ['- none']),
  '',
].join('\n');
await fs.writeFile(path.join(reportDir, 'CBW_LEGACY_LAYER_AUDIT_053F.md'), markdown);

console.log(`${report.status}: blockers=${blockers.length}`);
for (const candidate of candidateState) {
  console.log(`candidate ${candidate.path}: imports=${candidate.importReferences.length}`);
}

if (blockers.length) process.exitCode = 1;
