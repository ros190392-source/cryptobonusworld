import { readFileSync, writeFileSync } from 'fs';

const path = './src/data/content-overrides.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
const sections = data.exchanges.binance.flagshipSections;

// ── Task 1: bonus-upgrade-2026 — lead with $19,800 punchline ──────────────
const bonusIdx = sections.findIndex(s => s.id === 'bonus-upgrade-2026');
sections[bonusIdx].html = `
<p>Using referral code <strong>CRYPTOBONW</strong> unlocks two benefits from day one: up to <strong>19,800 USDT</strong> in task-based welcome rewards and a permanent <strong>20% rebate on all trading fees</strong> (spot and futures). You can confirm both offers are active before creating your account &mdash; enter the code on the Binance sign-up page and the full offer populates instantly.</p>
<figure id="bonus-proof-19800" class="fh-wide-shot" data-lightbox-group="ce-flagship" data-lightbox-src="/screenshots/binance/steps/bn-01c-landing-19800-empty.webp" data-lightbox-alt="Binance registration page — current 19,800 USDT + 20% fee rebate program (June 2026)">
<img src="/screenshots/binance/steps/bn-01c-landing-19800-arrow.webp" alt="Binance sign-up page showing the current 19,800 USDT welcome package and 20% trading fee rebate via referral code CRYPTOBONW (June 2026)" width="1214" height="635" loading="lazy" decoding="async">
<figcaption>Live Binance sign-up page (June 2026): enter code CRYPTOBONW and the 19,800 USDT + 20% fee rebate offer appears immediately. Tap to enlarge.</figcaption>
</figure>
<p>What to expect realistically: KYC is mandatory to unlock bonus tasks. Rewards are paid as trading-fee rebate vouchers &mdash; not withdrawable cash. Most users completing a standard deposit earn <strong>50&ndash;200 USDT in fee savings</strong>. The 19,800 USDT maximum requires very high spot and futures trading volume across all seven Stage 2 tiers. We last verified the current structure on our own account on June 12, 2026.</p>
<p class="fh-footnote"><em>The previous Binance welcome bonus was capped at $600. On May 7, 2026 that program was replaced by the current two-stage structure &mdash; most third-party guides still citing $100 or $600 reflect the old offer.</em></p>
`;

// ── Task 2: troubleshooting-code — add Fix #7 ────────────────────────────
const troubleIdx = sections.findIndex(s => s.id === 'troubleshooting-code');
sections[troubleIdx].html = `
<p>The referral code <strong>CRYPTOBONW</strong> works for all eligible new accounts on Binance.com. Below are the seven most common reasons it appears not to work &mdash; and the exact resolution for each.</p>
<dl class="fh-troubleshoot">
<dt>1. The code was not entered during registration</dt>
<dd>Binance does not allow retroactive code entry. The referral link or code must be present before you click the final registration button. After account creation, there is no field to add it and support cannot attach it. If you registered without the code, you need a new account with a different email address to claim the bonus structure. There are no exceptions.</dd>
<dt>2. You are on Binance.US, not Binance.com</dt>
<dd>CRYPTOBONW is a Binance.com referral code and does not apply to the separate Binance.US platform. US residents cannot access Binance.com at all &mdash; if you are in the United States, the 19,800 USDT offer is not available to you. Coinbase is the US-licensed alternative we recommend.</dd>
<dt>3. Your country is excluded from the program</dt>
<dd>Some countries are ineligible for specific bonus tasks or the entire Stage 2 program, even when registration itself succeeds. If your Rewards Hub shows fewer tasks than the tier table on this page, or shows tasks with $0 rewards, your region is likely excluded. This cannot be changed after registration.</dd>
<dt>4. KYC was not completed within 30 days of registration</dt>
<dd>Stage 1 tasks (four tasks, up to 100 USDC) are assigned at registration. Stage 2 (seven tiers, up to $19,700) is only assigned after KYC completes. If your 30-day registration window passed without completing identity verification, Stage 2 is permanently unavailable for your account &mdash; it cannot be unlocked afterwards. Complete KYC within the first 24 hours of registering.</dd>
<dt>5. Bonus tasks are missing from the Rewards Hub</dt>
<dd>Navigate to <strong>Profile icon &rarr; Rewards Hub &rarr; Task Center</strong> &mdash; not the wallet or assets page. If tasks are entirely absent, confirm the code was linked: at registration you should have seen a screen stating that your account is linked to Referral ID CRYPTOBONW. If that confirmation never appeared, the code was not applied during registration.</dd>
<dt>6. A voucher expired before you redeemed it</dt>
<dd>Each Stage 1 voucher expires <strong>7 days from distribution</strong>, not from when you log in. If the 7-day window passed before you applied the voucher to a trade, it is forfeited. Check <strong>Rewards Hub &rarr; History</strong> for expired entries. Apply vouchers immediately when distributed &mdash; the clock starts at the moment of distribution, not when you open the app.</dd>
<dt>7. The code was applied but the bonus isn't showing in Rewards Hub</dt>
<dd>This is the most common confusion. After registration, Rewards Hub is <strong>empty until KYC is complete</strong> &mdash; this is by design, not a missing code. Go to <strong>Profile &rarr; Verify</strong> and complete identity verification first. Within minutes of KYC approval, Stage 1 tasks appear in Rewards Hub automatically. If Rewards Hub remains empty 30 minutes after KYC approval, go to <strong>Rewards Hub &rarr; Task Center &rarr; Refresh</strong>. If it still shows nothing after 24 hours, contact Binance support via live chat and reference your registration timestamp &mdash; support can confirm whether the referral ID was attached to your account during signup.</dd>
</dl>
`;

writeFileSync(path, JSON.stringify(data, null, 2));
const check = JSON.parse(readFileSync(path, 'utf8'));
const s = check.exchanges.binance.flagshipSections;
console.log('bonus-upgrade-2026 leads with 19800:', s.find(x=>x.id==='bonus-upgrade-2026').html.indexOf('19,800') < 200);
console.log('troubleshooting Fix #7 present:', s.find(x=>x.id==='troubleshooting-code').html.includes('Fix #7') || s.find(x=>x.id==='troubleshooting-code').html.includes('7.'));
console.log('Done.');
