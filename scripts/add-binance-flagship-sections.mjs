import { readFileSync, writeFileSync } from 'fs';

const path = './src/data/content-overrides.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
const bn = data.exchanges.binance;

// GAP-01: How to get your own referral code (after-walkthroughs)
const earnOwnCode = {
  id: 'binance-earn-own-code',
  position: 'after-walkthroughs',
  heading: 'How to Get Your Own Binance Referral Code and Earn Commission',
  html: `
<p>There are two sides to the Binance referral program. Everything above covers the <strong>invitee side</strong> — using someone else's code to claim your welcome bonus. This section covers the <strong>referrer side</strong>: generating your own code and earning a commission on every trade your referred users make.</p>

<h3>Where to Find Your Referral Code</h3>
<p>Once your account is set up and KYC is complete, go to <strong>Profile &rarr; Referral</strong> (web) or tap the person icon and select <strong>Referral</strong> (app). Binance generates your unique referral link and displays your referral code. You can share either &mdash; the link auto-applies the code, the code must be entered manually.</p>

<h3>How Much Commission Do You Earn?</h3>
<p>The commission rate depends on which referral mode you use:</p>
<table>
<thead><tr><th>Mode</th><th>Your Commission</th><th>Friend Gets</th><th>Who Uses It</th></tr></thead>
<tbody>
<tr><td><strong>Referral Lite</strong></td><td>Up to 10% of their trading fees</td><td>0% discount</td><td>Casual sharers &mdash; simple, no configuration</td></tr>
<tr><td><strong>Referral Pro</strong></td><td>Up to 30% of their trading fees</td><td>Up to 20% fee discount</td><td>Affiliate marketers, content creators</td></tr>
<tr><td><strong>Affiliate Program</strong></td><td>Up to 41% commission</td><td>Standard welcome bonus</td><td>High-volume promoters (application required)</td></tr>
</tbody>
</table>
<p>Referral Pro gives you the highest earning potential while also giving your friends a real discount &mdash; that's why it converts better. Commission is paid in <strong>real-time, in the same asset as the fee paid</strong> (usually USDT or BNB). It hits your Referral Commission wallet with each trade your referrals make.</p>

<h3>Estimated Earnings (Referral Pro, 30% commission)</h3>
<table>
<thead><tr><th>Friends Referred</th><th>Avg Monthly Volume</th><th>Your Monthly Commission</th></tr></thead>
<tbody>
<tr><td>5 friends</td><td>$5,000/friend</td><td>~$7.50/month</td></tr>
<tr><td>20 friends</td><td>$5,000/friend</td><td>~$30/month</td></tr>
<tr><td>100 friends</td><td>$5,000/friend</td><td>~$150/month</td></tr>
<tr><td>20 friends</td><td>$50,000/friend</td><td>~$300/month</td></tr>
</tbody>
</table>
<p><em>Based on 0.1% spot fee &times; 30% referral commission rate. Actual earnings depend on your friends' trading activity and VIP level.</em></p>

<h3>How to Switch to Referral Pro</h3>
<p>In the Referral Center, click <strong>My Referral Link</strong> &rarr; <strong>Edit</strong>. Toggle the commission split: by default it's set to Referral Lite (you keep 100% of your commission). Switching to Referral Pro splits it: you give 20% back to your friend as a fee discount, and you keep 30%. Go to <strong>Referral &rarr; Pro</strong> and enable it. Important: you need to be in Referral Pro mode for your friends to receive the 20% fee kickback &mdash; this is the mode that makes our code CRYPTOBONW valuable to new users.</p>
`
};

// GAP-02: Verify code worked (after-walkthroughs, after troubleshooting)
const verifyCodeWorked = {
  id: 'binance-verify-code-worked',
  position: 'after-walkthroughs',
  heading: 'How to Check Your Referral Code Actually Worked',
  html: `
<p>After signing up, many users aren't sure whether the referral code applied correctly. Here's exactly where to look &mdash; on both web and mobile.</p>

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
`
};

