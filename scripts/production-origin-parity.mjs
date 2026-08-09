#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const RUNNER_TEMP = process.env.RUNNER_TEMP || '/tmp';
const SUMMARY_PATH = resolve(RUNNER_TEMP, 'cbw-origin-parity.md');
const BASE_URL = new URL(process.env.CBW_PRODUCTION_BASE_URL || 'https://cryptobonusworld.com');

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function marker(text) {
  return /\bverified\s+offer\b/i.test(String(text));
}

function posixQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function requireConfig(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`missing required environment variable: ${name}`);
  return value;
}

function safeExec(exe, args, label) {
  try {
    return {
      ok: true,
      stdout: execFileSync(exe, args, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        maxBuffer: 16 * 1024 * 1024,
      }),
      error: null,
    };
  } catch (error) {
    const stderr = String(error?.stderr || '').trim();
    return { ok: false, stdout: '', error: stderr || `${label} failed` };
  }
}

const host = requireConfig('CBW_DEPLOY_HOST');
const user = requireConfig('CBW_DEPLOY_USER');
const keyPath = requireConfig('CBW_DEPLOY_KEY_PATH');
const portRaw = String(process.env.CBW_DEPLOY_PORT || '22').trim() || '22';
const remotePath = String(process.env.CBW_DEPLOY_REMOTE_PATH || '').trim() || '/var/www/cryptobonusworld/html';

if (!/^[A-Za-z_][A-Za-z0-9_-]{0,31}$/.test(user)) throw new Error('invalid deploy user format');
if (!/^[A-Za-z0-9.:_-]+$/.test(host)) throw new Error('invalid deploy host format');
if (!/^\d+$/.test(portRaw)) throw new Error('invalid deploy port format');
if (!remotePath.startsWith('/') || /[\0\r\n]/.test(remotePath)) throw new Error('invalid remote path format');
if (!existsSync(keyPath)) throw new Error('deploy key path does not exist');

const localIndexPath = resolve(ROOT, 'dist', 'index.html');
if (!existsSync(localIndexPath)) throw new Error('dist/index.html missing; origin parity must run after production build/deploy');
const localBody = readFileSync(localIndexPath, 'utf8');
const localHash = sha256(localBody);
const localMarker = marker(localBody);

const SSH_OPT_ARGS = [
  '-o', 'BatchMode=yes',
  '-o', 'PasswordAuthentication=no',
  '-o', 'KbdInteractiveAuthentication=no',
  '-o', 'PreferredAuthentications=publickey',
  '-o', 'IdentitiesOnly=yes',
  '-o', 'StrictHostKeyChecking=yes',
];

const remoteIndex = `${remotePath.replace(/\/$/, '')}/index.html`;
const remoteCommand = [
  `test -f ${posixQuote(remoteIndex)} || { echo REMOTE_FILE_MISSING; exit 3; }`,
  `sha256sum ${posixQuote(remoteIndex)} | awk '{print $1}'`,
  `if grep -Eiq 'verified[[:space:]]+offer([^[:alnum:]_]|$)' ${posixQuote(remoteIndex)}; then echo REMOTE_MARKER_PRESENT; else echo REMOTE_MARKER_ABSENT; fi`,
].join(' && ');

const remote = safeExec('ssh', [
  ...SSH_OPT_ARGS,
  '-p', portRaw,
  '-i', keyPath,
  `${user}@${host}`,
  remoteCommand,
], 'remote web-root check');

let remoteHash = 'unavailable';
let remoteMarker = null;
if (remote.ok) {
  const lines = remote.stdout.trim().split(/\r?\n/).filter(Boolean);
  remoteHash = lines[0] || 'unavailable';
  remoteMarker = lines.includes('REMOTE_MARKER_PRESENT') ? true : lines.includes('REMOTE_MARKER_ABSENT') ? false : null;
}

const probeToken = `${String(process.env.GITHUB_SHA || 'manual').slice(0, 12)}-${Date.now()}`;
const originUrl = new URL(BASE_URL);
originUrl.searchParams.set('__cbw_origin', probeToken);
const resolveArg = `${BASE_URL.hostname}:443:${host}`;
const origin = safeExec('curl', [
  '--fail-with-body',
  '--silent',
  '--show-error',
  '--max-time', '20',
  '--resolve', resolveArg,
  '--header', 'Cache-Control: no-cache, no-store, max-age=0',
  '--header', 'Pragma: no-cache',
  originUrl.toString(),
], 'direct origin HTTP check');
const originBody = origin.ok ? origin.stdout : '';
const originMarker = origin.ok ? marker(originBody) : null;
const originHash = origin.ok ? sha256(originBody) : 'unavailable';

