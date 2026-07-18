// build-rework-queue.mjs — owner-review selective-rework queue generator.
//
// Reads the review-state overlay + batch registries and writes
// owner-assets/exchange-preview-review/rework-queue.{json,csv,md}
// plus the untracked-media dependency audit (media-commit-plan.md).
//
// SELECTIVE REGENERATION RULE (never rebuild a whole pack unless required):
//   hero    → rebuild hero only; preserve canonical logo/article/OG/card
//   logo    → replace canonical logo, THEN rebuild every surface that
//             consumes it: hero overlay, hub, article, OG, card, bottom block
//   article → rebuild article banner only
//   og      → rebuild OG only
//   card    → rebuild card only
//   alternatives → rebuild alternatives assets only (shared, affects all pages)
//   text/data    → registry/content edit only, no asset rebuilds
//   compliance   → owner decision first; no rebuilds until resolved
//   global template issue → update generator/component, then list ALL
//             affected exchanges and show before/after BEFORE applying.
//
// Rework batches:
//   node scripts/build-rework-queue.mjs --batch 01 --slugs blofin,phemex
//   creates owner-assets/exchange-preview-review/REWORK-BATCH-01/
//   with manifest.json + originals/ (current assets copied for preservation);
//   replacement assets, before/after sheets and screenshots are added by the
//   rework run itself.
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const { batch01 } = await import('../src/data/exchangePreview/batch-01.ts');
const { batch02 } = await import('../src/data/exchangePreview/batch-02.ts');
const { getReview } = await import('../src/data/exchangePreview/review-state.ts');

const OUT = 'owner-assets/exchange-preview-review';
mkdirSync(OUT, { recursive: true });

const REBUILD_MAP = {
  hero: { rebuild: ['hero'], preserve: ['logo', 'article', 'og', 'card'] },
  logo: { rebuild: ['logo', 'hero-overlay', 'hub', 'article', 'og', 'card', 'bottom'], preserve: [] },
  article: { rebuild: ['article'], preserve: ['hero', 'logo', 'og', 'card'] },
  og: { rebuild: ['og'], preserve: ['hero', 'logo', 'article', 'card'] },
  card: { rebuild: ['card'], preserve: ['hero', 'logo', 'article', 'og'] },
  alternatives: { rebuild: ['alternatives-assets'], preserve: ['hero', 'logo', 'article', 'og', 'card'] },
  text: { rebuild: ['registry-text'], preserve: ['all assets'] },
  data: { rebuild: ['registry-data'], preserve: ['all assets'] },
  compliance: { rebuild: [], preserve: ['all assets — blocked on owner decision'] },
};

const paths = (e, batch) => {
  const d = `public/preview-media/exchanges/${e.slug}`;
  const p = {
    logo: e.canonicalBannerLogo,
    hero: e.heroBackgroundPath,
    article: e.articleInlineImage ?? null,
    og: e.ogImage ?? null,
    card: batch === '01' ? `/preview-media/exchanges/${e.slug}/${e.slug}-card-1200x800.jpg` : null,
  };
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v));
};

const all = [
  ...batch01.map(e => ({ e, batch: '01' })),
  ...batch02.map(e => ({ e, batch: '02' })),
].map(({ e, batch }) => {
  const r = getReview(e.slug);
  return {
    number: e.number, slug: e.slug, displayName: e.displayName, batch,
    status: r.ownerReviewStatus,
    issueTypes: r.ownerIssueTypes,
    ownerNotes: r.ownerNotes,
    lastOwnerReview: r.lastOwnerReview,
    assetsToRebuild: [...new Set(r.ownerIssueTypes.flatMap(t => REBUILD_MAP[t]?.rebuild ?? []))],
    assetsToPreserve: [...new Set(r.ownerIssueTypes.flatMap(t => REBUILD_MAP[t]?.preserve ?? []))],
    currentPaths: paths(e, batch),
  };
});

// queue = everything needing action (rework or owner_review); pending/pass listed separately in md
const queue = all.filter(x => x.status === 'rework' || x.status === 'owner_review');

writeFileSync(`${OUT}/rework-queue.json`, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), selectiveRegenerationRule: REBUILD_MAP, queue, allStatuses: all.map(({ number, slug, status, issueTypes }) => ({ number, slug, status, issueTypes })) }, null, 2));