// GAP-03: Fee stacking (after-tier-table)
const feeStacking = {
  id: 'binance-fee-stacking',
  position: 'after-tier-table',
  heading: 'Your Real Savings: Fee Stacking Explained',
  html: `
<p>Binance has three fee-reduction mechanisms that stack. Understanding the order of operations tells you exactly how much you save at each trading level.</p>

<h3>The Three Discounts (Applied in This Order)</h3>
<ol>
<li><strong>VIP Tier</strong> &mdash; Volume-based rate reduction. VIP 0 = 0.1%/0.1%. VIP 1+ = progressively lower. Requires monthly volume &ge;$1M for VIP 1.</li>
<li><strong>BNB Fee Payment</strong> &mdash; Pay fees in BNB for an additional 25% off the fee amount calculated in step 1. Requires BNB in your Spot wallet.</li>
<li><strong>Referral Code 20% Rebate</strong> &mdash; You receive 20% back of whatever fee you paid after steps 1 and 2. This is a cashback, not a discount applied at the moment of trading &mdash; it posts to your account shortly after.</li>
</ol>

<h3>Real Savings for Three Trader Profiles</h3>
<table>
<thead><tr><th>Profile</th><th>Monthly Volume</th><th>Base Fee (0.1%)</th><th>After BNB (&minus;25%)</th><th>After 20% Rebate</th><th>Effective Rate</th><th>Monthly Saving</th></tr></thead>
<tbody>
<tr><td>Casual</td><td>$1,000</td><td>$1.00</td><td>$0.75</td><td>$0.60</td><td>0.060%</td><td>$0.40/mo</td></tr>
<tr><td>Active</td><td>$10,000</td><td>$10.00</td><td>$7.50</td><td>$6.00</td><td>0.060%</td><td>$4.00/mo</td></tr>
<tr><td>High-volume</td><td>$100,000</td><td>$100.00</td><td>$75.00</td><td>$60.00</td><td>0.060%</td><td>$40.00/mo</td></tr>
</tbody>
</table>
<p><em>Assumes VIP 0 rate (0.1% maker/taker), BNB discount enabled, referral code CRYPTOBONW active. Taker-side trades only; maker discounts reduce this further.</em></p>

<h3>Can You Combine All Three?</h3>
<p>Yes &mdash; all three stack. The referral 20% rebate applies to the fee you actually pay (after BNB and VIP discounts), not to the base rate. So if BNB brings your fee to $7.50, the 20% rebate is $1.50 back &mdash; not 20% of the original $10. The effective combined rate at VIP 0 + BNB + referral rebate is <strong>0.060% per trade</strong> &mdash; among the most competitive on any major exchange without requiring high VIP volume.</p>

<h3>Important: How the Rebate Arrives</h3>
<p>The 20% is a <strong>cashback rebate</strong>, not a real-time discount. Your account is charged the full BNB-adjusted fee first, then the rebate posts to your Spot wallet, typically within a few hours. It is withdrawable &mdash; unlike the Stage 1 and Stage 2 bonus vouchers, the fee rebate is real cash you can withdraw immediately.</p>
`
};

