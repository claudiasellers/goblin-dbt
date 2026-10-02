// Renders the icon SVGs to PNG with headless Chromium. Run by scripts/icons/build.py.
// `playwright` is not a project dependency: install it ad hoc (npx -p playwright) or point
// PLAYWRIGHT_MODULE at an existing install.
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const mod = process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright';
const { chromium } = await import(mod);

const jobs = [
  ['icon.svg', 'public/apple-touch-icon.png', 180],
  ['icon.svg', 'public/icons/icon-192.png', 192],
  ['icon.svg', 'public/icons/icon-512.png', 512],
  ['icon-maskable.svg', 'public/icons/icon-maskable-512.png', 512],
];

mkdirSync(resolve(root, 'public/icons'), { recursive: true });
const browser = await chromium.launch();
for (const [src, out, size] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const svg = readFileSync(resolve(here, src), 'utf8').replace('<svg ', `<svg width="${size}" height="${size}" `);
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.screenshot({ path: resolve(root, out), clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log(`${out} ${size}x${size}`);
}
await browser.close();
