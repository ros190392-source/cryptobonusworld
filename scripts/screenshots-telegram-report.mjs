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

function loadRefreshQueue() {
  const p = join(ROOT, 'reports', 'screenshot-refresh-queue.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

function buildScreenshotReportMessage(queue, quality, audit, date) {
  // Compute overall severity
  const pending  = queue?.summary?.pending  ?? 0;
  const failed   = queue?.summary?.failed   ?? 0;
  const missing  = audit?.summary?.missing  ?? 0;
  const outdated = audit?.summary?.outdated ?? 0;
  const qFailed  = quality ? ((quality.summary?.failed ?? 0)) : 0;
  const issueCount = failed + qFailed;

  const severityLevel = (failed > 0 || qFailed > 0)   ? 'CRITICAL'
                      : (missing > 0 || outdated > 0)  ? 'WARNING'
                      : pending > 0                    ? 'INFO'
                      : 'OK';
  const severityLine  = severityLevel === 'CRITICAL' ? '🚨 CRITICAL'
                      : severityLevel === 'WARNING'   ? '⚠️ WARNING'
                      : severityLevel === 'INFO'      ? 'ℹ️ INFO'
                      : '✅ OK';

  const checkedCount = quality?.summary?.checked ?? audit?.summary?.total ?? queue?.summary?.total ?? 0;

  const lines = [
    `📸 <b>Screenshots</b>`,
    `${severityLine}  |  ${date}`,
    '',
    `Checked: <b>${checkedCount}</b>  |  Issues: ${issueCount}`,
  ];

  if (!queue && !quality && !audit) {
    lines.push(`ℹ️ No screenshot reports found yet.`);
  } else {
    // Approval queue summary
    if (queue) {
      const { summary, items = [] } = queue;
      if (pending > 0)              lines.push(`⏳ Pending approval: ${pending}`);
      if (failed > 0)               lines.push(`❌ Failed: ${failed}`);
      if ((summary?.skipped ?? 0) > 0) lines.push(`— Skipped: ${summary.skipped}`);
      if ((summary?.safety  ?? 0) > 0) lines.push(`🛡 Safety blocked: ${summary.safety}`);

      // Top 3 affiliate capture actions
      const affiliateItems = items.filter(i => i.affiliateCapture);
      if (affiliateItems.length > 0) {
        lines.push('', '<b>Top actions (affiliate):</b>');
        for (const item of affiliateItems.slice(0, 3)) {
          const ref   = item.paramSurvived     ? '✅' : '❌';
          const promo = item.promoCodeVisible  ? '✅' : '❓';
          const bonus = item.bonusAmountVisible ? '✅' : '❓';
          lines.push(`${formatStatusEmoji(item.status)} <b>${item.exchange}</b> — ref:${ref} promo:${promo} bonus:${bonus}`);
        }
        if (affiliateItems.length > 3) lines.push(`   … and ${affiliateItems.length - 3} more`);
      }
    }

    // Quality report
    if (quality) {
      const qs = quality.summary;
      const allOk = (qs?.failed ?? 0) === 0;
      lines.push(
        '',
        `<b>Quality:</b> ${allOk
          ? `✅ All ${qs?.checked ?? '?'} passed`
          : `🚨 ${qs?.failed}/${qs?.checked} failed`}`,
      );
    }

    // Audit report
    if (audit) {
      const as = audit.summary;
      lines.push(`<b>Audit:</b> missing ${as?.missing ?? 0}  outdated ${as?.outdated ?? 0}  present ${as?.present ?? 0}`);
    }
  }

  // Refresh queue (from evidence-snapshot system)
  const refreshQueue = loadRefreshQueue();
  const pendingRefresh = refreshQueue?.items?.filter(i => i.status === 'pending_approval') ?? [];
  if (pendingRefresh.length > 0) {
    lines.push('', `<b>Refresh queue (${pendingRefresh.length} pending):</b>`);
    for (const item of pendingRefresh.slice(0, 3)) {
      lines.push(`🔄 <b>${item.exchange}</b>/${item.region} — ${item.reason}`);
    }
    if (pendingRefresh.length > 3) lines.push(`   … and ${pendingRefresh.length - 3} more`);
  }

  lines.push(
    '',
    `📄 <code>reports/screenshot-approval-queue.md</code>`,
    `<i>${date}</i>`,
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