const publicUrl = new URL(BASE_URL);
publicUrl.searchParams.set('__cbw_public', probeToken);
let publicStatus = null;
let publicMarker = null;
let publicHash = 'unavailable';
let publicCfCacheStatus = 'unavailable';
let publicError = null;
try {
  const response = await fetch(publicUrl, {
    redirect: 'follow',
    headers: {
      'user-agent': 'CBW-Origin-Parity/1.1',
      accept: 'text/html,application/xhtml+xml',
      'cache-control': 'no-cache, no-store, max-age=0',
      pragma: 'no-cache',
    },
  });
  publicStatus = response.status;
  publicCfCacheStatus = response.headers.get('cf-cache-status') || 'none';
  const body = await response.text();
  publicMarker = marker(body);
  publicHash = sha256(body);
} catch (error) {
  publicError = error instanceof Error ? error.message : 'public fetch failed';
}

let classification = 'UNCLASSIFIED';
if (localMarker) {
  classification = 'LOCAL_BUILD_CONTAINS_UNSUPPORTED_MARKER';
} else if (!remote.ok) {
  classification = 'REMOTE_WEBROOT_CHECK_FAILED';
} else if (remoteMarker) {
  classification = 'REMOTE_WEBROOT_CONTAINS_UNSUPPORTED_MARKER';
} else if (remoteHash !== localHash) {
  classification = 'LOCAL_REMOTE_FILE_HASH_MISMATCH';
} else if (!origin.ok) {
  classification = 'DIRECT_ORIGIN_UNREACHABLE_FROM_RUNNER';
} else if (originMarker) {
  classification = 'ORIGIN_VHOST_OR_REWRITE_MISMATCH';
} else if (publicMarker) {
  classification = 'PUBLIC_EDGE_ROUTING_OR_WORKER_MISMATCH';
} else if (publicStatus && publicStatus >= 200 && publicStatus < 300) {
  classification = 'PARITY_CLEAN';
}

const lines = [
  '### CBW production origin parity diagnostic',
  '',
  `- release SHA: \`${process.env.GITHUB_SHA || 'unknown'}\``,
  `- local dist marker: ${localMarker ? 'PRESENT' : 'ABSENT'}`,
  `- remote web-root check: ${remote.ok ? 'OK' : 'FAILED'}`,
  `- remote web-root marker: ${remoteMarker === null ? 'UNKNOWN' : remoteMarker ? 'PRESENT' : 'ABSENT'}`,
  `- local ↔ remote index hash: ${remote.ok ? (remoteHash === localHash ? 'MATCH' : 'MISMATCH') : 'UNKNOWN'}`,
  `- direct origin check: ${origin.ok ? 'OK' : 'FAILED'}`,
  `- direct origin marker: ${originMarker === null ? 'UNKNOWN' : originMarker ? 'PRESENT' : 'ABSENT'}`,
  `- direct origin ↔ local body hash: ${origin.ok ? (originHash === localHash ? 'MATCH' : 'DIFFERENT') : 'UNKNOWN'}`,
  `- public HTTP status: ${publicStatus ?? 'UNKNOWN'}`,
  `- public marker: ${publicMarker === null ? 'UNKNOWN' : publicMarker ? 'PRESENT' : 'ABSENT'}`,
  `- public cf-cache-status: ${publicCfCacheStatus}`,
  `- classification: **${classification}**`,
];
if (!remote.ok) lines.push(`- remote diagnostic error class: ${remote.error ? 'command_failed' : 'unknown'}`);
if (!origin.ok) lines.push(`- direct-origin diagnostic error class: ${origin.error ? 'request_failed' : 'unknown'}`);
if (publicError) lines.push('- public diagnostic error class: request_failed');

writeFileSync(SUMMARY_PATH, `${lines.join('\n')}\n`, 'utf8');
console.log(lines.join('\n'));
console.log(`SUMMARY_PATH=${SUMMARY_PATH}`);
