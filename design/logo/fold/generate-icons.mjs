import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Install librsvg to provide rsvg-convert (macOS: brew install librsvg).
const output = new URL('../../../public/icon/', import.meta.url);
mkdirSync(output, { recursive: true });

for (const size of [16, 32, 48, 96, 128]) {
  const source = new URL(size <= 32 ? 'logo-small.svg' : 'logo.svg', import.meta.url);
  execFileSync('rsvg-convert', [
    '--width', String(size),
    '--height', String(size),
    '--output', fileURLToPath(new URL(`${size}.png`, output)),
    fileURLToPath(source),
  ]);
  console.log(`Exported public/icon/${size}.png`);
}
