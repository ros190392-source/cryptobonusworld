import { readFile, writeFile } from 'node:fs/promises';

const changes = [
  {
    path: 'src/pages/affiliate-disclosure.astro',
    replacements: [
      ['    max-width: 800px;', '    max-width: var(--cbw-width-prose, 760px);'],
    ],
  },
  {
    path: 'src/pages/editorial-policy.astro',
    replacements: [
      ['  .container { max-width: 820px; margin: 0 auto; padding: 0 var(--container-pad); }', '  .container { max-width: var(--cbw-width-prose, 760px); margin: 0 auto; padding: 0 var(--container-pad); }'],
    ],
  },
  {
    path: 'src/pages/update-policy.astro',
    replacements: [
      ['  .container { max-width: 820px; margin: 0 auto; padding: 0 var(--container-pad); }', '  .container { max-width: var(--cbw-width-prose, 760px); margin: 0 auto; padding: 0 var(--container-pad); }'],
    ],
  },
  {
    path: 'src/pages/methodology.astro',
    replacements: [
      ['  .mth-prose { max-width: 800px; }', '  .mth-prose { max-width: var(--cbw-width-prose, 760px); }'],
      ['  .mth-wide  { max-width: 1120px; }', '  .mth-wide  { max-width: var(--cbw-width-wide, 1180px); }'],
    ],
  },
  {
    path: 'src/pages/countries/kazakhstan/index.astro',
    replacements: [
      [
        '  .shell { width: min(1160px, calc(100% - 40px)); margin-inline: auto; }',
        '  .shell { width: min(var(--cbw-width-wide, 1180px), calc(100% - 40px)); margin-inline: auto; }',
      ],
      [
`  @media (max-width: 719px) {
    .country-title { display: block; }
    .flag { display: block; margin-bottom: 15px; }
    .profile-head { display: grid; }
    .profile-card dl { grid-template-columns: 1fr; }
    .shell { width: min(100% - 32px, 1160px); }
  }`,
`  @media (max-width: 719px) {
    .country-hero { padding: 12px 0 42px; }
    .preview-strip { padding: 8px 10px; }
    .crumbs { margin-top: 18px; }
    .hero-grid { gap: 14px; margin-top: 18px; }
    .country-title { display: flex; align-items: flex-start; gap: 8px; }
    .flag { display: inline-block; margin: 2px 0 0; font-size: 30px; }
    h1 { font-size: clamp(40px, 12vw, 48px); line-height: .94; }
    .lede { margin-top: 14px; font-size: 14px; line-height: 1.55; }
    .readiness-card { padding: 14px; }
    .readiness-card :global(.review-status small) { display: none; }
    .readiness-card dl { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 6px 12px; margin-top: 10px; }
    .readiness-card dl div { display: block; padding-top: 6px; }
    .readiness-card dd { margin-top: 2px; }
    .profile-head { display: grid; }
    .profile-card dl { grid-template-columns: 1fr; }
    .shell { width: min(var(--cbw-width-wide, 1180px), calc(100% - 32px)); }
  }`,
      ],
    ],
  },
];

let total = 0;
for (const change of changes) {
  let source = await readFile(change.path, 'utf8');
  for (const [before, after] of change.replacements) {
    const occurrences = source.split(before).length - 1;
    if (occurrences !== 1) {
      throw new Error(`${change.path}: expected exactly one occurrence, found ${occurrences}: ${before.slice(0, 100)}`);
    }
    source = source.replace(before, after);
    total += 1;
  }
  await writeFile(change.path, source);
}

if (total !== 7) throw new Error(`Expected seven exact replacements, applied ${total}`);
console.log(`Applied ${total} fail-closed Site Standard remediation replacements.`);
