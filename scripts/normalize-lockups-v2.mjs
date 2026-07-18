// Hero Brand Zone v1 — canonical lockup normalization (9 exchanges).
// Extracts the OFFICIAL icon from the committed canonical asset (crop only,
// no redraw), re-renders the CBW display-name text (sanctioned cbw_icon_lockup
// convention, NOT an official wordmark) at wordmark-first proportions:
//   icon ≈104 canvas-h (→ ~64px at Variant B render 0.6125)
//   word ≈56 canvas-h  (→ ~34px; ratio vs 28px label ≈ 1.22)
// Output: {slug}-logo-lockup-512x160-v2.png (transparent, optically centered).
import sharp from 'sharp';
const JOBS = [
  { slug: 'gate-com', text: 'Gate.com', src: 'public/preview-media/exchanges/gate-com/gate-com-logo-slot-512x160.png' },
  { slug: 'evedex', text: 'EVEDEX', src: 'public/preview-media/exchanges/evedex/evedex-logo-slot-512x160.png' },
  { slug: 'vest-markets', text: 'Vest Markets', src: 'public/preview-media/exchanges/vest-markets/vest-markets-logo-slot-512x160.png' },
  { slug: 'phemex', text: 'Phemex', src: 'public/preview-media/exchanges/phemex/phemex-logo-slot-512x160.png' },
  { slug: 'whitebit', text: 'WhiteBIT', src: 'public/preview-media/exchanges/whitebit/whitebit-logo-slot-512x160.png' },
  { slug: 'htx', text: 'HTX', src: 'public/preview-media/exchanges/htx/htx-logo-lockup-512x160-v1.png' },
  { slug: 'coinbase', text: 'Coinbase', src: 'public/preview-media/exchanges/coinbase/coinbase-logo-lockup-512x160-v1.png' },
  { slug: 'bitmart', text: 'BitMart', src: 'public/preview-media/exchanges/bitmart/bitmart-logo-lockup-512x160-v1.png' },
  { slug: 'xt-com', text: 'XT.COM', src: 'public/preview-media/exchanges/xt-com/xt-com-logo-lockup-512x160-v1.png' },
];
const ICON_H = 104, WORD_H = 56, GAP = 26, BOX_W = 472, CANVAS = { w: 512, h: 160 };

const alphaBounds = async buf => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  const colHas = new Array(info.width).fill(false);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++)
    if (data[(y * info.width + x) * 4 + 3] > 8) { colHas[x] = true; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  return { minX, maxX, minY, maxY, colHas, w: info.width, h: info.height };
};

for (const j of JOBS) {
  const srcBuf = await sharp(j.src).png().toBuffer();
  const b = await alphaBounds(srcBuf);
  // first column cluster = official icon
  const clusters = []; let s = null;
  for (let x = 0; x < b.w; x++) { if (b.colHas[x] && s === null) s = x; if (!b.colHas[x] && s !== null) { clusters.push([s, x - 1]); s = null; } }
  if (s !== null) clusters.push([s, b.w - 1]);
  const merged = [];
  for (const c of clusters) {
    if (merged.length && c[0] - merged[merged.length - 1][1] - 1 < b.w * 0.035) merged[merged.length - 1][1] = c[1];
    else merged.push([...c]);
  }
  const [ix0, ix1] = merged[0];
  // icon vertical bounds within its columns
  const iconRegion = await sharp(srcBuf).extract({ left: ix0, top: 0, width: ix1 - ix0 + 1, height: b.h }).png().toBuffer();
  const ib = await alphaBounds(iconRegion);
  let icon = await sharp(iconRegion).extract({ left: 0, top: ib.minY, width: ix1 - ix0 + 1, height: ib.maxY - ib.minY + 1 })
    .resize({ height: ICON_H, kernel: 'lanczos3' }).png().toBuffer();
  const iMeta = await sharp(icon).metadata();

  // render CBW display text (Arial bold white), then trim + normalize to WORD_H
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="300"><text x="20" y="200" font-family="Arial, Helvetica, sans-serif" font-size="150" font-weight="700" fill="#FFFFFF">${j.text}</text></svg>`;
  let word = await sharp(Buffer.from(svg)).png().toBuffer();
  const wb = await alphaBounds(word);
  word = await sharp(word).extract({ left: wb.minX, top: wb.minY, width: wb.maxX - wb.minX + 1, height: wb.maxY - wb.minY + 1 })
    .resize({ height: WORD_H, kernel: 'lanczos3' }).png().toBuffer();
  let wMeta = await sharp(word).metadata();

  // compose group; cap to BOX_W by scaling the whole group uniformly
  let gw = iMeta.width + GAP + wMeta.width, gh = Math.max(ICON_H, WORD_H);
  let scale = 1;
  if (gw > BOX_W) { scale = BOX_W / gw; }
  const iW = Math.round(iMeta.width * scale), iH = Math.round(ICON_H * scale);
  const wW = Math.round(wMeta.width * scale), wH = Math.round(WORD_H * scale);
  const gap = Math.round(GAP * scale);
  icon = await sharp(icon).resize({ height: iH }).png().toBuffer();
  word = await sharp(word).resize({ height: wH }).png().toBuffer();
  const im = await sharp(icon).metadata(), wm = await sharp(word).metadata();
  gw = im.width + gap + wm.width; gh = Math.max(im.height, wm.height);
  const left = Math.round((CANVAS.w - gw) / 2), top = Math.round((CANVAS.h - gh) / 2);
  await sharp({ create: { width: CANVAS.w, height: CANVAS.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: icon, left, top: top + Math.round((gh - im.height) / 2) },
      { input: word, left: left + im.width + gap, top: top + Math.round((gh - wm.height) / 2) },
    ]).png().toFile(`public/preview-media/exchanges/${j.slug}/${j.slug}-logo-lockup-512x160-v2.png`);
  console.log(`${j.slug}: icon ${im.width}x${im.height} + word ${wm.width}x${wm.height} (gap ${gap}) → group ${gw}x${gh}`);
}
console.log('normalization complete');
