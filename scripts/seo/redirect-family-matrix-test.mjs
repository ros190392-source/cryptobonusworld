#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const ORIGIN = 'https://cryptobonusworld.com';
const EXPECTED_REDIRECTS = 44;

if (!existsSync(DIST)) {
  console.error('CBW REDIRECT FAMILY: ERROR — dist missing; run production build first');
  process.exit(1);
}

function findHtml(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes:true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) findHtml(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}
function routeForFile(file) {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404.html';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0,-'index.html'.length)}`;
  return `/${rel}`;
}
function tags(html, name) { return html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? []; }
function attr(tag, name) { return tag?.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] ?? null; }
function meta(html, name) { const tag = tags(html,'meta').find(row => new RegExp(`name\\s*=\\s*["']${name}["']`, 'i').test(row)); return attr(tag,'content'); }
function refreshTarget(html) {
  const tag = tags(html,'meta').find(row => /http-equiv\s*=\s*["']refresh["']/i.test(row));
  const content = attr(tag,'content');
  if (!content) return null;
  const raw = content.match(/url\s*=\s*(.+)$/i)?.[1]?.trim().replace(/^['"]|['"]$/g,'') ?? null;
  if (!raw) return null;
  try { const url = new URL(raw, ORIGIN); return url.origin === ORIGIN ? url.pathname : null; } catch { return null; }
}
function canonicalPath(html) {
  const tag = tags(html,'link').find(row => /rel\s*=\s*["']canonical["']/i.test(row));
  const href = attr(tag,'href');
  if (!href) return null;
  try { const url = new URL(href, ORIGIN); return url.origin === ORIGIN ? url.pathname : null; } catch { return null; }
}
function state(route, html) {
  if (route === '/404.html') return 'error';
  if (route.startsWith('/__design/')) return 'design';
  if (route.startsWith('/preview/')) return 'preview';
  if (/\bnoindex\b/i.test(meta(html,'robots') ?? '')) return 'noindex';
  return 'public';
}

let checks=0; const failures=[];
function check(label,ok,detail=''){checks+=1;if(!ok)failures.push(detail?`${label}: ${detail}`:label);}

const routeMap = new Map();
for (const file of findHtml(DIST)) {
  const route = routeForFile(file);
  const html = readFileSync(file,'utf8');
  routeMap.set(route,{route,html,state:state(route,html),target:refreshTarget(html),canonical:canonicalPath(html)});
}

const redirects = [...routeMap.values()].filter(row => row.target !== null);
check('redirect family: exactly 44 retired redirects', redirects.length === EXPECTED_REDIRECTS, `count=${redirects.length}`);

const families = { guides:0, exchangeAliases:0, countries:0, legacy:0 };
for (const row of redirects) {
  const target = row.target;
  const targetRow = routeMap.get(target);
  check(`${row.route}: noindex`, row.state === 'noindex', `state=${row.state}`);
  check(`${row.route}: redirect marker`, /data-redirect-page(?:\s|>|=)/i.test(row.html));
  check(`${row.route}: canonical equals target`, row.canonical === target, `canonical=${row.canonical} target=${target}`);
  check(`${row.route}: target exists`, Boolean(targetRow), `target=${target}`);
  check(`${row.route}: target is public`, targetRow?.state === 'public', `targetState=${targetRow?.state}`);
  check(`${row.route}: target is not another redirect`, !targetRow?.target, `target=${target}`);
  check(`${row.route}: does not redirect to /go`, !target.startsWith('/go/'), `target=${target}`);
  check(`${row.route}: not self-loop`, row.route !== target);
  const anchor = row.html.match(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
  check(`${row.route}: visible continue link equals target`, anchor === target, `href=${anchor} target=${target}`);

  if (row.route === '/countries/') families.countries += 1;
  else if (row.route === '/guides/' || row.route.startsWith('/guides/')) families.guides += 1;
  else if (row.route.startsWith('/exchanges/')) families.exchangeAliases += 1;
  else families.legacy += 1;
}

check('redirect family: 23 retired guides', families.guides === 23, JSON.stringify(families));
check('redirect family: 13 exchange aliases', families.exchangeAliases === 13, JSON.stringify(families));
check('redirect family: one countries redirect', families.countries === 1, JSON.stringify(families));
check('redirect family: seven other legacy redirects', families.legacy === 7, JSON.stringify(families));

if (failures.length) {
  console.error(`CBW REDIRECT FAMILY: FAIL (${failures.length}/${checks})`);
  failures.forEach(failure => console.error(` - ${failure}`));
  process.exitCode=1;
} else {
  console.log(`CBW REDIRECT FAMILY: PASS (${checks}/${checks})`);
  console.log(`CBW REDIRECT GROUPS: ${JSON.stringify(families)}`);
}
