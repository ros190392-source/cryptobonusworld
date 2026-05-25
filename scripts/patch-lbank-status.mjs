import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../src/data/exchanges.json');
const exchanges = JSON.parse(readFileSync(dataPath, 'utf8'));
const lb = exchanges.find(e => e.slug === 'lbank');
if (lb) {
  lb.verificationStatus = 'verified';
  lb.offerLastChecked = '2026-05-25';
  console.log('LBank status updated to verified');
}
writeFileSync(dataPath, JSON.stringify(exchanges, null, 2) + '\n', 'utf8');
