#!/usr/bin/env node
/**
 * affiliate-telegram-report.mjs — Send Affiliate Link Audit Summary to Telegram
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs the affiliate audit (or reads existing JSON), then sends a concise
 * Telegram summary covering link health, ref-code survival, and stale entries.
 *
 * Usage:
 *   npm run affiliate:telegram-report -- --dry-run   # Print, don't send
 *   npm run affiliate:telegram-report -- --send      # Send to Telegram
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { sendTelegramMessage } from './lib/telegram.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const ARGV    = process.argv.slice(2);
const flag    = (n) => ARGV.includes(n);
const DRY_RUN = !flag('--send');
const VERBOSE = flag('--verbose');

// ── Load / generate audit data ────────────────────────────────────────────────

function loadOrRunAudit() {
  // Run audit in JSON mode and capture output
  try {
    const result = execSync('node scripts/audit-affiliate-links.mjs --json', {
      cwd: ROOT,
      timeout: 30000,
      encoding: 'utf-8',
    });
    return JSON.parse(result);
  } catch (e) {
    // If audit script fails, try to read existing affiliate snapshot for basic data
    if (VERBOSE) console.warn('Audit script failed:', e.message);
    return null;
  }
}

function loadAffiliateSnapshot() {
  // Load the runtime snapshot for basic data
  try {
    const snapshotPath = join(ROOT, 'scripts', 'lib', 'affiliate-snapshot.mjs');
    // Just read the file and extract exchange count
    const src = readFileSync(snapshotPath, 'utf-8');
    const slugs = [...src.matchAll(/^\s+(\w[\w-]*):\s*\{/gm)].map(m => m[1]);
    return slugs.filter(s => !['AFFILIATE_SNAPSHOT'].includes(s));
  } catch { return []; }
}

// ── Format message ────────────────────────────────────────────────────────────

function buildAffiliateReportMessage(auditData, date) {
  const lines = [
    `🔗 <b>CryptoBonusWorld — Affiliate Link Report</b>`,
    `<i>${date}</i>`,
    '',
  ];

  if (!auditData) {
    const slugs = loadAffiliateSnapshot();
    lines.push(
      `ℹ️ Audit data not available — affiliate-snapshot loaded`,
      `Tracked exchanges: ${slugs.length}`,
      '',
      `Run <code>npm run affiliate:audit</code> for full details.`,
    );
  } else {
    const { summary, issues = [], exchanges = [] } = auditData;

    const severity = (summary?.errors ?? 0) > 0 ? '🚨 CRITICAL'
                   : (summary?.warnings ?? 0) > 0 ? '⚠️ WARNING'
                   : '✅ OK';
    lines.push(severity, '');

    if (summary) {
      lines.push(
        `<b>Summary</b>`,
        `Total exchanges: ${summary.total ?? '—'}`,
        summary.errors   > 0 ? `🚨 Errors: ${summary.errors}`   : null,
        summary.warnings > 0 ? `⚠️ Warnings: ${summary.warnings}` : null,
        summary.ok       > 0 ? `✅ OK: ${summary.ok}` : null,
      ).filter(Boolean);
    }

    const criticalIssues = issues.filter(i => i.severity === 'error' || i.level === 'error');
    if (criticalIssues.length > 0) {
      lines.push('', '<b>Issues:</b>');
      for (const issue of criticalIssues.slice(0, 5)) {
        const ex  = issue.exchange ?? issue.slug ?? '?';
        const msg = issue.message ?? issue.description ?? JSON.stringify(issue);
        lines.push(`🚨 <b>${ex}</b>: ${String(msg).slice(0, 120)}`);
      }
      if (criticalIssues.length > 5) {
        lines.push(`… and ${criticalIssues.length - 5} more`);
      }
    }
  }

  lines.push(
    '',
    `📄 <b>Full audit:</b>`,
    `<code>npm run affiliate:audit</code>`,
    `<code>reports/affiliate-link-inventory.md</code>`,
    '',
    `<i>Generated: ${date}</i>`,
  );

  return lines.filter(l => l !== null).join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const date     = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const audit    = loadOrRunAudit();
  const message  = buildAffiliateReportMessage(audit, date);

  if (DRY_RUN) {
    console.log('\n[Telegram dry-run — pass --send to actually send]\n' + '─'.repeat(60));
    console.log(message.replace(/<[^>]+>/g, ''));
    console.log('─'.repeat(60) + '\n');
    return;
  }

  try {
    await sendTelegramMessage(message, { dryRun: false });
    console.log('  ✅ Affiliate report sent to Telegram');
  } catch (e) {
    console.error('  ✖ Telegram send failed:', e.message);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('  ✖', e.message);
  process.exit(1);
});
