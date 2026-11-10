#!/usr/bin/env node
/**
 * The skills review page's check (not part of npm test): serves the built dev-dist/ as plain files, opens every
 * step of every skill on dev/skills-review.html at 390×844 in Chromium (in each band when --bands), screenshots
 * each, and fails on any console error, page error, failed non-font request, or a step where the player shows
 * nothing. The UI-design and clinical QC passes read the screenshots (index.json lists them in review order).
 *   npx vite build --config dev/vite.harness.config.ts
 *   node dev/review/skills-shots.mjs [shots dir] [--skill <id>] [--bands] [--all]   (default dev-dist/skills-shots)
 *   --all adds 360×780 and the light theme.
 * Uses the preinstalled Playwright and its browsers (PLAYWRIGHT_BROWSERS_PATH, default /opt/pw-browsers).
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = join(ROOT, 'dev-dist');
const PAGE = 'dev/skills-review.html';
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const SHOTS = resolve(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--skill') ?? join(DIST, 'skills-shots'));
const ONLY = opt('--skill');
const BANDS = flag('--bands') ? [null, 'steady', 'stirred', 'flooded'] : [null];
// --all: both phone sizes the plan names (390×844, 360×780) and both themes; else 390×844 dark.
const VIEWPORTS = flag('--all') ? [[390, 844], [360, 780]] : [[390, 844]];
const THEMES = flag('--all') ? ['dark', 'light'] : ['dark'];
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '/opt/pw-browsers';

if (!existsSync(join(DIST, PAGE))) {
  console.error(`No ${join(DIST, PAGE)}: run npx vite build --config dev/vite.harness.config.ts first.`);
  process.exit(2);
}
async function loadPlaywright() {
  for (const m of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright/index.mjs'].filter(Boolean)) {
    try { return await import(m); } catch { /* next */ }
  }
  throw new Error('Playwright not found (set PLAYWRIGHT_MODULE)');
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const p = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(DIST) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/${PAGE}`;

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const problems = [];
let where = 'index';
page.on('console', (m) => { if (m.type() === 'error') problems.push(`${where}: console: ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`${where}: page error: ${e.message}`));
page.on('requestfailed', (r) => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) problems.push(`${where}: request failed: ${r.url()}`); });

await page.goto(base);
await page.waitForFunction(() => !!window.__skillsMap);
// A pointer first, as a person on a phone: focus moved by a step (its title) then shows no keyboard ring.
await page.mouse.click(2, 2);
const map = (await page.evaluate(() => window.__skillsMap)).filter((s) => !ONLY || s.skill === ONLY);
mkdirSync(SHOTS, { recursive: true });
const index = [];
for (const [vw, vh] of VIEWPORTS) {
await page.setViewportSize({ width: vw, height: vh });
for (const theme of THEMES) {
for (const { skill, steps } of map) {
  for (const step of steps) {
    for (const band of BANDS) {
      where = `${skill}/${step}${band ? `@${band}` : ''}${vw !== 390 ? `@${vw}` : ''}${theme !== 'dark' ? `@${theme}` : ''}`;
      const hash = new URLSearchParams({ k: skill, s: step, ...(band ? { band } : {}), ...(theme !== 'dark' ? { theme } : {}) }).toString();
      await page.evaluate((h) => { location.hash = h; }, hash);
      await page.waitForSelector(`[data-testid="skill-player"][data-step="${step}"]`, { timeout: 8000 })
        .catch(() => problems.push(`${where}: the player never reached the step`));
      await page.waitForTimeout(900); // the witness beat's pace, and the step's enter animation
      const empty = await page.evaluate(() => (document.querySelector('[data-testid="skill-player"]')?.textContent ?? '').trim().length === 0);
      if (empty) problems.push(`${where}: the step shows nothing`);
      const file = `${where.replace(/[/@]/g, '__')}.png`;
      await page.screenshot({ path: join(SHOTS, file), fullPage: true });
      index.push({ skill, step, band, viewport: `${vw}x${vh}`, theme, file });
      // A hold mid-way, for the look of the fill and the pulse: press (or tap a timed ring), wait, shoot, let go.
      const ring = await page.$('[data-testid="hold-ring"] button[data-hold], [data-testid="hold-ring"] button[aria-pressed]');
      if (ring && !band && vw === 390 && theme === 'dark') {
        const box = await ring.boundingBox();
        const timed = (await ring.getAttribute('aria-pressed')) !== null;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        if (timed) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); else await page.mouse.down();
        await page.waitForTimeout(1600);
        const held = `${where.replace(/[/@]/g, '__')}__holding.png`;
        await page.screenshot({ path: join(SHOTS, held), fullPage: true });
        if (!timed) await page.mouse.up();
        await page.waitForTimeout(200);
        await page.screenshot({ path: join(SHOTS, held.replace('holding', 'released')), fullPage: true });
        index.push({ skill, step, band, file: held }, { skill, step, band, file: held.replace('holding', 'released') });
      }
    }
  }
}
}
}
writeFileSync(join(SHOTS, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
await browser.close();
server.close();
console.log(`${index.length} screenshots in ${SHOTS}`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
