import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Install librsvg to provide rsvg-convert (macOS: brew install librsvg).
const output = new URL('../../../public/icon/', import.meta.url);
mkdirSync(output, { recursive: true });

// The 128px icon is the one Chrome shows on install and the Chrome Web Store lists: its artwork should be about
// 96px wide, inside transparent padding. logo.svg drawn at 112px on a 128px page is 96px wide (its own margins
// make up the rest). Toolbar sizes stay full-bleed.
const PADDED = { 128: 112 };

for (const size of [16, 32, 48, 96, 128]) {
  const source = new URL(size <= 32 ? 'logo-small.svg' : 'logo.svg', import.meta.url);
  const drawn = PADDED[size] ?? size;
  const offset = String((size - drawn) / 2);
  execFileSync('rsvg-convert', [
    '--page-width', String(size),
    '--page-height', String(size),
    '--left', offset,
    '--top', offset,
    '--width', String(drawn),
    '--height', String(drawn),
    '--output', fileURLToPath(new URL(`${size}.png`, output)),
    fileURLToPath(source),
  ]);
  console.log(`Exported public/icon/${size}.png`);
}
