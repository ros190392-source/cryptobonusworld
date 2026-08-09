#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-header-context-'));
const OUT = join(TMP, 'header-context.mjs');

const headerContext = join(ROOT, 'src/data/header/headerContext.ts');
const headerCatalog = join(ROOT, 'src/data/header/headerCatalog.ts');
const countryContext = join(ROOT, 'src/data/contracts/countryContext.ts');
const countryInput = join(ROOT, 'src/data/contracts/countryInput.ts');
const registry = join(ROOT, 'src/data/contracts/marketProfileRegistry.ts');
const headerSource = readFileSync(join(ROOT, 'src/components/layout/SiteHeader.astro'), 'utf8');

let checks = 0;
const failures = [];
function check(name, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
}

try {
  await build({
    stdin: {
      contents:
        `export * from ${JSON.stringify(headerContext)};\n` +
        `export * from ${JSON.stringify(headerCatalog)};\n` +
        `export { COUNTRY_CONTEXT_STORAGE_KEY } from ${JSON.stringify(countryContext)};\n` +
        `export { SUPPORTED_COUNTRY_CODES } from ${JSON.stringify(countryInput)};\n` +
        `export { PUBLIC_MARKET_PROFILES } from ${JSON.stringify(registry)};\n`,
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'header-context-test-entry.ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: OUT,
    logLevel: 'silent',
  });

  const m = await import(`${pathToFileURL(OUT).href}?v=${Date.now()}`);

  // Country catalog / identity metadata only.
  check('catalog: General is first', m.HEADER_COUNTRIES[0]?.code === 'global' && m.HEADER_COUNTRIES[0]?.name === 'General');
  check('catalog: every supported ISO is present', m.SUPPORTED_COUNTRY_CODES.every(code => m.HEADER_COUNTRIES.some(country => country.code === code)));
  check('catalog: no duplicate country codes', new Set(m.HEADER_COUNTRIES.map(country => country.code)).size === m.HEADER_COUNTRIES.length);
  check('catalog: Poland identity present', m.HEADER_COUNTRIES.some(country => country.code === 'PL' && country.name === 'Poland' && country.flag === '🇵🇱'));
  check('catalog: Kazakhstan identity present', m.HEADER_COUNTRIES.some(country => country.code === 'KZ' && country.name === 'Kazakhstan' && country.flag === '🇰🇿'));

  // Same-origin Cloudflare trace parser — proposal only.
  check('trace: supported PL accepted', m.parseCloudflareTraceCountry('ip=1.2.3.4\nloc=PL\ntls=TLSv1.3\n') === 'PL');
  check('trace: supported KZ accepted', m.parseCloudflareTraceCountry('loc=KZ\n') === 'KZ');
  check('trace: unsupported FR rejected', m.parseCloudflareTraceCountry('loc=FR\n') === null);
  check('trace: lowercase rejected', m.parseCloudflareTraceCountry('loc=pl\n') === null);
  check('trace: duplicate loc rejected', m.parseCloudflareTraceCountry('loc=PL\nloc=KZ\n') === null);
  check('trace: malformed input rejected', m.parseCloudflareTraceCountry(null) === null && m.parseCloudflareTraceCountry('hello') === null);

  // Country precedence / fail-closed storage.
  const storedPL = m.serializeHeaderCountrySelection('PL');
  const storedGlobal = m.serializeHeaderCountrySelection('global');
  check('country: PL storage serializes', typeof storedPL === 'string' && storedPL.includes('"PL"'));
  check('country: manual PL beats IP KZ', m.resolveHeaderCountry({ storedRaw: storedPL, ipCountryCode: 'KZ' }).countryCode === 'PL');
  check('country: explicit General beats IP PL', m.resolveHeaderCountry({ storedRaw: storedGlobal, ipCountryCode: 'PL' }).countryCode === 'global');
  const invalidStoredCountry = m.resolveHeaderCountry({ storedRaw: '{bad', ipCountryCode: 'PL' });
  check('country: malformed storage fails closed', invalidStoredCountry.countryCode === 'global' && invalidStoredCountry.source === 'invalid_storage');
  const ipPL = m.resolveHeaderCountry({ ipCountryCode: 'PL' });
  check('country: supported IP proposal used when no manual override', ipPL.countryCode === 'PL' && ipPL.source === 'ip');
  check('country: unsupported IP falls to General', m.resolveHeaderCountry({ ipCountryCode: 'FR' }).countryCode === 'global');
  check('country: missing IP falls to General', m.resolveHeaderCountry({}).countryCode === 'global');

  // Language preference / browser proposal.
  check('language: supported list exact', JSON.stringify(m.HEADER_LANGUAGES.map(x => x.code)) === JSON.stringify(['en', 'ru', 'pl', 'uk', 'kk']));
  const browserRu = m.resolveHeaderLanguage({ browserLanguages: ['de-DE', 'ru-RU'] });
  check('language: browser proposal picks first supported candidate', browserRu.language.code === 'ru' && browserRu.source === 'browser');
  check('language: unsupported browser falls to English', m.resolveHeaderLanguage({ browserLanguages: ['de-DE', 'fr-FR'] }).language.code === 'en');
  const storedPlLang = m.serializeHeaderLanguage('pl');
  check('language: persisted PL beats browser RU', m.resolveHeaderLanguage({ storedRaw: storedPlLang, browserLanguages: ['ru-RU'] }).language.code === 'pl');
  const invalidLang = m.resolveHeaderLanguage({ storedRaw: '{bad', browserLanguages: ['ru-RU'] });
  check('language: malformed storage fails closed to English', invalidLang.language.code === 'en' && invalidLang.source === 'invalid_storage');
  check('language: unknown stored version rejected', m.parseStoredHeaderLanguage('{"v":2,"language":"ru"}') === null);
  check('language: extra stored fields rejected', m.parseStoredHeaderLanguage('{"v":1,"language":"ru","x":1}') === null);

  // Separation: presentation context is not commercial authority.
  const countryDecision = m.resolveHeaderCountry({ ipCountryCode: 'PL' });
  const languageDecision = m.resolveHeaderLanguage({ browserLanguages: ['ru-RU'] });
  check('separation: country and language resolve independently', countryDecision.countryCode === 'PL' && languageDecision.language.code === 'ru');
  check('separation: public MarketProfile registry remains frozen empty', Object.isFrozen(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);

  // Header static contract / compactness.
  check('header: country selector present', headerSource.includes('data-country-picker') && headerSource.includes('data-country-option'));
  check('header: language selector present', headerSource.includes('data-language-picker') && headerSource.includes('data-language-option'));
  check('header: same-origin Cloudflare trace only', headerSource.includes("fetch('/cdn-cgi/trace'") && !/fetch\(['"]https?:\/\//.test(headerSource));
  check('header: no affiliate route authority', !headerSource.includes('/go/'));
  check('header: separate Compare Top 10 CTA removed', !headerSource.includes('header-cta') && !headerSource.includes('Compare Top 10'));
  check('header: desktop height target 60px', headerSource.includes('.header-shell { min-height: 60px') || headerSource.includes('min-height: 60px;'));
  check('header: mobile touch target is 44px', headerSource.includes('width: 44px;') && headerSource.includes('height: 44px;') && headerSource.includes('min-height: 44px;'));
  check('header: IP is labelled proposal only', headerSource.includes('IP suggests a country. Your manual choice always wins.'));
  check('header: language-country separation copy present', headerSource.includes('Language is a presentation preference. Country facts stay separate.'));

  if (failures.length) {
    console.error(`CBW HEADER CONTEXT: FAIL (${failures.length}/${checks})`);
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`CBW HEADER CONTEXT: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW HEADER CONTEXT: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
