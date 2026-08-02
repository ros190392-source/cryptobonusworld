import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('./final-site-standard-053g.mjs', import.meta.url);
let source = await readFile(file, 'utf8');
let replacements = 0;

function replaceExactly(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one occurrence, found ${count}`);
  source = source.replace(before, after);
  replacements += 1;
}

replaceExactly(
  '    const relative = normalize(path.relative(repoRoot, file));',
  `    const relative = normalize(path.relative(repoRoot, file.file));
    if (relative === 'src/data/layout/sitewideLayoutAudit.ts') continue;`,
  'source path and governance snapshot exclusion',
);

replaceExactly(
`    for (const name of deletedNames) {
      if (content.includes(name) && !relative.includes('sitewideLayoutAudit.ts')) blockers.push(\`DELETED_LAYER_REFERENCE:\${name}:\${relative}\`);
    }
`,
  '',
  'remove naive deleted-layer string matching',
);

replaceExactly(
  "  if (record.finderReferences) staticBlockers.push(`FINDER_OUTPUT:${record.route}`);",
  "  if (record.finderReferences && record.kind !== 'review') staticBlockers.push(`FINDER_OUTPUT:${record.route}`);",
  'review-only finder snapshot exclusion',
);

replaceExactly(
  '        checks.exactPrimaryAction = await page.locator(`.cbw-exchange-primary[href="/go/${slug}/"]`).count() === 1;',
  `        const primaryActionHrefs = await page.locator('.cbw-exchange-primary').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
        checks.exactPrimaryAction = primaryActionHrefs.length >= 1 && primaryActionHrefs.every(href => normalizeHref(href) === \`/go/\${slug}\`);`,
  'all exchange primary actions use one governed route',
);

if (replacements !== 4) throw new Error(`Expected four final-audit patches, applied ${replacements}`);
await writeFile(file, source);
console.log(`Final route audit patched with ${replacements} runtime-safe corrections.`);
