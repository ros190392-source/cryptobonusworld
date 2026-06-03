#!/usr/bin/env node
/**
 * Content Brief Generator
 * Generates a comprehensive markdown content brief for a given exchange + blueprint type.
 * Usage: node scripts/generate-content-brief.mjs --type exchange_review --exchange binance
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- Parse CLI args ---
const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}
const blueprintType = getArg('--type') || 'exchange_review';
const exchange = getArg('--exchange') || 'binance';
const exchangeLabel = exchange.charAt(0).toUpperCase() + exchange.slice(1).replace(/-/g, ' ');

// --- Inline blueprint quick-ref (exchange_review only) ---
// Avoids TS-stripping complexity. Matches article-blueprints.ts.
const EXCHANGE_REVIEW_BLUEPRINT = {
  type: 'exchange_review',
  label: 'Exchange Review',
  requiredSections: [
    { id: 'executive_summary', label: 'Executive Summary', minWords: 50, maxWords: 150, notes: '1-3 sentences: direct answer for AI extraction' },
    { id: 'key_facts_table', label: 'Key Facts', minWords: null, maxWords: null, notes: 'Structured table: founded, HQ, regulation, users, withdrawal limits, supported countries count' },
    { id: 'bonus_verified_block', label: 'Welcome Bonus', minWords: null, maxWords: null, notes: 'Verified bonus amount, promo code, expiry, evidence link with capture date' },
    { id: 'best_for', label: 'Who Is This Exchange Best For?', minWords: 80, maxWords: 200, notes: '2–4 bullet personas with use case match. No vague claims' },
    { id: 'safety_regulation', label: 'Safety & Regulation', minWords: 150, maxWords: 400, notes: 'Regulatory status, licenses, proof of reserves, insurance, security history' },
    { id: 'fees', label: 'Fees', minWords: 150, maxWords: 350, notes: 'Maker/taker table, withdrawal fees, deposit fees. Comparison with 1–2 competitors' },
    { id: 'kyc_limits', label: 'KYC & Account Limits', minWords: 100, maxWords: 300, notes: 'KYC tiers, withdrawal limits per tier, document requirements, verification time' },
    { id: 'supported_countries', label: 'Supported Countries', minWords: 100, maxWords: 250, notes: 'Available countries, restricted countries, US/EU/UK status, VPN policy' },
    { id: 'interface_walkthrough', label: 'Interface & Screenshots', minWords: null, maxWords: null, notes: 'Screenshot walkthrough: registration flow, main dashboard, bonus/promotions page' },
    { id: 'pros_cons', label: 'Pros & Cons', minWords: null, maxWords: null, notes: "2-column table: min 3 pros, min 3 cons. No vague entries like 'good UI'" },
    { id: 'alternatives', label: 'Alternatives to Consider', minWords: 150, maxWords: 300, notes: "2–4 competitor cards: who it's better/worse than and why. With internal links" },
    { id: 'methodology', label: 'How We Review Exchanges', minWords: 100, maxWords: 250, notes: 'How we verify bonuses, test affiliate links, take screenshots, update cadence' },
    { id: 'faq', label: 'Frequently Asked Questions', minWords: null, maxWords: null, notes: 'FAQ block with FAQPage schema. Min 5 exchange-specific questions' },
    { id: 'evidence_sources', label: 'Evidence & Last Verified', minWords: null, maxWords: null, notes: 'Last verified date, evidence panel links, reviewer name, screenshot hashes' },
  ],
  ctaRules: [
    { placement: 'after_summary', buttonText: 'Get Bonus →', required: true },
    { placement: 'after_bonus_block', buttonText: 'Claim Bonus', required: true },
    { placement: 'after_pros_cons', buttonText: 'Open Account', required: false },
    { placement: 'end_of_review', buttonText: 'Visit Exchange', required: true },
  ],
  screenshotRequirements: [
    { category: 'registration', required: true, fallback: 'placeholder' },
    { category: 'bonus', required: true, fallback: 'placeholder' },
    { category: 'fees', required: true, fallback: 'placeholder' },
    { category: 'kyc', required: false, fallback: 'skip' },
    { category: 'mobile_app', required: false, fallback: 'skip' },
  ],
  schemaRequirements: [
    { schemaType: 'Review', required: true },
    { schemaType: 'FAQPage', required: true },
    { schemaType: 'BreadcrumbList', required: true },
    { schemaType: 'Article', required: false },
  ],
  internalLinkTargets: [
    { targetType: 'comparison_page', description: `link to a ${exchange} vs. competitor page`, required: true },
    { targetType: 'methodology', description: 'link to methodology page', required: true },
    { targetType: 'category_page', description: 'link to relevant category', required: false, label: 'Category page (recommended)' },
    { targetType: 'country_page', description: 'if applicable', required: false },
  ],
  faqQuestions: [
    `What is the ${exchangeLabel} welcome bonus for new users?`,
    `Is ${exchangeLabel} available in [country]? (cover US/EU/UK status)`,
    `Does ${exchangeLabel} require KYC verification?`,
    `What are ${exchangeLabel} maker and taker fees?`,
    `How do I claim the ${exchangeLabel} referral bonus?`,
    `Is ${exchangeLabel} safe? What security measures does it have?`,
    `What is the ${exchangeLabel} withdrawal limit without KYC?`,
  ],
  aiSearchRules: [
    { rule: 'Direct answer block in executive_summary', enforcement: 'required' },
    { rule: 'Entity-rich headings (include exchange name + topic)', enforcement: 'required' },
    { rule: 'Source-backed claims with evidence links', enforcement: 'required' },
    { rule: 'Comparison-ready facts in structured tables', enforcement: 'required' },
    { rule: 'No unsupported superlatives without [verified] marker', enforcement: 'required' },
    { rule: "Use 'Best for: X' bullet format in executive summary and best_for section", enforcement: 'required' },
    { rule: "Show 'Last verified: {date}' near top and in evidence_sources", enforcement: 'required' },
    { rule: 'Max 3 sentences per paragraph for AI snippet extraction', enforcement: 'recommended' },
    { rule: 'Every section with 3+ comparable facts must offer table OR structured list', enforcement: 'recommended' },
    { rule: 'Page content must match schema markup values (same bonus amount, same dates)', enforcement: 'required' },
  ],
  freshness: {
    maxAgeDays: 90,
    showLastVerifiedBlock: true,
    evidencePanelRequired: true,
    autoRefreshSections: ['bonus_verified_block', 'key_facts_table'],
  },
};

// Fallback generic blueprint for other types
function getGenericBlueprint(type) {
  return {
    type,
    label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    requiredSections: [],
    ctaRules: [],
    screenshotRequirements: [],
    schemaRequirements: [],
    internalLinkTargets: [],
    faqQuestions: [],
    aiSearchRules: [],
    freshness: { maxAgeDays: 60, showLastVerifiedBlock: true, evidencePanelRequired: false, autoRefreshSections: [] },
  };
}

function getBlueprint(type) {
  if (type === 'exchange_review') return EXCHANGE_REVIEW_BLUEPRINT;
  return getGenericBlueprint(type);
}

// --- Load evidence JSON ---
function loadEvidence(exchangeSlug) {
  const evidencePath = path.join(ROOT, 'src', 'data', 'evidence', `${exchangeSlug}.json`);
  if (!fs.existsSync(evidencePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  } catch {
    return null;
  }
}

// --- Format evidence summary ---
function formatEvidenceSummary(evidence, exchangeSlug) {
  if (!evidence) {
    return `*(No evidence file found at src/data/evidence/${exchangeSlug}.json)*\n`;
  }

  const lines = [];
  lines.push(`**Exchange:** ${evidence.exchange || exchangeSlug}`);
  lines.push(`**Evidence last updated:** ${evidence.updatedAt || 'unknown'}`);
  lines.push('');

  // Key facts from evidence
  if (evidence.facts && evidence.facts.length > 0) {
    lines.push('### Key Facts');
    lines.push('| Field | Value | Last Checked | Status |');
    lines.push('|---|---|---|---|');
    for (const fact of evidence.facts.slice(0, 12)) {
      const val = fact.unit ? `${fact.currentValue} ${fact.unit}` : String(fact.currentValue);
      lines.push(`| ${fact.field} | ${val} | ${fact.lastChecked || '-'} | ${fact.conflictStatus || '-'} |`);
    }
    lines.push('');
  }

  // Sources
  if (evidence.sources) {
    lines.push('### Source URLs');
    for (const [key, src] of Object.entries(evidence.sources)) {
      if (src && typeof src === 'object' && src.url) {
        lines.push(`- **${key}**: [${src.label || src.url}](${src.url}) _(last accessed: ${src.lastAccessed || 'unknown'})_`);
        if (src.notes) lines.push(`  > ${src.notes}`);
      }
    }
    lines.push('');
  }

  // Screenshots
  if (evidence.screenshots && evidence.screenshots.length > 0) {
    lines.push('### Available Screenshots');
    lines.push('| Category | Status | Captured |');
    lines.push('|---|---|---|');
    for (const ss of evidence.screenshots.slice(0, 10)) {
      lines.push(`| ${ss.category || ss.type || '-'} | ${ss.status || '-'} | ${ss.capturedAt || ss.lastCaptured || '-'} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// --- Generate brief ---
function generateBrief(blueprintType, exchangeSlug) {
  const blueprint = getBlueprint(blueprintType);
  const evidence = loadEvidence(exchangeSlug);
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const month = new Date().toLocaleString('en', { month: 'long' });

  const lines = [];

  lines.push(`# Content Brief: ${exchangeLabel} Exchange Review`);
  lines.push(`**Generated:** ${today}`);
  lines.push(`**Blueprint:** ${blueprintType}`);
  lines.push(`**Exchange:** ${exchangeSlug}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Title options
  lines.push('## Title Options');
  lines.push(`1. ${exchangeLabel} Review ${year}: Verified Bonus, Fees & Full Analysis`);
  lines.push(`2. Is ${exchangeLabel} Safe? Honest Review with Evidence (${year})`);
  lines.push(`3. ${exchangeLabel} Exchange: Pros, Cons & Verified Verdict`);
  lines.push('');

  // H1
  lines.push('## H1');
  lines.push(`${exchangeLabel} Review ${year} — Verified Bonus, Fees & Full Analysis`);
  lines.push('');

  // Meta title
  lines.push('## Meta Title _(60 chars max)_');
  lines.push(`${exchangeLabel} Review ${year} | Verified Bonus + Fees`);
  lines.push('');

  // Meta description
  const bonusFact = evidence?.facts?.find(f => f.field === 'bonus_amount');
  const bonusVal = bonusFact ? `Up to ${bonusFact.currentValue} ${bonusFact.unit || 'USDT'}` : 'Welcome bonus available';
  lines.push('## Meta Description _(155 chars max)_');
  lines.push(`Verified ${exchangeLabel} review: ${bonusVal} welcome bonus. Real screenshots, fee comparison, KYC guide. Updated ${month} ${year}.`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Required sections
  lines.push(`## Required Sections (${blueprint.requiredSections.length})`);
  lines.push('');
  lines.push('| # | ID | Label | Min Words | Max Words | Notes |');
  lines.push('|---|---|---|---|---|---|');
  blueprint.requiredSections.forEach((sec, i) => {
    lines.push(`| ${i + 1} | ${sec.id} | ${sec.label} | ${sec.minWords ?? '-'} | ${sec.maxWords ?? '-'} | ${sec.notes} |`);
  });
  lines.push('');
  lines.push('---');
  lines.push('');

  // Evidence checklist
  lines.push('## Evidence Checklist');
  lines.push('- [ ] Bonus amount verified via live capture');
  lines.push('- [ ] Affiliate link tested — redirect chain confirmed');
  lines.push('- [ ] Promo code tested manually');
  lines.push('- [ ] Screenshot: registration flow');
  lines.push('- [ ] Screenshot: bonus/promotions page');
  lines.push('- [ ] Screenshot: fees page');
  lines.push('- [ ] Official source linked: fee schedule');
  lines.push('- [ ] Official source linked: terms of service');
  lines.push('- [ ] Regulatory status checked');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Screenshot checklist
  lines.push('## Screenshot Checklist');
  for (const ss of blueprint.screenshotRequirements) {
    const req = ss.required ? '(required)' : '(optional)';
    lines.push(`- [ ] ${ss.category} ${req} — fallback: ${ss.fallback}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Internal links
  lines.push('## Internal Links Required');
  for (const link of blueprint.internalLinkTargets) {
    const req = link.required ? '(required)' : '(optional)';
    const label = link.label || link.targetType.replace(/_/g, ' ');
    lines.push(`- [ ] ${label.charAt(0).toUpperCase() + label.slice(1)} ${req} — ${link.description}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Schema requirements
  lines.push('## Schema Requirements');
  for (const schema of blueprint.schemaRequirements) {
    const check = schema.required ? '[x]' : '[ ]';
    const req = schema.required ? '(required)' : '(optional)';
    lines.push(`- ${check} ${schema.schemaType} ${req}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // FAQ questions
  lines.push(`## FAQ Questions (min 5)`);
  blueprint.faqQuestions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q}`);
  });
  lines.push('');
  lines.push('---');
  lines.push('');

  // CTA placements
  lines.push('## CTA Placements');
  lines.push('| Placement | Button Text | Required |');
  lines.push('|---|---|---|');
  for (const cta of blueprint.ctaRules) {
    lines.push(`| ${cta.placement} | ${cta.buttonText} | ${cta.required ? 'Yes' : 'No'} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Affiliate disclosure
  lines.push('## Affiliate Disclosure');
  lines.push('**Placement:** top AND before_cta (both)');
  lines.push('Required: Yes');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Freshness requirements
  lines.push('## Freshness Requirements');
  lines.push(`- Max age: ${blueprint.freshness.maxAgeDays} days`);
  lines.push(`- Show last-verified block: ${blueprint.freshness.showLastVerifiedBlock ? 'Yes' : 'No'}`);
  lines.push(`- Evidence panel required: ${blueprint.freshness.evidencePanelRequired ? 'Yes' : 'No'}`);
  if (blueprint.freshness.autoRefreshSections.length > 0) {
    lines.push(`- Auto-refresh sections: ${blueprint.freshness.autoRefreshSections.join(', ')}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Risk disclaimer
  lines.push('## Risk Disclaimer');
  lines.push('Required: Yes');
  lines.push('Placement: near affiliate disclosure or footer');
  lines.push('');
  lines.push('---');
  lines.push('');

  // AI search rules
  lines.push('## AI Search Rules');
  lines.push('| Rule | Enforcement |');
  lines.push('|---|---|');
  for (const rule of blueprint.aiSearchRules) {
    lines.push(`| ${rule.rule} | ${rule.enforcement} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Exchange evidence summary
  lines.push('## Exchange Evidence Summary');
  lines.push(`*(from src/data/evidence/${exchangeSlug}.json)*`);
  lines.push('');
  lines.push(formatEvidenceSummary(evidence, exchangeSlug));

  return lines.join('\n');
}

// --- Main ---
function run() {
  console.log(`\n  Content Brief Generator`);
  console.log(`  Exchange: ${exchange}  |  Blueprint: ${blueprintType}`);
  console.log('');

  const brief = generateBrief(blueprintType, exchange);

  const outDir = path.join(ROOT, 'reports', 'content-briefs');
  fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `${exchange}-${blueprintType}.md`);
  fs.writeFileSync(outFile, brief, 'utf8');

  console.log(`  Brief written to: reports/content-briefs/${exchange}-${blueprintType}.md`);
  console.log('');

  process.exit(0);
}

run();