// GAP-04: Futures code (after-tier-table)
const futuresCode = {
  id: 'binance-futures-code',
  position: 'after-tier-table',
  heading: 'Binance Futures Referral Code: Is It the Same?',
  html: `
<p>Yes &mdash; the same referral code <strong>CRYPTOBONW</strong> applies to both Binance Spot and Binance Futures. You do not need a separate futures-specific code. Registration is shared: one Binance account gives you access to both platforms.</p>

<h3>What's Different for Futures</h3>
<table>
<thead><tr><th></th><th>Spot Trading</th><th>USDT-M Futures</th></tr></thead>
<tbody>
<tr><td><strong>Base Fee (VIP 0)</strong></td><td>0.1% maker / 0.1% taker</td><td>0.02% maker / 0.05% taker</td></tr>
<tr><td><strong>BNB Discount</strong></td><td>25% off fees</td><td>10% off fees (lower on Futures)</td></tr>
<tr><td><strong>Referral 20% Rebate</strong></td><td>Yes &mdash; on all spot fees</td><td>Yes &mdash; on all futures fees</td></tr>
<tr><td><strong>Effective Rate (CRYPTOBONW + BNB)</strong></td><td>~0.060% maker/taker</td><td>~0.014% maker / 0.036% taker</td></tr>
<tr><td><strong>Max Leverage</strong></td><td>N/A (spot)</td><td>Up to 125&times; (BTC/USDT)</td></tr>
</tbody>
</table>

<h3>Futures Welcome Bonus (Stage 2)</h3>
<p>Stage 2 tiers 4&ndash;7 explicitly allow <strong>Spot or Futures trading volume</strong> to count toward the volume requirement. This means futures traders can reach the higher tiers faster &mdash; e.g., Tier 4 requires $500,000 in 14 days, which a futures trader using leverage can achieve with significantly less capital at risk than a spot trader.</p>

<h3>Binance Futures vs Bybit Futures: Fee Comparison</h3>
<table>
<thead><tr><th></th><th>Binance Futures (CRYPTOBONW)</th><th>Bybit Futures (CRYPTOBONUSW)</th></tr></thead>
<tbody>
<tr><td>Maker Fee</td><td>0.02%</td><td>0.02%</td></tr>
<tr><td>Taker Fee</td><td>0.05%</td><td>0.055%</td></tr>
<tr><td>Max Leverage (BTC)</td><td>125&times;</td><td>100&times;</td></tr>
<tr><td>Welcome Bonus</td><td>Up to 19,800 USDT</td><td>Up to 30,000 USDT</td></tr>
<tr><td>KYC Required</td><td>Yes</td><td>Yes</td></tr>
</tbody>
</table>
<p>For pure futures trading, Binance has a slight edge on taker fees (0.05% vs 0.055%) and maximum leverage (125&times; vs 100&times;). Bybit's welcome package is larger for futures-focused traders who can hit the volume tiers.</p>
`
};

const sections = bn.flagshipSections;

// Find insertion indices
const feeStructureIdx = sections.findIndex(s => s.id === 'fee-structure');
const troubleshootingIdx = sections.findIndex(s => s.id === 'troubleshooting-code');
const referralLiteIdx = sections.findIndex(s => s.id === 'referral-lite-vs-pro');

console.log('Before insertions:');
sections.forEach((s,i) => console.log(i, s.id, '|', s.position));
console.log('fee-structure at:', feeStructureIdx);
console.log('troubleshooting-code at:', troubleshootingIdx);
console.log('referral-lite-vs-pro at:', referralLiteIdx);

// Insert in reverse order to preserve indices
// 1. Insert futures-code BEFORE fee-structure
sections.splice(feeStructureIdx, 0, futuresCode);

// 2. Insert fee-stacking BEFORE fee-structure (futures-code is now AT feeStructureIdx, fee-structure shifted +1)
const newFeeStructureIdx = sections.findIndex(s => s.id === 'fee-structure');
sections.splice(newFeeStructureIdx, 0, feeStacking);

// 3. Insert verify-code-worked AFTER troubleshooting-code
const newTroubleshootingIdx = sections.findIndex(s => s.id === 'troubleshooting-code');
sections.splice(newTroubleshootingIdx + 1, 0, verifyCodeWorked);

// 4. Insert earn-own-code AFTER referral-lite-vs-pro
const newReferralLiteIdx = sections.findIndex(s => s.id === 'referral-lite-vs-pro');
sections.splice(newReferralLiteIdx + 1, 0, earnOwnCode);

console.log('\nAfter insertions:');
sections.forEach((s,i) => console.log(i, s.id, '|', s.position));
console.log('\nTotal sections:', sections.length);

writeFileSync(path, JSON.stringify(data, null, 2));

// Validate
const check = JSON.parse(readFileSync(path, 'utf8'));
console.log('\nValidation OK. Final count:', check.exchanges.binance.flagshipSections.length);
