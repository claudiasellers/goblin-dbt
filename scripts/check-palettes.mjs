#!/usr/bin/env node
/**
 * Contrast check for every palette in src/index.css, both themes.
 *
 * Reads the `--pal-*-light` / `--pal-*-dark` pairs from each
 * `:root[data-palette="..."]` block and prints WCAG 2 contrast ratios for
 * the pairs that matter. Exits 1 if a text pair drops under 4.5:1.
 * The danger button is reported but only warns (see the palette picker
 * spec: Clouds keeps Claudia's rust at 4.2 in light by decision).
 *
 * Usage: node scripts/check-palettes.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(root, 'src/index.css'), 'utf8');

function lum(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Split into palette blocks: selector { body }
const blockRe = /(:root[^{]*?data-palette="([a-z-]+)"[^{]*)\{([^}]*)\}/g;
const palettes = {};
let m;
while ((m = blockRe.exec(css))) {
  const id = m[2];
  const body = m[3];
  const vals = { light: {}, dark: {} };
  const pairRe = /--pal-([a-z0-9-]+)-(light|dark):\s*(#[0-9A-Fa-f]{6})/g;
  let p;
  while ((p = pairRe.exec(body))) vals[p[2]][p[1]] = p[3].toUpperCase();
  palettes[id] = vals;
}

const ids = Object.keys(palettes);
if (ids.length === 0) {
  console.error('No palette blocks found in src/index.css');
  process.exit(1);
}

let failures = 0;
const fmt = (n) => n.toFixed(1).padStart(5);

for (const id of ids) {
  for (const theme of ['light', 'dark']) {
    const t = palettes[id][theme];
    const checks = [
      ['ink on page', t.ink, t.page, true],
      ['secondary on page', t.text2, t.page, true],
      ['tertiary on card', t.text3, t.card, true],
      ['on-accent on action', t['on-accent'], t['accent-fill'], true],
      ['on-danger on danger', t['on-danger'], t.danger, false],
      ['HU text on card', t['q-hu-text'], t.card, true],
      ['HP text on card', t['q-hp-text'], t.card, true],
      ['LU text on card', t['q-lu-text'], t.card, true],
      ['LP text on card', t['q-lp-text'], t.card, true],
    ];
    const lines = [];
    for (const [label, fg, bg, strict] of checks) {
      if (!fg || !bg) { lines.push(`  ${label.padEnd(22)}  missing token`); failures++; continue; }
      const r = ratio(fg, bg);
      let mark = '';
      if (r < 4.5) { mark = strict ? '  FAIL' : '  warn'; if (strict) failures++; }
      lines.push(`  ${label.padEnd(22)} ${fmt(r)}${mark}`);
    }
    console.log(`${id} / ${theme}`);
    console.log(lines.join('\n'));
  }
  console.log('');
}

if (failures) {
  console.error(`${failures} text pair(s) under 4.5:1`);
  process.exit(1);
}
console.log('All strict pairs pass AA.');
