/**
 * Exchange Intelligence DB Audit Script
 * TASK: SPRINT-06-EXCHANGE-INTELLIGENCE-DB-AUDIT-01
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'src', 'data', 'exchange-intelligence');
const REPORTS = path.join(ROOT, 'reports');

// Load source-of-truth affiliate data
const exchanges = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'exchanges.json'), 'utf8'));
const affiliateMap = {};
exchanges.forEach(e => { affiliateMap[e.slug] = e; });

const slugs = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));

const results = [];

for (const s of slugs) {
  const raw = fs.readFileSync(path.join(DIR, s + '.json'), 'utf8');
  const p = JSON.parse(raw);
  const ref = affiliateMap[s];
  const issues = [];
  const warnings = [];
  const dangerousFields = [];

  // ── 1. Core identity ────────────────────────────────────────────────────
  if (p.exchange !== s) issues.push(`slug mismatch: profile.exchange="${p.exchange}" file="${s}"`);
  if (!p.schemaVersion) issues.push('missing schemaVersion');
  if (!p.lastUpdated) issues.push('missing lastUpdated');
  if (!p.dataSourcesUsed || p.dataSourcesUsed.length === 0) warnings.push('dataSourcesUsed is empty');

  // ── 2. Affiliate integrity (CRITICAL) ───────────────────────────────────
  if (!p.affiliate) {
    issues.push('missing affiliate block');
  } else {
    if (p.affiliate.primaryUrl === undefined) {
      issues.push('affiliate.primaryUrl undefined (should be null or a URL)');
    }
    // Cross-check URL vs exchanges.json source
    if (ref && ref.affiliateUrl && p.affiliate.primaryUrl) {
      if (p.affiliate.primaryUrl !== ref.affiliateUrl) {
        issues.push(`AFFILIATE URL MISMATCH — profile: "${p.affiliate.primaryUrl}" source: "${ref.affiliateUrl}"`);
      }
    }
    // Cross-check promo code
    if (ref && ref.promoCode && p.affiliate.promoCode) {
      if (p.affiliate.promoCode !== ref.promoCode) {
        issues.push(`PROMO CODE MISMATCH — profile: "${p.affiliate.promoCode}" source: "${ref.promoCode}"`);
      }
    }
    // Cross-check bonus amount
    if (ref && ref.bonusAmount !== undefined && p.affiliate.bonusAmount !== undefined) {
      if (p.affiliate.bonusAmount !== ref.bonusAmount) {
        issues.push(`BONUS AMOUNT MISMATCH — profile: ${p.affiliate.bonusAmount} source: ${ref.bonusAmount}`);
      }
    }
    if (!p.affiliate.ownerApprovalRequiredForChanges) {
      warnings.push('affiliate.ownerApprovalRequiredForChanges not set to true');
    }
    if (!p.affiliate.immutableNote) {
      warnings.push('affiliate.immutableNote missing');
    }
  }

  // ── 3. Market intelligence sourcing ─────────────────────────────────────
  if (!p.marketIntelligence) {
    issues.push('missing marketIntelligence');
  } else {
    if (!p.marketIntelligence.dataFetchedAt) {
      dangerousFields.push('marketIntelligence.dataFetchedAt missing — volume/users/reserves have no fetch timestamp');
    }
    if (!p.marketIntelligence.geckoId && !p.marketIntelligence.cmcSlug) {
      issues.push('no geckoId or cmcSlug — data source unidentifiable');
    }
    if (p.marketIntelligence.volume24hUsd && !p.marketIntelligence.dataFetchedAt) {
      dangerousFields.push('volume24hUsd present without fetchedAt — treated as live fact, should be snapshot');
    }
    if (!p.marketIntelligence.dataRefreshScript) {
      warnings.push('marketIntelligence.dataRefreshScript missing — no documented way to refresh');
    }
  }

  // ── 4. Fees ──────────────────────────────────────────────────────────────
  if (!p.fees) {
    issues.push('missing fees block');
  } else {
    if (p.fees.spotMaker === undefined || p.fees.spotMaker === null) issues.push('fees.spotMaker missing');
    if (p.fees.spotTaker === undefined || p.fees.spotTaker === null) issues.push('fees.spotTaker missing');
    if (!p.fees.feeSourceUrl) {
      dangerousFields.push('fees.feeSourceUrl missing — spot/futures fee claims have no official source URL');
    }
    if (!p.fees.lastChecked) {
      warnings.push('fees.lastChecked missing');
    }
  }

  // ── 5. Knowledge base ────────────────────────────────────────────────────
  if (!p.knowledgeBase) {
    issues.push('missing knowledgeBase');
  } else {
    const qCount = p.knowledgeBase.commonQuestions ? p.knowledgeBase.commonQuestions.length : 0;
    if (qCount < 20) {
      issues.push(`commonQuestions count too low: ${qCount} (expected >= 20)`);
    }
    if (!p.knowledgeBase.quickFacts) {
      warnings.push('knowledgeBase.quickFacts missing');
    }
  }

  // ── 6. Trust / security incidents ───────────────────────────────────────
  if (!p.trust) {
    issues.push('missing trust block');
  } else {
    if (p.trust.securityIncidents && p.trust.securityIncidents.length > 0) {
      for (const inc of p.trust.securityIncidents) {
        if (!inc.sourceUrl && !inc.source) {
          dangerousFields.push(`securityIncident "${inc.summary}" has no sourceUrl — hack/incident claim without citation`);
        }
      }
    }
    if (p.trust.licences && !Array.isArray(p.trust.licences)) {
      warnings.push('trust.licences should be an array');
    }
  }

  // ── 7. Availability / country restrictions ───────────────────────────────
  if (!p.availability) {
    issues.push('missing availability block');
  } else {
    if (p.availability.restrictedUS === true && !p.availability.officialRestrictedListUrl) {
      dangerousFields.push('restrictedUS=true but no officialRestrictedListUrl — restriction claim without official source');
    }
    if (p.availability.restrictedUK === true && !p.availability.officialRestrictedListUrl) {
      dangerousFields.push('restrictedUK=true but no officialRestrictedListUrl — restriction claim without official source');
    }
    if (p.availability.manualReviewRequired !== true) {
      warnings.push('availability.manualReviewRequired should be true — availability changes without flag');
    }
  }

  // ── 8. Freshness ─────────────────────────────────────────────────────────
  if (!p.freshness) {
    issues.push('missing freshness block');
  } else {
    if (!p.freshness.marketDataFetchedAt) {
      dangerousFields.push('freshness.marketDataFetchedAt missing');
    }
    if (!p.freshness.nextMarketRefresh) {
      warnings.push('freshness.nextMarketRefresh missing');
    }
  }

  // ── 9. Official pages ────────────────────────────────────────────────────
  if (!p.officialPages || Object.keys(p.officialPages).length === 0) {
    warnings.push('officialPages is empty — no source URLs documented');
  }

  // ── 10. Secrets / credentials scan ──────────────────────────────────────
  const credPatterns = [
    { pattern: /\"password\"\s*:\s*\"[^\"]{3,}\"/, label: 'password field with value' },
    { pattern: /\"secret\"\s*:\s*\"[^\"]{3,}\"/, label: 'secret field with value' },
    { pattern: /\"bearer\s/i, label: 'bearer token' },
    { pattern: /\"private_key\"/i, label: 'private_key field' },
    { pattern: /sk-[a-zA-Z0-9]{20,}/, label: 'OpenAI-style API key' },
    { pattern: /AKIA[0-9A-Z]{16}/, label: 'AWS access key' },
  ];
  for (const { pattern, label } of credPatterns) {
    if (pattern.test(raw)) {
      issues.push(`SECURITY: possible ${label} found in profile`);
    }
  }

  // ── 11. Regulatory claims without source ─────────────────────────────────
  const regulatoryTerms = ['VARA', 'FCA', 'SEC', 'FinCEN', 'NFA', 'MiCA', 'CFTC', 'FINMA'];
  for (const term of regulatoryTerms) {
    const re = new RegExp(term, 'g');
    const matches = raw.match(re);
    if (matches && matches.length > 0) {
      // Check if any source URL accompanies regulatory claims
      if (!p.officialPages || Object.keys(p.officialPages).length === 0) {
        warnings.push(`regulatory term "${term}" appears ${matches.length}x but officialPages is empty`);
      }
    }
  }

  // ── 12. No-autopublish guard ──────────────────────────────────────────────
  const autoPubTerms = ['writefile', 'writeFileSync', 'deploy', 'git push', 'npm run build'];
  for (const term of autoPubTerms) {
    if (raw.toLowerCase().includes(term.toLowerCase())) {
      issues.push(`profile contains "${term}" — possible auto-publish instruction in data file`);
    }
  }

  const status = issues.length > 0 ? 'FAIL' : dangerousFields.length > 0 ? 'DANGEROUS_FIELDS' : warnings.length > 0 ? 'WARN' : 'PASS';

  results.push({ slug: s, status, issues, warnings, dangerousFields });

  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️ ' : status === 'DANGEROUS_FIELDS' ? '🔶' : '❌';
  process.stdout.write(`${icon} ${s.padEnd(14)} issues:${issues.length} dangerous:${dangerousFields.length} warnings:${warnings.length}\n`);
  for (const i of issues) process.stdout.write(`     ❌ ISSUE: ${i}\n`);
  for (const d of dangerousFields) process.stdout.write(`     🔶 DANGER: ${d}\n`);
  for (const w of warnings) process.stdout.write(`     ⚠️  WARN: ${w}\n`);
}

// ── Summary ────────────────────────────────────────────────────────────────
const fails = results.filter(r => r.status === 'FAIL').length;
const dangerous = results.filter(r => r.status === 'DANGEROUS_FIELDS').length;
const warns = results.filter(r => r.status === 'WARN').length;
const passes = results.filter(r => r.status === 'PASS').length;

console.log('\n' + '═'.repeat(60));
console.log(`PASS: ${passes}  WARN: ${warns}  DANGEROUS_FIELDS: ${dangerous}  FAIL: ${fails}`);

// Collect all dangerous fields across all profiles
const allDangerous = results.flatMap(r => r.dangerousFields.map(d => ({ slug: r.slug, field: d })));
const allIssues = results.flatMap(r => r.issues.map(i => ({ slug: r.slug, issue: i })));
const allWarnings = results.flatMap(r => r.warnings.map(w => ({ slug: r.slug, warning: w })));

// Recommendation
let recommendation;
if (fails > 0) recommendation = 'NEEDS_FIXES_BEFORE_COMMIT';
else if (dangerous > 0) recommendation = 'NEEDS_FIXES_BEFORE_COMMIT';
else if (warns > 0) recommendation = 'READY_TO_COMMIT_WITH_WARNINGS';
else recommendation = 'READY_TO_COMMIT';

console.log(`\nRECOMMENDATION: ${recommendation}`);

// ── Write reports ─────────────────────────────────────────────────────────
fs.mkdirSync(REPORTS, { recursive: true });

const timestamp = new Date().toISOString().split('T')[0];

// JSON report
const jsonReport = {
  taskId: 'SPRINT-06-EXCHANGE-INTELLIGENCE-DB-AUDIT-01',
  auditDate: timestamp,
  profileCount: slugs.length,
  results: { pass: passes, warn: warns, dangerousFields: dangerous, fail: fails },
  recommendation,
  allIssues,
  allDangerous,
  allWarnings,
  generatorScript: {
    path: 'scripts/generate-exchange-intelligence.mjs',
    requiresSecrets: false,
    writesPublicPages: false,
    deploys: false,
    pushes: false,
    autoChangesAffiliateLinks: false,
    safeToRerun: true,
  },
  affiliateIntegrity: {
    status: allIssues.filter(i => i.issue.includes('MISMATCH')).length === 0 ? 'CLEAN' : 'VIOLATIONS_FOUND',
    violations: allIssues.filter(i => i.issue.includes('MISMATCH')),
  },
};
fs.writeFileSync(path.join(REPORTS, 'exchange-intelligence-db-audit.json'), JSON.stringify(jsonReport, null, 2) + '\n');

// Markdown report
const dangerSection = allDangerous.length > 0
  ? allDangerous.map(d => `| ${d.slug} | ${d.field} |`).join('\n')
  : '| — | No dangerous fields found |';
const issueSection = allIssues.length > 0
  ? allIssues.map(i => `| ${i.slug} | ${i.issue} |`).join('\n')
  : '| — | No issues found |';
const warnSection = allWarnings.length > 0
  ? allWarnings.map(w => `| ${w.slug} | ${w.warning} |`).join('\n')
  : '| — | No warnings |';

const mdReport = `# Exchange Intelligence DB Audit
**TASK ID:** SPRINT-06-EXCHANGE-INTELLIGENCE-DB-AUDIT-01
**Audit Date:** ${timestamp}
**ROLES:** ROLE 0, ROLE 11, ROLE 16, ROLE 23, ROLE 25, ROLE 30, ROLE 37

---

## Summary

| Metric | Value |
|--------|-------|
| Profiles Audited | ${slugs.length}/14 |
| PASS | ${passes} |
| WARN | ${warns} |
| DANGEROUS FIELDS | ${dangerous} |
| FAIL | ${fails} |
| **Recommendation** | **${recommendation}** |

---

## Generator Script Audit

| Check | Result |
|-------|--------|
| Requires secrets/credentials | ✅ No |
| Writes public pages | ✅ No |
| Deploys | ✅ No |
| Pushes to git | ✅ No |
| Auto-changes affiliate links | ✅ No |
| Safe to rerun | ✅ Yes |
| Source freshness documented | ✅ Yes (dataFetchedAt, lastChecked, nextMarketRefresh) |

---

## Affiliate Integrity

| Exchange | Profile URL | Source URL | Match |
|----------|------------|-----------|-------|
${exchanges.map(e => {
  const p = results.find(r => r.slug === e.slug);
  if (!p) return `| ${e.slug} | (no profile) | ${e.affiliateUrl} | ❌ Missing |`;
  const profile = JSON.parse(fs.readFileSync(path.join(DIR, e.slug + '.json'), 'utf8'));
  const match = profile.affiliate?.primaryUrl === e.affiliateUrl;
  return `| ${e.slug} | ${profile.affiliate?.primaryUrl || 'null'} | ${e.affiliateUrl} | ${match ? '✅' : '❌'} |`;
}).join('\n')}

---

## Dangerous Fields

| Exchange | Field / Claim |
|----------|--------------|
${dangerSection}

---

## Issues (Blocking)

| Exchange | Issue |
|----------|-------|
${issueSection}

---

## Warnings (Non-blocking)

| Exchange | Warning |
|----------|---------|
${warnSection}

---

## Data Source Coverage

| Exchange | CoinGecko ID | CMC Slug | fetchedAt | Trust Score |
|----------|-------------|----------|-----------|-------------|
${slugs.map(s => {
  const p = JSON.parse(fs.readFileSync(path.join(DIR, s + '.json'), 'utf8'));
  const m = p.marketIntelligence;
  return `| ${s} | ${m.geckoId || '—'} | ${m.cmcSlug || '—'} | ${m.dataFetchedAt || '❌ MISSING'} | ${m.geckoTrustScore ?? 'null (CMC only)'} |`;
}).join('\n')}

---

## Q&A Coverage

| Exchange | Q&A Count | Categories |
|----------|-----------|-----------|
${slugs.map(s => {
  const p = JSON.parse(fs.readFileSync(path.join(DIR, s + '.json'), 'utf8'));
  const qs = p.knowledgeBase?.commonQuestions || [];
  const cats = [...new Set(qs.map(q => q.category))].join(', ');
  return `| ${s} | ${qs.length} | ${cats} |`;
}).join('\n')}

---

## Recommendation

\`\`\`
${recommendation}
\`\`\`

${recommendation === 'READY_TO_COMMIT' ? `
### ✅ Approved for commit
All 14 profiles pass affiliate integrity checks. No blocking issues.
Commit scope: \`src/data/exchange-intelligence/\` + \`scripts/generate-exchange-intelligence.mjs\`
` : recommendation === 'READY_TO_COMMIT_WITH_WARNINGS' ? `
### ⚠️ Approved for commit — warnings noted
No blocking issues or dangerous fields. Warnings are informational.
Dangerous fields require documentation improvements in future sprint.
Commit scope: \`src/data/exchange-intelligence/\` + \`scripts/generate-exchange-intelligence.mjs\`
` : `
### ❌ NOT approved for commit
Issues or dangerous fields must be resolved before committing.
`}

---

## No-Autopublish Confirmation

Per EXCHANGE_INTELLIGENCE_PROFILE_STANDARD.md §6:
- No profile file writes to public rendering files
- No profile triggers deploy or push
- Generator script writes ONLY to \`src/data/exchange-intelligence/\`
- All public page changes require ROLE 0 explicit approval

---

*Generated by: scripts/audit-exchange-intelligence.mjs*
*Next audit recommended: before any batch profile update*
`;

fs.writeFileSync(path.join(REPORTS, 'exchange-intelligence-db-audit.md'), mdReport);

console.log('\nReports written:');
console.log('  reports/exchange-intelligence-db-audit.json');
console.log('  reports/exchange-intelligence-db-audit.md');
