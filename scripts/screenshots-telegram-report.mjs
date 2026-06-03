#!/usr/bin/env node
/**
 * screenshots-telegram-report.mjs — Send Screenshot Status to Telegram
 * ─────────────────────────────────────────────────────────────────────
 * Reads reports/screenshot-approval-queue.json and quality report,
 * then sends a concise Telegram summary.
 *
 * Usage:
 *   npm run screenshots:telegram-report -- --dry-run   # Print, don't send
 *   npm run screenshots:telegram-report -- --send      # Send to Telegram
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sendTelegramMessage, formatStatusEmoji } from './lib/telegram.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const ARGV    = process.argv.slice(2);
const flag    = (n) => ARGV.includes(n);
const DRY_RUN = !flag('--send');

// ── Load data ─────────────────────────────────────────────────────────────────

function loadQueue() {
  const p = join(ROOT, 'reports', 'screenshot-approval-queue.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

function loadQualityReport() {
  const p = join(ROOT, 'reports', 'screenshot-quality-report.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

function loadAuditReport() {
  const p = join(ROOT, 'reports', 'screenshot-audit.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

// ── Format message ────────────────────────────────────────────────────────────

function buildScreenshotReportMessage(queue, quality, audit, date) {
  const lines = [
    `📸 <b>CryptoBonusWorld — Screenshot Report</b>`,
    `<i>${date}</i>`,
    '',
  ];

  if (!queue && !quality && !audit) {
    lines.push(
      `ℹ️ No screenshot reports found.`,
      `Run <code>npm run screenshots:quality:write</code> to generate.`,
    );
  } else {
    // Approval queue
    if (queue) {
      const { summary, items = [], exchange } = queue;
      lines.push(`<b>Approval Queue</b> (${exchange ?? 'all exchanges'})`);
      lines.push(`Total: ${summary.total ?? items.length}`);
      if ((summary.pending ?? 0) > 0) lines.push(`⏳ Pending approval: ${summary.pending}`);
      if ((summary.failed  ?? 0) > 0) lines.push(`❌ Failed: ${summary.failed}`);
      if ((summary.skipped ?? 0) > 0) lines.push(`— Skipped: ${summary.skipped}`);
      if ((summary.safety  ?? 0) > 0) lines.push(`🛡 Safety blocked: ${summary.safety}`);

      // Affiliate captures with ref-tracking data
      const affiliateItems = items.filter(i => i.affiliateCapture);
      if (affiliateItems.length > 0) {
        lines.push('', '<b>Affiliate captures:</b>');
        for (const item of affiliateItems) {
          const ref   = item.paramSurvived    ? '✅' : '❌';
          const promo = item.promoCodeVisible  ? '✅' : '❓';
          const bonus = item.bonusAmountVisible ? '✅' : '❓';
          lines.push(`${formatStatusEmoji(item.status)} <b>${item.exchange}/${item.category}</b>`);
          lines.push(`   Ref param: ${ref}  Promo visible: ${promo}  Bonus visible: ${bonus}`);
          if (item.finalUrl) lines.push(`   URL: <code>${item.finalUrl.slice(0, 80)}</code>`);
        }
      }
      lines.push('');
    }

    // Quality report
    if (quality) {
      const { summary: qs } = quality;
      const allOk = (qs?.failed ?? 0) === 0;
      lines.push(
        `<b>Quality Check</b>`,
        allOk ? `✅ All ${qs?.checked ?? '?'} screenshots passed` : `⚠️ ${qs?.failed} of ${qs?.checked} failed`,
      );
      if ((qs?.recommended ?? 0) > 0) lines.push(`⭐ Recommended for approval: ${qs.recommended}`);
      lines.push('');
    }

    // Audit report
    if (audit) {
      const { summary: as } = audit;
      lines.push(
        `<b>Screenshot Audit</b>`,
        `Missing: ${as?.missing ?? 0}  Outdated: ${as?.outdated ?? 0}  Present: ${as?.present ?? 0}`,
      );
      lines.push('');
    }
  }

  lines.push(
    `📄 <b>Next steps:</b>`,
    `<code>npm run screenshots:approve -- --list</code>`,
    `<code>npm run screenshots:review</code>`,
    '',
    `<i>Generated: ${date}</i>`,
  );

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const date    = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const queue   = loadQueue();
  const quality = loadQualityReport();
  const audit   = loadAuditReport();
  const message = buildScreenshotReportMessage(queue, quality, audit, date);

  if (DRY_RUN) {
    console.log('\n[Telegram dry-run — pass --send to actually send]\n' + '─'.repeat(60));
    console.log(message.replace(/<[^>]+>/g, ''));
    console.log('─'.repeat(60) + '\n');
    return;
  }

  try {
    await sendTelegramMessage(message, { dryRun: false });
    console.log('  ✅ Screenshot report sent to Telegram');
  } catch (e) {
    console.error('  ✖ Telegram send failed:', e.message);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('  ✖', e.message);
  process.exit(1);
});
