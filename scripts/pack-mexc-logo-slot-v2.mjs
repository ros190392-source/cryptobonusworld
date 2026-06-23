/**
 * pack-mexc-logo-slot-v2.mjs
 *
 * Creates MEXC visual pack using the fixed Logo Slot Standard v1.
 * Logo slot uses exact pixel dimensions (not T-token percentages).
 * Descriptor and button positions remain on T-token proportions.
 *
 * Spec: docs/CBW_EXCHANGE_LOGO_SLOT_STANDARD_v1.md
 *
 * Output: public/media/exchanges/mexc/preview/
 *   mexc-og-logo-slot-v2-1200x630.jpg
 *   mexc-article-logo-slot-v2-1200x675.jpg
 *   mexc-card-logo-slot-v2-1200x800.jpg
 *
 * Run: node scripts/pack-mexc-logo-slot-v2.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// ── LOGO SLOT STANDARD v1 — DO NOT MODIFY ────────────────────────────
// Source: docs/CBW_EXCHANGE_LOGO_SLOT_STANDARD_v1.md
const LOGO_SLOT = {
  card:    { slotW: 520, slotH: 135, maxLogoW: 460, maxLogoH:  95, centerY: 228, centerX: 600 },
  og:      { slotW: 520, slotH: 120, maxLogoW: 460, maxLogoH:  85, centerY: 180, centerX: 600 },
  article: { slotW: 520, slotH: 125, maxLogoW: 460, maxLogoH:  90, centerY: 192, centerX: 600 },
};

// ── BYBIT GOLDEN TEMPLATE T-TOKENS (descriptor + button positions) ────
// Source: pixel brightness scan of bybit-card-final-v1-1200x800.jpg
// Logo position is overridden by LOGO_SLOT above; only text/btn use these.
const T = {
  text:   { centerY: 0.550, h: 0.160 },
  btn:    { centerY: 0.755, h: 0.130 },
  btnW:   0.40,
};

// MEXC brand palette
const MEXC_COLORS = {
  bgErase:     '#05101f',
  btnGradTop:  '#06ccf5',
  btnGradBot:  '#0062e0',
  btnGlow:     '#00d8ff',
  btnText:     '#040c1c',
  textFill:    '#ffffff',
  textShadow:  '#000000',
};

// MEXC trimmed logo (AR used for contain-fit within maxLogoW × maxLogoH)
const TRIMMED_AR = 242 / 47;   // 5.149

const FORMATS = [
  {
    name: 'card',
    src:  'public/media/exchanges/mexc/final/mexc-card-final-v2-1200x800.jpg',
    w: 1200, h: 800,
    // Old logo box positions — used to size the gradient erase
    existing: { logoBoxY1: 178, logoBoxY2: 355, btnCoreY1: 498, btnCoreY2: 650 },
  },
  {
    name: 'og',
    src:  'public/media/exchanges/mexc/final/mexc-og-final-v2-1200x630.jpg',
    w: 1200, h: 630,
    existing: { logoBoxY1: 140, logoBoxY2: 280, btnCoreY1: 392, btnCoreY2: 512 },
  },
  {
    name: 'article',
    src:  'public/media/exchanges/mexc/final/mexc-article-final-v2-1200x675.jpg',
    w: 1200, h: 675,
    existing: { logoBoxY1: 150, logoBoxY2: 300, btnCoreY1: 420, btnCoreY2: 548 },
  },
];

// ── Cursor SVG — pointer hand, viewBox 24×32, unified path ───────────
function cursorSvg(sz) {
  const h = Math.round(sz * 32 / 24);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${h}" viewBox="0 0 24 32">
      <defs>
        <filter id="cs" x="-45%" y="-25%" width="190%" height="155%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.55"/>
        </filter>
      </defs>
      <g filter="url(#cs)">
        <path d="M11,1 C9,1 8,2 8,4 L8,17 C6,16 4,17 4,19 C4,21 5,22 7,22 L7,25 C5,25 4,26 4,28 C4,30 5,31 7,31 L17,31 C20,31 22,29 22,26 L22,20 C22,18 20,17 18,17 L18,14 C18,12 16,11 14,12 L14,4 C14,2 13,1 11,1 Z"
              fill="white" stroke="#1a1a1a" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>
        <line x1="18" y1="2" x2="21" y2="0" stroke="white" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>
        <line x1="21" y1="5" x2="24" y2="4" stroke="white" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>
        <line x1="20" y1="8" x2="23" y2="9" stroke="white" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>
      </g>
    </svg>`
  );
}

fs.mkdirSync('public/media/exchanges/mexc/preview', { recursive: true });

for (const fmt of FORMATS) {
  const W = fmt.w, H = fmt.h;
  const slot = LOGO_SLOT[fmt.name];

  // ── Logo slot (fixed pixel dimensions) ──────────────────────────────
  const plaqueW = slot.slotW;
  const plaqueH = slot.slotH;
  const plaqueX = slot.centerX - Math.round(plaqueW / 2);      // = 340
  const plaqueY = slot.centerY - Math.round(plaqueH / 2);

  // Contain-fit trimmed logo within maxLogoW × maxLogoH
  let innerLogoW, innerLogoH;
  const wByW = slot.maxLogoW;
  const hByW = Math.round(wByW / TRIMMED_AR);
  const hByH = slot.maxLogoH;
  const wByH = Math.round(hByH * TRIMMED_AR);

  if (hByW <= slot.maxLogoH) {
    // Width-constrained: width = maxLogoW
    innerLogoW = wByW;
    innerLogoH = hByW;
  } else {
    // Height-constrained: height = maxLogoH
    innerLogoH = hByH;
    innerLogoW = wByH;
  }
  const innerLeft = Math.round((plaqueW - innerLogoW) / 2);
  const innerTop  = Math.round((plaqueH - innerLogoH) / 2);

  // ── Descriptor (T-token) ─────────────────────────────────────────────
  const textCY   = Math.round(T.text.centerY * H);
  const textH    = Math.round(T.text.h * H);
  const fontSize = Math.round(textH * 0.88);
  const textY    = textCY + Math.round(fontSize * 0.36);

  // ── Button (T-token) ─────────────────────────────────────────────────
  const btnH  = Math.round(T.btn.h * H);
  const btnCY = Math.round(T.btn.centerY * H);
  const btnY  = btnCY - Math.round(btnH / 2);
  const btnW  = Math.round(T.btnW * W);
  const btnX  = Math.round((W - btnW) / 2);
  const btnR  = Math.round(btnH / 2);
  const bFontS = Math.round(btnH * 0.40);

  // ── Cursor ────────────────────────────────────────────────────────────
  const curSz = Math.round(btnH * 0.90);
  const curH  = Math.round(curSz * 32 / 24);
  const curX  = btnX + btnW - Math.round(curSz * 0.5) + 4;
  const curY  = btnY + Math.round((btnH - curH) * 0.4);

  // ── Gradient erase: dark center covers old logo + button zone ────────
  const contentCenterY_pct = ((plaqueY + btnY + btnH) / 2 / H * 100).toFixed(1);
  const svgLayer = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="btnG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${MEXC_COLORS.btnGradTop}"/>
      <stop offset="100%" stop-color="${MEXC_COLORS.btnGradBot}"/>
    </linearGradient>
    <filter id="textShadow">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="${MEXC_COLORS.textShadow}" flood-opacity="0.75"/>
    </filter>
    <filter id="glowF" x="-10%" y="-20%" width="120%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="${MEXC_COLORS.btnGlow}" flood-opacity="0.55"/>
    </filter>
    <radialGradient id="grd" cx="50%" cy="${contentCenterY_pct}%" r="55%" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="${MEXC_COLORS.bgErase}" stop-opacity="0.98"/>
      <stop offset="50%"  stop-color="${MEXC_COLORS.bgErase}" stop-opacity="0.94"/>
      <stop offset="78%"  stop-color="${MEXC_COLORS.bgErase}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${MEXC_COLORS.bgErase}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#grd)"/>

  <text x="${W / 2}" y="${textY}"
        font-family="'Arial Black', 'Arial', 'Helvetica Neue', sans-serif"
        font-weight="900"
        font-size="${fontSize}"
        fill="${MEXC_COLORS.textFill}"
        text-anchor="middle"
        letter-spacing="3"
        filter="url(#textShadow)">REFERRAL CODE</text>

  <rect x="${btnX - 4}" y="${btnY - 4}" width="${btnW + 8}" height="${btnH + 8}"
        rx="${btnR + 4}" ry="${btnR + 4}"
        fill="none" stroke="${MEXC_COLORS.btnGlow}" stroke-width="2.5" opacity="0.65"
        filter="url(#glowF)"/>

  <rect x="${btnX}" y="${btnY}" width="${btnW}" height="${btnH}"
        rx="${btnR}" ry="${btnR}"
        fill="url(#btnG)"/>

  <text x="${btnX + Math.round(btnW * 0.46)}" y="${btnY + Math.round(btnH * 0.65)}"
        font-family="'Arial Black', 'Arial', 'Helvetica Neue', sans-serif"
        font-weight="900"
        font-size="${bFontS}"
        fill="${MEXC_COLORS.btnText}"
        text-anchor="middle"
        letter-spacing="2">CLICK TO CLAIM</text>
</svg>`;

  // ── White plaque PNG ──────────────────────────────────────────────────
  const plaqueSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${plaqueW}" height="${plaqueH}">
    <rect width="${plaqueW}" height="${plaqueH}" rx="14" ry="14" fill="white"/>
  </svg>`;
  const plaqueBuf = await sharp(Buffer.from(plaqueSvg))
    .composite([{
      input: await sharp('public/media/exchanges/mexc/logo/mexc-logo-official-trimmed.png')
        .resize(innerLogoW, innerLogoH, { fit: 'fill' }).toBuffer(),
      top: innerTop, left: innerLeft,
    }])
    .png()
    .toBuffer();

  const curBuf = cursorSvg(curSz);

  // ── Compose & write ───────────────────────────────────────────────────
  const dims   = `${W}x${H}`;
  const outFile = `public/media/exchanges/mexc/preview/mexc-${fmt.name}-logo-slot-v2-${dims}.jpg`;

  await sharp(fmt.src)
    .composite([
      { input: Buffer.from(svgLayer), blend: 'over', top: 0, left: 0 },
      { input: plaqueBuf, blend: 'over', top: plaqueY, left: plaqueX },
      { input: curBuf,    blend: 'over', top: curY,    left: curX    },
    ])
    .jpeg({ quality: 92, progressive: true })
    .toFile(outFile);

  const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(1);
  console.log(`✅ ${path.basename(outFile)}  (${dims})  ${sizeKB} KB`);
  console.log(`   slot:   x=${plaqueX}–${plaqueX+plaqueW}  y=${plaqueY}–${plaqueY+plaqueH}  ${plaqueW}×${plaqueH}  centerY=${slot.centerY}`);
  console.log(`   logo:   ${innerLogoW}×${innerLogoH} (max ${slot.maxLogoW}×${slot.maxLogoH})  left=${innerLeft} top=${innerTop}`);
  console.log(`   text:   centerY=${textCY}  fontSize=${fontSize}`);
  console.log(`   btn:    y=${btnY}–${btnY+btnH}  x=${btnX}  w=${btnW}  centerY=${btnCY}`);
  console.log('');
}

console.log('Preview files ready: public/media/exchanges/mexc/preview/');
console.log('Standard: docs/CBW_EXCHANGE_LOGO_SLOT_STANDARD_v1.md');
