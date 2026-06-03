/**
 * scripts/lib/telegram.mjs — Shared Telegram Notification Utility
 * ─────────────────────────────────────────────────────────────────
 * Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from process.env.
 * All functions are no-ops in dry-run mode — pass { dryRun: true }.
 */

const TG_API = (token) => `https://api.telegram.org/bot${token}`;

// ── Severity helpers ──────────────────────────────────────────────────────────

export function formatStatusEmoji(status) {
  switch (String(status).toLowerCase()) {
    case 'matched':                    return '✅';
    case 'matched_with_copy_difference': return '✅';
    case 'mismatch':                   return '🚨';
    case 'needs_manual_review':        return '⚠️';
    case 'unknown':                    return '❓';
    case 'ok':                         return '✅';
    case 'warning':                    return '⚠️';
    case 'critical':                   return '🚨';
    case 'info':                       return 'ℹ️';
    case 'passed':                     return '✅';
    case 'failed':                     return '❌';
    case 'skipped':                    return '—';
    case 'pending':                    return '⏳';
    default:                           return 'ℹ️';
  }
}

export function severityEmoji(severity) {
  switch (String(severity).toLowerCase()) {
    case 'critical': return '🚨';
    case 'high':     return '🔴';
    case 'medium':   return '⚠️';
    case 'low':      return '🟡';
    case 'none':     return '✅';
    default:         return 'ℹ️';
  }
}

// ── Core send ─────────────────────────────────────────────────────────────────

/**
 * Send a plain text or HTML message to the configured Telegram chat.
 * @param {string} text  Message text (HTML tags allowed when parseMode='HTML')
 * @param {{chatId?: string, parseMode?: string, disablePreview?: boolean, dryRun?: boolean}} opts
 */
export async function sendTelegramMessage(text, opts = {}) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = opts.chatId ?? process.env.TELEGRAM_CHAT_ID;

  if (!token)  throw new Error('TELEGRAM_BOT_TOKEN not set in environment');
  if (!chatId) throw new Error('TELEGRAM_CHAT_ID not set in environment');

  if (opts.dryRun) {
    console.log('\n[Telegram dry-run] Would send:\n' + '─'.repeat(50));
    console.log(text);
    console.log('─'.repeat(50) + '\n');
    return { ok: true, dryRun: true };
  }

  // Telegram hard-limit: 4096 chars per message
  const chunks = splitMessage(text, 4000);
  const results = [];
  for (const chunk of chunks) {
    const res = await fetch(`${TG_API(token)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: opts.parseMode ?? 'HTML',
        disable_web_page_preview: opts.disablePreview ?? true,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(`Telegram API error: ${data.description} (text preview: "${chunk.slice(0,80)}")`);
    results.push(data);
  }
  return results.length === 1 ? results[0] : results;
}

/**
 * Send a structured report with title, sections (key: string[]) and severity header.
 * Formats as a clean Telegram message.
 *
 * @param {string}  title       Report title
 * @param {Array<{heading: string, lines: string[]}>} sections  Sections to include
 * @param {'OK'|'WARNING'|'CRITICAL'|'INFO'} severity
 * @param {{dryRun?: boolean}} opts
 */
export async function sendTelegramReport(title, sections, severity = 'INFO', opts = {}) {
  const sevEmoji = severity === 'CRITICAL' ? '🚨'
                 : severity === 'WARNING'  ? '⚠️'
                 : severity === 'OK'       ? '✅'
                 : 'ℹ️';

  const lines = [`${sevEmoji} <b>${escHtml(title)}</b>`];

  for (const sec of sections) {
    if (!sec.lines || sec.lines.length === 0) continue;
    if (sec.heading) lines.push(`\n<b>${escHtml(sec.heading)}</b>`);
    for (const line of sec.lines) {
      lines.push(line);
    }
  }

  const text = lines.join('\n');
  return sendTelegramMessage(text, opts);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let pos = 0;
  while (pos < text.length) {
    // Try to split at newline boundary within maxLen
    let end = pos + maxLen;
    if (end < text.length) {
      const nl = text.lastIndexOf('\n', end);
      if (nl > pos + 200) end = nl; // only split at newline if not tiny chunk
    }
    chunks.push(text.slice(pos, end));
    pos = end;
  }
  return chunks;
}
