import { readFileSync, writeFileSync } from 'fs';

const path = './src/data/content-overrides.json';
const data = JSON.parse(readFileSync(path, 'utf8'));

const sections = data.exchanges.binance.flagshipSections;
const idx = sections.findIndex(s => s.id === 'binance-verify-code-worked');
if (idx === -1) throw new Error('Section not found');

sections[idx].html = `
<p>After signing up, many users aren't sure whether the referral code applied correctly. Here's exactly where to look &mdash; on both web and mobile.</p>

<h3>Check 0: Registration Page (Before You Even Sign Up)</h3>
<p>This is the earliest confirmation. On the Binance registration page, enter code <strong>CRYPTOBONW</strong> in the Referral ID field. Before you click "Create Account", Binance instantly shows the offer attached to that code &mdash; <strong>up to 19,800 USDT welcome bonus</strong> and <strong>up to 20% fee rebate</strong>. If you see these numbers appear next to the code field, the code is valid and the full package will be activated on your account upon KYC completion.</p>
<p>If no offer appears after entering the code, try clearing the field and re-entering. If it still shows nothing, the code may not be available in your region.</p>

<h3>Check 1: The Welcome Screen (Immediate Confirmation)</h3>
<p>Right after creating your password, Binance shows a <strong>Welcome aboard!</strong> screen. If the code was applied, it explicitly states <em>"Your account has been created and linked to Referral ID CRYPTOBONW."</em> If you see a Referral ID mentioned &mdash; the code worked. If this screen showed nothing about a referral, the code did not attach.</p>

<h3>Check 2: Rewards Hub (After KYC)</h3>
<p>After completing KYC, go to <strong>Profile &rarr; Rewards Hub</strong> (web) or tap the gift icon in the app. You should see your Stage 1 tasks listed: KYC, deposit $10, trade $10, trade $2,000. If these four tasks appear, the referral code attached correctly and your bonus package was activated. If Rewards Hub is empty or shows "no tasks available", the code did not apply.</p>

<h3>Check 3: Task &amp; Reward Overview</h3>
<p>Inside Rewards Hub, click <strong>Task &amp; Reward Overview</strong>. This shows your full bonus structure &mdash; Stage 1 tasks and Stage 2 tiers (up to 7 deposit/volume tiers). Our account showed all seven tiers summing to $19,700 within minutes of KYC completion (verified June 12, 2026). If you see this overview, the full 19,800 USDT package is active.</p>

<h3>If the Code Didn't Apply</h3>
<p>Once registered, a referral code <strong>cannot be added retroactively</strong>. Binance's system locks the referral association at the moment of account creation. If your Welcome screen didn't confirm a Referral ID, and your Rewards Hub is empty, the bonus structure is not attached to your current account. Your options: contact Binance support (some users report resolution within 48 hours if they contact support immediately after registration), or create a new account using a different email address and apply the code correctly during signup.</p>

<h3>Tracking Your 20% Fee Rebate</h3>
<p>The 20% fee rebate works differently &mdash; it's not shown in Rewards Hub. To see it, go to <strong>Account &rarr; Commission Rebate</strong> or check your order history: each completed trade will show a fee charged, and separately a <strong>commission rebate</strong> entry for 20% of that fee. This appears after your first trade.</p>
`;

writeFileSync(path, JSON.stringify(data, null, 2));
const check = JSON.parse(readFileSync(path, 'utf8'));
const s = check.exchanges.binance.flagshipSections[idx];
console.log('Updated:', s.id);
console.log('HTML length:', s.html.length, 'chars');
console.log('Check 0 present:', s.html.includes('Check 0'));