const csvEsc = v => `"${String(v).replace(/"/g, '""')}"`;
writeFileSync(`${OUT}/rework-queue.csv`, [
  'number,slug,displayName,batch,status,issueTypes,ownerNotes,assetsToRebuild,assetsToPreserve,currentPaths',
  ...queue.map(q => [q.number, q.slug, csvEsc(q.displayName), q.batch, q.status, csvEsc(q.issueTypes.join('; ')), csvEsc(q.ownerNotes.join(' | ')), csvEsc(q.assetsToRebuild.join('; ')), csvEsc(q.assetsToPreserve.join('; ')), csvEsc(Object.values(q.currentPaths).join(' | '))].join(',')),
].join('\n'));

writeFileSync(`${OUT}/rework-queue.md`, [
  '# Exchange Preview — Owner Rework Queue', '',
  `Generated: ${new Date().toISOString().slice(0, 10)} · queue: ${queue.length} of ${all.length} exchanges`, '',
  '## Selective regeneration rule',
  ...Object.entries(REBUILD_MAP).map(([k, v]) => `- **${k}** → rebuild: ${v.rebuild.join(', ') || '(none)'} · preserve: ${v.preserve.join(', ')}`),
  '- **global template issue** → update generator/component, list ALL affected exchanges + before/after sheets BEFORE applying.', '',
  '## Queue',
  '| # | Exchange | Batch | Status | Issues | Rebuild | Preserve | Notes |',
  '|---|----------|-------|--------|--------|---------|----------|-------|',
  ...queue.map(q => `| ${q.number} | ${q.displayName} | ${q.batch} | ${q.status} | ${q.issueTypes.join(', ') || '—'} | ${q.assetsToRebuild.join(', ') || '—'} | ${q.assetsToPreserve.join(', ') || '—'} | ${q.ownerNotes.join('; ') || '—'} |`),
  '',
  '## Not queued',
  ...all.filter(x => !queue.includes(x)).map(x => `- #${x.number} ${x.displayName} (batch ${x.batch}) — ${x.status}`),
].join('\n'));

console.log(`queue written: ${queue.length} queued / ${all.length} total`);

// untracked-media dependency audit + media-commit plan
const untracked = execSync('git ls-files --others --exclude-standard public/preview-media/').toString().trim().split('\n').filter(Boolean);
const referencedByCommit = [];
for (const x of all) for (const p of Object.values(x.currentPaths)) {
  const f = 'public' + p;
  if (untracked.includes(f.replace(/\\/g, '/'))) referencedByCommit.push(f);
}
const altLogos = untracked.filter(f => f.includes('/alternatives/') && f.includes('logo-slot-512x160-v1'));
writeFileSync(`${OUT}/media-commit-plan.md`, [
  '# Media Commit Plan — zero broken assets on clean checkout', '',
  `Untracked files under public/preview-media/: ${untracked.length}`,
  `Referenced by committed code (registry/component) but untracked: ${referencedByCommit.length + altLogos.length}`, '',
  '## Commit 1 — required by committed code (fixes all 55 broken refs + og:image)',
  '```',
  ...altLogos, ...referencedByCommit,
  '```', '',
  '## Commit 2 — factory sources & derivatives (owner-source, card images, legacy v1)',
  'Everything else under public/preview-media/exchanges/ (owner-source provenance JPGs, card-1200x800, legacy v1 heroes) — commit together or prune first (owner call).', '',
  '## Not for the media commits',
  '- .tmp-batch01-uploads/ (scratch, never committed)',
  '- owner-assets/ (masters — separate decision)',
].join('\n'));
console.log(`media plan: ${untracked.length} untracked, ${referencedByCommit.length + altLogos.length} referenced by commit`);

// optional: create a rework batch skeleton
const argBatch = process.argv.indexOf('--batch');
if (argBatch > -1) {
  const nn = process.argv[argBatch + 1];
  const slugs = (process.argv[process.argv.indexOf('--slugs') + 1] || '').split(',').filter(Boolean);
  if (slugs.length < 1 || slugs.length > 10) throw new Error('rework batch needs 1-10 slugs (recommended 5-10)');
  const dir = `${OUT}/REWORK-BATCH-${nn}`;
  mkdirSync(`${dir}/originals`, { recursive: true });
  mkdirSync(`${dir}/replacements`, { recursive: true });
  mkdirSync(`${dir}/sheets`, { recursive: true });
  mkdirSync(`${dir}/screenshots`, { recursive: true });
  const items = all.filter(x => slugs.includes(x.slug));
  for (const it of items) for (const p of Object.values(it.currentPaths)) {
    const src = 'public' + p;
    if (existsSync(src)) copyFileSync(src, `${dir}/originals/${p.split('/').pop()}`);
  }
  writeFileSync(`${dir}/manifest.json`, JSON.stringify({ batch: nn, created: new Date().toISOString().slice(0, 10), items }, null, 2));
  console.log(`REWORK-BATCH-${nn}: ${items.length} exchanges, originals copied`);
}
