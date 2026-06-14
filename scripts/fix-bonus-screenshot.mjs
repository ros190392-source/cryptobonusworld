import { readFileSync, writeFileSync } from 'fs';

const path = './src/data/content-overrides.json';
const data = JSON.parse(readFileSync(path, 'utf8'));

const sections = data.exchanges.binance.flagshipSections;
const idx = sections.findIndex(s => s.id === 'bonus-upgrade-2026');
if (idx === -1) throw new Error('Section not found');

// Switch from arrow version (1214x635) to clean version (1144x710)
// bn-01c-landing-19800-empty.webp shows BOTH offers clearly: 20% + 19,800 USD, no confusing arrows
sections[idx].html = sections[idx].html
  .replace(
    'src="/screenshots/binance/steps/bn-01c-landing-19800-arrow.webp"',
    'src="/screenshots/binance/steps/bn-01c-landing-19800-empty.webp"'
  )
  .replace('width="1214" height="635"', 'width="1144" height="710"')
  // update lightbox src too
  .replace(
    'data-lightbox-src="/screenshots/binance/steps/bn-01c-landing-19800-empty.webp"',
    'data-lightbox-src="/screenshots/binance/steps/bn-01c-landing-19800-empty.webp"'
  )
  // update alt text to be more accurate
  .replace(
    'alt="Binance sign-up page showing the current 19,800 USDT welcome package and 20% trading fee rebate via referral code CRYPTOBONW (June 2026)"',
    'alt="Binance registration page showing both offers: Up to 20% Trade Rebates (left) and Up to 19,800 USD New User bonus (right) — activated by referral code CRYPTOBONW (June 2026)"'
  )
  // update figcaption
  .replace(
    'Live Binance sign-up page (June 2026): enter code CRYPTOBONW and the 19,800 USDT + 20% fee rebate offer appears immediately. Tap to enlarge.',
    'Binance registration page (June 2026): left panel shows "Up to 20% Trade Rebates", right panel shows "Up to 19,800 USD New User bonus" — both activated instantly when code CRYPTOBONW is entered. Tap to enlarge.'
  );

writeFileSync(path, JSON.stringify(data, null, 2));

// Verify
const check = JSON.parse(readFileSync(path, 'utf8'));
const s = check.exchanges.binance.flagshipSections[idx];
console.log('Uses empty version:', s.html.includes('bn-01c-landing-19800-empty.webp'));
console.log('No arrow version remaining:', !s.html.includes('bn-01c-landing-19800-arrow.webp'));
console.log('New dimensions 1144x710:', s.html.includes('width="1144" height="710"'));
console.log('Done.');
