/**
 * scripts/send-telegram.mjs — generic Telegram sender for routines/reports
 * ─────────────────────────────────────────────────────────────────────────
 * Usage:
 *   node scripts/send-telegram.mjs "текст сообщения"
 *   node scripts/send-telegram.mjs --file reports/weekly-freshness-2026-06-15.md [--head 60]
 *   echo "text" | node scripts/send-telegram.mjs --stdin
 *
 * Options:
 *   --file <path>   Send the contents of a file (markdown sent as plain text)
 *   --head <n>      With --file: send only first n lines (default: whole file)
 *   --stdin         Read message text from stdin
 *   --dry-run       Print instead of sending
 *
 * Uses scripts/lib/telegram.mjs (reads TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
 * from .env automatically). Messages are auto-split at the 4096-char limit.
 */

import { readFileSync } from 'fs';
import { sendTelegramMessage } from './lib/telegram.mjs';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : undefined; };

let text = '';

if (has('--file')) {
  const file = val('--file');
  if (!file) { console.error('--file requires a path'); process.exit(2); }
  text = readFileSync(file, 'utf-8');
  const head = parseInt(val('--head') ?? '0', 10);
  if (head > 0) text = text.split('\n').slice(0, head).join('\n');
} else if (has('--stdin')) {
  text = readFileSync(0, 'utf-8');
} else {
  text = args.filter((a) => !a.startsWith('--')).join(' ');
}

text = text.trim();
if (!text) { console.error('Nothing to send: pass text, --file or --stdin'); process.exit(2); }

// lib always sets parse_mode (HTML by default) — escape raw text so '<' '>' '&'
// from markdown/code don't break the Telegram API call
const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

try {
  await sendTelegramMessage(esc, { dryRun: has('--dry-run') });
  console.log('sent ✓ (' + text.length + ' chars)');
} catch (e) {
  console.error('Telegram send failed: ' + e.message);
  process.exit(1);
}
