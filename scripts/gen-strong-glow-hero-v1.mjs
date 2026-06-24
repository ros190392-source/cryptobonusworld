#!/usr/bin/env node
/**
 * gen-strong-glow-hero-v1.mjs
 *
 * strong_glow INHERITS soft_glow geometry and only increases intensity/spread.
 *
 * Approach:
 *   - Base image: cbw-hero-neutral-logo-glow-v2.png (soft_glow)
 *     → preserves the exact glow center, atmosphere, and composition
 *   - Overlay: a radial gradient ellipse at the DETECTED soft_glow glow center,
 *     slightly wider/taller, with modest opacity to boost brightness
 *   - Result: looks like "soft_glow but brighter" — NOT a new spotlight
 *
 * Detected soft_glow glow center (auto-detected via brightness centroid):
 *   cx = 1089px (50.1% of 2172px width)
 *   cy = 221px  (30.5% of 724px height)
 *
 * strong_glow vs soft_glow token delta (from CBW_EXCHANGE_VISUAL_PACK_FACTORY_STANDARD_v1.md §3D):
 *
 *   | Token           | soft_glow  | strong_glow |
 *   |-----------------|------------|-------------|
 *   | center-X        | 50.1%      | 50.1% (same)|
 *   | center-Y        | 30.5%      | 30.5% (same)|
 *   | opacity-center  | 0.65       | 0.78–0.82   |
 *   | glow-width      | 145% slot  | 160% slot   |
 *   | glow-height     | 125% slot  | 140% slot   |
 *   | feather         | soft (70%) | soft (70%)  |
 *
 * Logo slot in image-space (2172×724 displayed at 1440px via cover/center-center):
 *   display scale   = 1440 / 2172 = 0.663
 *   slot-W (img px) = 320 / 0.663 = 483 px
 *   slot-H (img px) =  96 / 0.663 = 145 px
 *   soft_glow rx    = (145% × 483) / 2 = 350 px
 *   soft_glow ry    = (125% × 145) / 2 =  91 px
 *   strong_glow rx  = (160% × 483) / 2 = 386 px  ← slightly wider
 *   strong_glow ry  = (140% × 145) / 2 = 102 px  ← slightly taller
 *
 * Overlay opacity strategy:
 *   soft_glow peak brightness ≈ 66% of full white (measured: 510/765)
 *   Target for strong_glow: 78–82% peak
 *   Using overlay opacity 0.30 → result ≈ 0.30 + 0.667 × 0.70 = 0.77 ≈ 77%
 *   (close to 78%; feather shape makes center slightly higher)
 */

import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Paths ────────────────────────────────────────────────────────────────────
// BASE = soft_glow (inherits its geometry, atmosphere, glow position)
const BASE = resolve(ROOT, 'public/media/hero-backgrounds/cbw-hero-neutral-logo-glow-v2.png');
const OUT  = resolve(ROOT, 'public/media/hero-backgrounds/cbw-hero-neutral-strong-glow-v1.png');

// ── Image dimensions ─────────────────────────────────────────────────────────
const W = 2172;
const H = 724;

// ── Glow center — inherited from soft_glow (auto-detected) ───────────────────
const cx = 1089; // 50.1% — horizontally centered
const cy = 221;  // 30.5% — upper-middle, aligned to logo slot

// ── Overlay radius — strong_glow is slightly wider than soft_glow ─────────────
const rx = 386;  // 160% of logo slot (vs 350 for soft_glow)
const ry = 102;  // 140% of logo slot (vs 91 for soft_glow)

// ── Overlay center opacity — modest boost, not a new lamp ────────────────────
const overlayOpacity = 0.30; // result peak ≈ 77%, within 0.78–0.82 target
const fadeStop = 0.70;       // gradient reaches 0 at 70% of radius

// ── SVG radial overlay ────────────────────────────────────────────────────────
const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sg"
      gradientUnits="userSpaceOnUse"
      cx="${cx}" cy="${cy}"
      rx="${rx}" ry="${ry}">
      <stop offset="0%"                               stop-color="rgb(235,245,255)" stop-opacity="${overlayOpacity}"/>
      <stop offset="${Math.round(fadeStop * 100)}%"   stop-color="rgb(235,245,255)" stop-opacity="0"/>
      <stop offset="100%"                             stop-color="rgb(235,245,255)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sg)"/>
</svg>`;

// ── Build ────────────────────────────────────────────────────────────────────
console.log('strong_glow generator — inherits soft_glow geometry');
console.log(`Base (soft_glow):  ${BASE}`);
console.log(`Output:            ${OUT}`);
console.log(`Glow center:       cx=${cx} (${(cx/W*100).toFixed(1)}%)  cy=${cy} (${(cy/H*100).toFixed(1)}%)`);
console.log(`Overlay radii:     rx=${rx}  ry=${ry}`);
console.log(`Overlay opacity:   ${overlayOpacity} (target peak ≈ 77–82% of full white)`);

await sharp(BASE)
  .composite([{ input: Buffer.from(svg), blend: 'over' }])
  .png({ compressionLevel: 8, effort: 7 })
  .toFile(OUT);

const { size } = await import('fs').then(fs => Promise.resolve(fs.statSync(OUT)));
console.log(`\n✅ Written: ${OUT}  (${Math.round(size / 1024)} KB)`);
console.log(`\nVerify: strong_glow must look like soft_glow but brighter.`);
console.log(`  - Same glow position (cx=${cx}, cy=${cy})`);
console.log(`  - No new spotlight, no circular lamp`);
console.log(`  - Logo readability zone unchanged`);
