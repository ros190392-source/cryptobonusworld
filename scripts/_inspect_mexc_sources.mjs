import sharp from 'sharp';

const sources = [
  'C:/Users/ros19/Downloads/ChatGPT Image 22 июн. 2026 г., 18_12_57 (1).png',
  'C:/Users/ros19/Downloads/ChatGPT Image 22 июн. 2026 г., 18_12_58 (2).png',
  'C:/Users/ros19/Downloads/ChatGPT Image 22 июн. 2026 г., 18_13_00 (3).png',
];

const targets = [
  { name: 'OG',      w: 1200, h: 630 },
  { name: 'Article', w: 1200, h: 675 },
  { name: 'Card',    w: 1200, h: 800 },
];

const metas = [];
for (let i = 0; i < sources.length; i++) {
  const m = await sharp(sources[i]).metadata();
  const ratio = m.width / m.height;
  const sizeKB = (await sharp(sources[i]).toBuffer()).length / 1024;
  metas.push({ idx: i + 1, w: m.width, h: m.height, ratio, format: m.format, sizeKB });
}

console.log('Source files:');
metas.forEach(m => {
  console.log(`  File ${m.idx}: ${m.w}x${m.h}  ratio=${m.ratio.toFixed(4)}  format=${m.format}  ${m.sizeKB.toFixed(0)}KB`);
});

console.log('\nTarget ratios:');
targets.forEach(t => console.log(`  ${t.name.padEnd(8)}: ${t.w}x${t.h}  ratio=${(t.w/t.h).toFixed(4)}`));

console.log('\nBest mapping:');
const used = new Set();
for (const t of targets) {
  let best = null, bestDiff = Infinity;
  const tRatio = t.w / t.h;
  for (const m of metas) {
    if (used.has(m.idx)) continue;
    const diff = Math.abs(m.ratio - tRatio);
    if (diff < bestDiff) { bestDiff = diff; best = m; }
  }
  used.add(best.idx);
  console.log(`  ${t.name.padEnd(8)} → File ${best.idx}  (${best.w}x${best.h}, ratio diff=${bestDiff.toFixed(4)})`);
}
