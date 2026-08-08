#!/usr/bin/env node
import { chromium } from 'playwright';
import {
  createServer,
} from 'node:http';
import {
  existsSync,
  readFileSync,
  statSync,
} from 'node:fs';
import {
  extname,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const DIST = resolve(ROOT, 'dist');
const EXCHANGES = JSON.parse(readFileSync(resolve(ROOT, 'src/data/exchanges.json'), 'utf8'));

const failures = [];
let checks = 0;
function check(label, condition) {
  checks += 1;
  if (!condition) failures.push(label);
}

function isRealDestination(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}
function isRealCode(value) {
  return typeof value === 'string' && value.trim() !== '' && value.trim() !== '#';
}
function isCommercialCandidate(rec) {
  if (isRealDestination(rec?.affiliateUrl)) return true;
  if (isRealDestination(rec?.affiliateLinks?.default)) return true;
  for (const value of Object.values(rec?.affiliateLinks?.geo ?? {})) if (isRealDestination(value)) return true;
  if (isRealCode(rec?.promoCode)) return true;
  return Array.isArray(rec?.promoCodes) && rec.promoCodes.some((item) => item && isRealCode(item.code));
}
function realCodes(rec) {
  const values = [];
  if (isRealCode(rec?.promoCode)) values.push(rec.promoCode);
  for (const item of rec?.promoCodes ?? []) if (item && isRealCode(item.code)) values.push(item.code);
  return [...new Set(values)];
}
function realGeo(rec) {
  return Object.fromEntries(Object.entries(rec?.affiliateLinks?.geo ?? {}).filter(([, value]) => isRealDestination(value)));
}
function normalized(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}
function neutralLabel(text) {
  return !/bonus|claim|reward|verified offer/i.test(String(text ?? ''));
}

if (!existsSync(resolve(DIST, 'index.html'))) {
  console.error('OWNER-CONFIRMED BROWSER MATRIX: FAIL — dist/ missing; run npm run build first.');
  process.exit(1);
}

const candidates = EXCHANGES.filter(isCommercialCandidate);
check('independent raw commercial-candidate discovery finds exactly 13 exchanges', candidates.length === 13);
check('commercial-candidate slugs are unique', new Set(candidates.map((row) => row.slug)).size === candidates.length);

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
]);

const server = createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
    const rel = pathname === '/'
      ? 'index.html'
      : pathname.endsWith('/')
        ? `${pathname.slice(1)}index.html`
        : pathname.slice(1);
    const file = resolve(DIST, rel);
    if (file !== DIST && !file.startsWith(`${DIST}${sep}`)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(readFileSync(file));
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end(String(error));
  }
});

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Failed to bind browser-matrix server.');
const BASE = `http://127.0.0.1:${address.port}`;

async function makeContext(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE)) await route.continue();
    else await route.abort('blockedbyclient');
  });
  // The product page redirects after one second. Suppress only long timers so the test can
  // inspect the exact resolved href without ever contacting an external exchange.
  await page.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (handler, timeout = 0, ...args) => {
      if (Number(timeout) >= 900) return 0;
      return nativeSetTimeout(handler, timeout, ...args);
    };
  });
  return { context, page };
}

async function assertGoPage(page, rec, suffix) {
  const url = `${BASE}/go/${rec.slug}/`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  check(`${suffix}/${rec.slug}: /go route returns 200`, response?.status() === 200);

  const button = page.locator('#cbw-continue');
  check(`${suffix}/${rec.slug}: /go has one continue control`, await button.count() === 1);
  const label = normalized(await button.textContent());
  check(`${suffix}/${rec.slug}: /go CTA copy is claim-neutral`, neutralLabel(label));

  const expectedDefault = rec?.affiliateLinks?.default;
  check(`${suffix}/${rec.slug}: raw default destination is a real URL`, isRealDestination(expectedDefault));
  const href = await button.getAttribute('href');
  check(`${suffix}/${rec.slug}: browser-visible href equals exact current confirmed default`, href === expectedDefault);

  const bodyText = normalized(await page.locator('body').textContent());
  check(`${suffix}/${rec.slug}: owner-confirmed route wording is visible`, /owner-confirmed registration link/i.test(bodyText));
  check(`${suffix}/${rec.slug}: offer terms remain under re-verification/not verified`, /under re-verification|not verified/i.test(bodyText));
  check(`${suffix}/${rec.slug}: no verified-offer wording appears`, !/verified offer/i.test(bodyText));

  const codes = realCodes(rec);
  if (rec.slug === 'coinbase') {
    check('coinbase: raw current promo/referral code set remains empty', codes.length === 0);
    check(`${suffix}/coinbase: no promo/referral code value is invented`, !/Promo\/referral code:\s*\S+/i.test(bodyText));
  } else {
    check(`${suffix}/${rec.slug}: one exact current promo/referral code exists`, codes.length === 1);
    check(`${suffix}/${rec.slug}: exact owner-confirmed code is rendered`, codes.length === 1 && bodyText.includes(codes[0]));
  }

  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.keyboard.press('Tab');
  const activeId = await page.evaluate(() => document.activeElement?.id ?? '');
  check(`${suffix}/${rec.slug}: continue control is keyboard reachable`, activeId === 'cbw-continue');

  return bodyText;
}

