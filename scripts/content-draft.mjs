#!/usr/bin/env node
/**
 * content-draft.mjs — AI Draft Prompt Generator
 *
 * Generates a structured prompt for an AI content writer to draft or improve
 * the editorial content for a specific exchange. Output is a plain-text
 * prompt ready to paste into an AI assistant.
 *
 * Usage:
 *   node scripts/content-draft.mjs --slug bybit
 *   node scripts/content-draft.mjs --slug mexc --field editorNote
 *   node scripts/content-draft.mjs --slug okx --field longDescription
 *   node scripts/content-draft.mjs --all  (generate prompts for all exchanges)
 *
 * Output fields:
 *   longDescription — 200–350 char SEO description
 *   editorNote      — 100–220 char editorial verdict ("Our Take")
 *   both            — generate both (default)
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

const exchanges = JSON.parse(
  readFileSync(join(ROOT, 'src/data/exchanges.json'), 'utf8')
);

const slugArg  = process.argv[process.argv.indexOf('--slug') + 1] ?? null;
const fieldArg = process.argv[process.argv.indexOf('--field') + 1] ?? 'both';
const allMode  = process.argv.includes('--all');

if (!slugArg && !allMode) {
  console.error('Usage: node scripts/content-draft.mjs --slug <slug>');
  console.error('       node scripts/content-draft.mjs --all');
  process.exit(1);
}

const targets = allMode
  ? exchanges
  : exchanges.filter(e => e.slug === slugArg);

if (targets.length === 0) {
  console.error(`Exchange not found: ${slugArg}`);
  process.exit(1);
}

function formatDeposit(md) {
  if (!md) return 'No deposit required';
  if (md.amount === 0) return 'No deposit required';
  return `${md.amount.toLocaleString()} ${md.currency}`;
}

function generatePrompt(ex, field = 'both') {
  const kycLine = ex.kycRequired ? 'KYC required' : 'No KYC required';
  const depositLine = formatDeposit(ex.minDeposit);
  const expiryLine = ex.bonusExpiry
    ? `Bonus expires ${ex.bonusExpiry.days} days after registration`
    : 'Bonus expiry: check official terms';

  const context = `## Exchange Data
- Name: ${ex.name}
- Slug: ${ex.slug}
- Bonus: Up to ${ex.bonusAmount.toLocaleString()} ${ex.bonusCurrency}
- Bonus types: ${ex.bonusTypes.join(', ')}
- ${kycLine}
- Min deposit: ${depositLine}
- ${expiryLine}
- Countries: ${ex.countries.includes('global') ? 'Global' : ex.countries.join(', ')}
- Excluded: ${ex.excludedCountries.length > 0 ? ex.excludedCountries.join(', ') : 'None listed'}
${ex.founded ? `- Founded: ${ex.founded}` : ''}
${ex.headquarters ? `- Headquarters: ${ex.headquarters}` : ''}
${ex.users ? `- Users: ${ex.users}` : ''}
${ex.licences?.length > 0 ? `- Licences: ${ex.licences.join(', ')}` : '- Licences: None listed'}
${ex.bestFor?.length > 0 ? `- Best for: ${ex.bestFor.join(', ')}` : ''}
${ex.rating ? `- Editorial rating: ${ex.rating}/10` : ''}`;

  const currentContent = `## Current Content
- shortDescription (${(ex.shortDescription ?? '').length} chars): "${ex.shortDescription ?? ''}"
- editorNote (${(ex.editorNote ?? '').length} chars): "${ex.editorNote ?? '(empty)'}"
- longDescription (${(ex.longDescription ?? '').length} chars): "${(ex.longDescription ?? '').slice(0, 120)}${(ex.longDescription ?? '').length > 120 ? '...' : ''}"`;

  let outputSpec = '';

  if (field === 'longDescription' || field === 'both') {
    outputSpec += `
### longDescription (200–350 characters)
Write a factual, SEO-friendly description of this exchange's bonus offer and key differentiator.
- Start with the exchange name
- Include bonus amount and what makes it stand out
- Mention who benefits most (based on bestFor tags)
- Tone: Informative, direct, no superlatives ("best", "number 1")
- Length: 200–350 characters EXACTLY
- No markdown, no line breaks — single paragraph`;
  }

  if (field === 'editorNote' || field === 'both') {
    outputSpec += `
### editorNote (100–220 characters)
Write a concise, honest editorial verdict from our review team.
- This is the "Our Take" section — it should feel like a human wrote it
- Focus on: key trade-off, standout feature, or who should/shouldn't use this exchange
- Tone: Conversational, direct, no hype. Can be slightly opinionated.
- Must NOT start with "Our take:" — just write the verdict directly
- Length: 100–220 characters EXACTLY
- No markdown, no line breaks`;
  }

  if (field === 'both') {
    outputSpec += `

## Output Format
Return ONLY valid JSON, no explanation:
{
  "longDescription": "...",
  "editorNote": "..."
}`;
  } else {
    outputSpec += `

## Output Format
Return ONLY valid JSON, no explanation:
{
  "${field}": "..."
}`;
  }

  return `You are a senior crypto affiliate content writer with deep SEO knowledge.
Write editorial content for this crypto exchange listing page.

CRITICAL RULES:
1. Be factual — do not invent features or claim things not in the data
2. No superlatives: never use "best", "#1", "leading", "top" without qualification
3. Mention trade-offs honestly — e.g. high bonus but requires volume
4. Write for crypto traders, not beginners — assume financial literacy
5. No emoji in output

${context}

${currentContent}

## Your Task
${outputSpec}`;
}

// ── Output ─────────────────────────────────────────────────────────────────────

if (allMode) {
  // Write all prompts to a file
  const out = targets.map(ex => ({
    slug: ex.slug,
    name: ex.name,
    prompt: generatePrompt(ex, fieldArg),
  }));

  const outPath = join(ROOT, 'scripts', '_draft-prompts.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Generated ${out.length} draft prompts → scripts/_draft-prompts.json`);
} else {
  // Print single prompt to stdout
  const prompt = generatePrompt(targets[0], fieldArg);
  process.stdout.write('\n' + prompt + '\n\n');
  console.error(`\n[Tip] Copy the prompt above into your AI assistant.`);
  console.error(`[Tip] Paste the JSON result into src/data/exchanges.json for slug: ${targets[0].slug}`);
}
