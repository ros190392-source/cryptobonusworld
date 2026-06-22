import sharp from 'sharp';
import fs from 'fs';

const tasks = [
  // MEXC — from 15:40 source files
  { src: 'incoming/mexc-visual-master-v1/source-og.png',      w:1200, h:630,  slug:'mexc',  type:'og'      },
  { src: 'incoming/mexc-visual-master-v1/source-article.png', w:1200, h:675,  slug:'mexc',  type:'article' },
  { src: 'incoming/mexc-visual-master-v1/source-card.png',    w:1200, h:800,  slug:'mexc',  type:'card'    },
  // BYBIT RESTORE — from 13:10 source files (correct amber Bybit images)
  { src: 'incoming/bybit-visual-master-v1/base-og.png',       w:1200, h:630,  slug:'bybit', type:'og'      },
  { src: 'incoming/bybit-visual-master-v1/base-article.png',  w:1200, h:675,  slug:'bybit', type:'article' },
  { src: 'incoming/bybit-visual-master-v1/base-card.png',     w:1200, h:800,  slug:'bybit', type:'card'    },
];

for (const t of tasks) {
  const base  = `public/media/exchanges/${t.slug}/base/${t.slug}-${t.type}-base-v1-${t.w}x${t.h}.jpg`;
  const final = `public/media/exchanges/${t.slug}/final/${t.slug}-${t.type}-final-v1-${t.w}x${t.h}.jpg`;
  fs.mkdirSync(`public/media/exchanges/${t.slug}/base`,  { recursive: true });
  fs.mkdirSync(`public/media/exchanges/${t.slug}/final`, { recursive: true });
  await sharp(t.src).resize(t.w, t.h, { fit: 'cover', position: 'centre' }).jpeg({ quality: 90 }).toFile(base);
  fs.copyFileSync(base, final);
  const stat = fs.statSync(final);
  const meta = await sharp(final).metadata();
  console.log(`${t.slug.toUpperCase().padEnd(5)} ${t.type.padEnd(8)} | ${meta.width}x${meta.height} | ${(stat.size/1024).toFixed(1)} KB | ${final}`);
}
console.log('DONE');