async function assertDedicatedPage(page, rec, suffix) {
  const rootFile = resolve(DIST, rec.slug, 'index.html');
  const path = existsSync(rootFile) ? `/${rec.slug}/` : `/exchanges/${rec.slug}/`;
  const response = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  check(`${suffix}/${rec.slug}: dedicated exchange page returns 200`, response?.status() === 200);

  const go = page.locator(`a[href="/go/${rec.slug}/"]`);
  check(`${suffix}/${rec.slug}: dedicated page exposes owner-confirmed internal /go hop`, await go.count() >= 1);
  if (await go.count()) {
    const label = normalized(await go.first().textContent());
    check(`${suffix}/${rec.slug}: dedicated-page commercial CTA is claim-neutral`, neutralLabel(label));
  }

  const text = normalized(await page.locator('body').textContent());
  check(`${suffix}/${rec.slug}: dedicated page has no Verified offer badge/copy`, !/verified offer/i.test(text));
  check(`${suffix}/${rec.slug}: dedicated page keeps offer posture neutral`, /re-verification|not verified|check the exchange directly/i.test(text));

  const codes = realCodes(rec);
  if (codes.length === 1) {
    check(`${suffix}/${rec.slug}: dedicated page may show only the exact current owner-confirmed code`, !/promo\/referral code/i.test(text) || text.includes(codes[0]));
  }

  // Keyboard scan proves the /go CTA can actually be reached without pointer interaction.
  let reached = false;
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  for (let i = 0; i < 80; i += 1) {
    await page.keyboard.press('Tab');
    const activeHref = await page.evaluate(() => document.activeElement instanceof HTMLAnchorElement ? document.activeElement.getAttribute('href') : null);
    if (activeHref === `/go/${rec.slug}/`) {
      reached = true;
      break;
    }
  }
  check(`${suffix}/${rec.slug}: dedicated /go CTA is keyboard reachable`, reached);
  return text;
}

let browser;
try {
  browser = await chromium.launch({ headless: true });

  const desktop = await makeContext(browser, { width: 1440, height: 900 });
  const mobile = await makeContext(browser, { width: 390, height: 844 });

  const desktopGoText = new Map();
  const mobileGoText = new Map();
  const desktopDedicatedText = new Map();
  const mobileDedicatedText = new Map();

  for (const rec of candidates) {
    desktopGoText.set(rec.slug, await assertGoPage(desktop.page, rec, 'desktop'));
    mobileGoText.set(rec.slug, await assertGoPage(mobile.page, rec, 'mobile'));
    desktopDedicatedText.set(rec.slug, await assertDedicatedPage(desktop.page, rec, 'desktop'));
    mobileDedicatedText.set(rec.slug, await assertDedicatedPage(mobile.page, rec, 'mobile'));

    check(`${rec.slug}: /go desktop/mobile factual text matches`, desktopGoText.get(rec.slug) === mobileGoText.get(rec.slug));
    check(`${rec.slug}: dedicated desktop/mobile factual text matches`, desktopDedicatedText.get(rec.slug) === mobileDedicatedText.get(rec.slug));
  }

  const bybit = candidates.find((row) => row.slug === 'bybit');
  check('bybit: candidate exists for GEO browser matrix', Boolean(bybit));
  if (bybit) {
    const geo = realGeo(bybit);
    check('bybit: current confirmed GEO set is non-empty', Object.keys(geo).length > 0);
    for (const [country, expected] of Object.entries(geo)) {
      await desktop.page.goto(`${BASE}/go/bybit/?geo=${encodeURIComponent(country)}`, { waitUntil: 'domcontentloaded' });
      const href = await desktop.page.locator('#cbw-continue').getAttribute('href');
      check(`bybit GEO ${country}: browser-visible href equals exact current GEO destination`, href === expected);
    }
    await desktop.page.goto(`${BASE}/go/bybit/?geo=zz`, { waitUntil: 'domcontentloaded' });
    const unknownHref = await desktop.page.locator('#cbw-continue').getAttribute('href');
    check('bybit unknown GEO: falls back to exact confirmed default without inventing a route', unknownHref === bybit.affiliateLinks.default);
  }

  for (const [suffix, fixture] of [['desktop', desktop], ['mobile', mobile]]) {
    const response = await fixture.page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    check(`${suffix}/homepage: returns 200`, response?.status() === 200);
    const homepageGoLinks = fixture.page.locator('a[href^="/go/"]');
    check(`${suffix}/homepage: confirmed-link Top-10 exposes exactly 10 internal /go hops`, await homepageGoLinks.count() === 10);
    const labels = await homepageGoLinks.allTextContents();
    check(`${suffix}/homepage: every commercial CTA label is claim-neutral`, labels.every(neutralLabel));
    const pageText = normalized(await fixture.page.locator('body').textContent());
    check(`${suffix}/homepage: no Verified offer copy appears`, !/verified offer/i.test(pageText));
  }

  await desktop.context.close();
  await mobile.context.close();
} catch (error) {
  failures.push(`browser-runtime:${error instanceof Error ? error.message : String(error)}`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

if (failures.length > 0) {
  console.error(`OWNER-CONFIRMED BROWSER MATRIX: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`OWNER-CONFIRMED BROWSER MATRIX: PASS (${checks}/${checks}) — Chromium desktop/mobile/keyboard, homepage, dedicated exchange pages and all current /go routes.`);
