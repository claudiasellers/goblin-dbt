#!/usr/bin/env node
/**
 * The parts accessibility check (not part of npm test): every surface and branch of the review page
 * (dev/parts-review.html, the app's real components) at 390×844 in Chromium, checked for
 *   names     every button, link and chip has an accessible name (the browser's accessibility tree);
 *   keyboard  Tab from just before the surface reaches every control in visual order with a visible focus
 *             indicator, leaves it again (no trap), and Shift+Tab walks back out;
 *   focus     a step change keeps focus in the surface (the new step's heading or first line, never body):
 *             the first and the last control on each screen are pressed with Enter, on a fresh load each;
 *   live      lines that appear without a step change sit in a polite live region (role=status /
 *             aria-live=polite); nothing in a surface is assertive (the app's CrisisBanner is not);
 *   targets   buttons, links and chips are at least 44×44 CSS px (a text link inside a sentence excepted);
 *   motion    with prefers-reduced-motion: reduce, no transform / opacity animation runs past the app's
 *             0.01 ms convention, and every press-and-hold still completes from the keyboard: Space held,
 *             and hands-free from a quick Enter, a quick Space or a switch's click (detail 0);
 *   contrast  text ≥ 4.5:1 (3:1 from 24px, or 18.66px bold) against its actual background, in every
 *             room (src/data/palettes.ts: data-palette and its own data-theme on <html>).
 * Overlays: when a surface shows the host's too-much link, the overlay it opens is checked for Escape and
 * reported as information (the overlay is capacity's, not a parts component).
 *   npx vite build --config dev/vite.harness.config.ts
 *   node dev/review/a11y.mjs [--only <surface>] [--jobs <n>, default 4]
 * Uses the preinstalled Playwright and browsers, as dev/review/check.mjs does. Never installs anything.
 * Problems in a host's own markup (not a parts component) are listed in OUTSIDE_PARTS with the reason, and
 * reported, not failed.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { partsFromFixture } from '../../tests/lib/partsContentFixture.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = join(ROOT, 'dev-dist');
const PAGE = 'dev/parts-review.html';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '/opt/pw-browsers';
const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const only = arg('--only');
const jobs = Math.max(1, Number(arg('--jobs') ?? 4) || 4);

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

const content = partsFromFixture(JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/parts-content.json'), 'utf8')), () => true);
const promptCopy = (id) => (content.prompts[id]?.copy ?? '').split('{')[0].trim();

/** Every room and its own mode (src/data/palettes.ts). */
const ROOMS = [...readFileSync(join(ROOT, 'src/data/palettes.ts'), 'utf8').matchAll(/id: '([\w-]+)',[\s\S]*?mode: '(light|dark)'/g)]
  .map((m) => ({ id: m[1], mode: m[2] }));

/** Lines that appear in place, without a step change: they must be announced. */
const LIVE_LINES = ['angry_later_done', 'ps_later_done', 'cope_save_failed'].map(promptCopy).filter(Boolean);
const LIVE_SELECTORS = ['[data-testid="unblend-line"]', '[data-testid="goal-line"]'];

/**
 * Problems in markup a parts component doesn't own (the host's), matched on the whole report line
 * (`visit: check: text`), with why. Reported every run as `host`; never a failure here.
 */
const OUTSIDE_PARTS = [
  { match: /: contrast: [\w-]+: [\d.]+:1 < 4\.5 on button "[^"]*" in too-much-link /,
    why: 'TooMuchLink (src/components/capacity/) is the host\'s; its muted text is under 4.5:1 in the light rooms' },
  { match: /: focus: after Enter on button "[^"]*" in handoff-card focus went to body$/,
    why: 'BreakdownHandoff (src/components/capacity/): P2\'s own step change' },
  { match: /^checkback--\w+: focus: after Enter on button "[^"]*" in part-checkback(-aftercare)? focus went to body$/,
    why: 'the answered card leaves Today: where focus goes next is TodayStack\'s (here the harness note)' },
  { match: /^offer--\w+: focus: after Enter on button "(?!Show me")[^"]*" in trail-offer(-evidence)? focus went to body$/,
    why: 'an answered offer leaves Today (Yes also opens Meet a part): where focus goes next is TodayStack\'s (here the harness note)' },
  { match: /^debrief--\w+: focus: after Enter on button "[^"]*" focus went to body$/,
    why: 'every debrief tap moves DEAR MAN on (onDone): its next step is DearMan.tsx\'s (here the harness note)' },
  { match: /^cope--pick: focus: after Enter on button "[^"]*" in cope-ahead focus went to body$/,
    why: 'Not sure / Skip move DEAR MAN on (onGoOn): its next step is DearMan.tsx\'s (here the harness note)' },
  { match: /^oa_goal--[\w.-]+: live: not announced: div "[^"]*" in goal-line$/,
    why: 'OppositeAction.tsx renders the goal line (TapCard `before`), above the heading TapCard focuses' },
];

/** Each surface and branch once (angry also in its plain wording); no Show ids twins. */
function plan(map) {
  const visits = [];
  for (const s of map) {
    if (only && s.id !== only) continue;
    for (const b of s.branches.length ? s.branches : ['']) {
      const q = `?s=${s.id}${b ? `&b=${b}` : ''}`;
      visits.push({ name: `${s.id}${b ? `--${b}` : ''}`, query: q, surface: s.id });
      if (s.id === 'angry') visits.push({ name: `${s.id}--${b}--plain`, query: `${q}&plain=1`, surface: s.id });
    }
  }
  return visits;
}

/* ── in-page helpers (serialised into the page) ── */
const PAGE_HELPERS = String.raw`
window.__a11y = (() => {
  const S = () => document.querySelector('[data-testid="surface"]');
  const CONTROL = 'button, a[href], [role=button], [role=link], [role=checkbox], [role=radio], [role=switch], [role=tab], input, select, textarea, [tabindex]';
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const hiddenFromAT = (el) => !!el.closest('[aria-hidden="true"], [inert]');
  const desc = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 48);
    const tid = el.closest('[data-testid]:not([data-testid="surface"])')?.getAttribute('data-testid');
    return el.tagName.toLowerCase() + (t ? ' "' + t + '"' : ' (no text)') + (tid ? ' in ' + tid : '');
  };
  let k = 0;
  const key = (el) => { if (!el.dataset.a11yK) el.dataset.a11yK = String(++k); return el.dataset.a11yK; };
  const controls = () => Array.from(S().querySelectorAll(CONTROL)).filter((el) => visible(el) && !el.disabled && el.tabIndex >= 0);
  const focusStyle = (el) => { const cs = getComputedStyle(el); return cs.outlineStyle + '|' + cs.outlineWidth + '|' + cs.outlineColor + '|' + cs.boxShadow + '|' + cs.borderColor + '|' + cs.backgroundColor; };
  const hasRing = (el) => { const cs = getComputedStyle(el); return (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none'; };
  // Any CSS colour → [r, g, b, a] through a 1×1 canvas.
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (top, under) => { const a = top[3]; return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  /** The colour under an element: its ancestors' backgrounds composited from <html> down; null over an image or gradient. */
  const backdrop = (el) => {
    const chain = []; for (let n = el; n && n.nodeType === 1; n = n.parentElement) chain.push(n);
    let bg = [255, 255, 255, 1];
    for (const n of chain.reverse()) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = rgba(cs.backgroundColor);
      if (c[3] > 0) bg = over(c, bg);
    }
    return bg;
  };
  const textBlocks = () => {
    const out = new Set();
    const w = document.createTreeWalker(S(), NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t; t = w.nextNode()) {
      const el = t.parentElement;
      if (!t.textContent.trim() || !el || hiddenFromAT(el) || !visible(el) || el.closest('svg') || el.closest('button:disabled')) continue;
      out.add(el);
    }
    return [...out];
  };
  return {
    controls() { return controls().map((el) => ({ key: key(el), desc: desc(el) })); },
    focusableHidden() { return Array.from(S().querySelectorAll(CONTROL)).filter((el) => visible(el) && el.tabIndex >= 0 && !el.disabled && hiddenFromAT(el)).map(desc); },
    clickables() {
      // Something that looks pressable (a pointer cursor) but no keyboard can reach.
      return Array.from(S().querySelectorAll('*')).filter((el) => visible(el) && getComputedStyle(el).cursor === 'pointer'
        && !el.closest(CONTROL) && !el.closest('label')).map(desc);
    },
    targets() {
      return controls().filter((el) => !el.matches('input[type=text], textarea, input:not([type])')).map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const p = el.parentElement;
        const inSentence = cs.display === 'inline' && p && Array.from(p.childNodes).some((n) => n !== el && n.textContent && n.textContent.trim());
        return { desc: desc(el), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, inSentence };
      });
    },
    live(lines, selectors) {
      const out = [];
      const els = [...selectors.flatMap((s) => Array.from(S().querySelectorAll(s)))];
      for (const line of lines) {
        const w = document.createTreeWalker(S(), NodeFilter.SHOW_TEXT);
        for (let t = w.nextNode(); t; t = w.nextNode()) if (t.textContent.includes(line)) els.push(t.parentElement);
      }
      for (const el of els) {
        const region = el.closest('[aria-live], [role=status], [role=alert], [role=log]');
        const kind = !region ? 'none' : region.getAttribute('role') === 'alert' || region.getAttribute('aria-live') === 'assertive' ? 'assertive'
          : region.getAttribute('aria-live') === 'off' ? 'none' : 'polite';
        out.push({ desc: desc(el), kind });
      }
      return out;
    },
    assertive() { return Array.from(S().querySelectorAll('[aria-live="assertive"], [role=alert]')).map(desc); },
    contrast() {
      const out = [];
      for (const el of textBlocks()) {
        const cs = getComputedStyle(el);
        const bg = backdrop(el);
        if (!bg) continue;
        let op = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity || '1');
        const fg = rgba(cs.color); fg[3] *= op;
        const r = ratio(over(fg, bg), bg);
        const size = parseFloat(cs.fontSize); const weight = parseInt(cs.fontWeight, 10) || 400;
        const need = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
        if (r < need) out.push({ desc: desc(el), ratio: Math.round(r * 100) / 100, need, color: cs.color, bg: 'rgb(' + bg.slice(0, 3).map(Math.round).join(', ') + ')' });
      }
      return out;
    },
    animations() {
      return document.getAnimations().filter((a) => a.playState !== 'finished').map((a) => {
        const t = a.effect?.getComputedTiming?.() ?? {};
        const kf = a.effect?.getKeyframes?.() ?? [];
        const props = [...new Set(kf.flatMap((f) => Object.keys(f).filter((p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p))))];
        const target = a.effect?.target;
        return { name: a.animationName ?? a.transitionProperty ?? a.id ?? '', duration: t.duration, iterations: t.iterations, props, in: target && S().contains(target) ? desc(target) : null };
      }).filter((a) => a.in && (a.iterations === Infinity || Number(a.duration) > 1) && a.props.some((p) => /transform|opacity|scale|translate|rotate/i.test(p)));
    },
    mark() {
      const s = S();
      if (!document.getElementById('a11y-start')) {
        const a = document.createElement('button'); a.id = 'a11y-start'; a.textContent = 'before'; s.before(a);
        const b = document.createElement('button'); b.id = 'a11y-end'; b.textContent = 'after'; s.after(b);
      }
      document.getElementById('a11y-start').focus();
    },
    active() {
      const el = document.activeElement;
      if (!el || el === document.body) return { where: 'body' };
      if (el.id === 'a11y-start' || el.id === 'a11y-end') return { where: el.id };
      if (!S().contains(el)) return { where: 'outside', desc: desc(el) };
      const r = el.getBoundingClientRect();
      return { where: 'surface', key: key(el), desc: desc(el), top: r.top + scrollY, left: r.left + scrollX, style: focusStyle(el), ring: hasRing(el), fv: el.matches(':focus-visible') };
    },
    restStyle(k) { const el = S().querySelector('[data-a11y-k="' + k + '"]'); return el ? focusStyle(el) : null; },
    pressTarget(which) {
      const all = controls().filter((el) => !el.hasAttribute('data-hold') && !el.matches('input, textarea, select'));
      const el = which === 'first' ? all[0] : all[all.length - 1];
      if (!el) return null;
      el.dataset.a11yProbe = '1'; el.focus();
      return desc(el);
    },
    probeGone() { return !S().querySelector('[data-a11y-probe]'); },
    holds() { return Array.from(S().querySelectorAll('[data-hold]')).filter(visible).length; },
    focusHold() { const el = S().querySelector('[data-hold]'); if (el) el.focus(); return !!el; },
    dialogs() { return Array.from(document.querySelectorAll('[role=dialog], [aria-modal="true"]')).filter(visible).length; },
  };
})();
`;

/* ── serve and visit ── */
const port = 47000 + Math.floor(Math.random() * 2000);
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { server.kill(); process.exit(130); });
const base = `http://127.0.0.1:${port}/${PAGE}`;
const problems = [];
const outside = [];
const info = [];
const report = (visit, check, msg) => {
  const line = `${visit}: ${check}: ${msg}`;
  const known = OUTSIDE_PARTS.find((o) => o.match.test(line));
  (known ? outside : problems).push(`${line}${known ? `  (${known.why})` : ''}`);
};
let visits = [];

async function open(context, v) {
  const page = await context.newPage();
  await page.addInitScript(PAGE_HELPERS);
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (r) => r.abort());
  await page.goto(`${base}${v.query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => {
    const d = document.querySelector('[data-testid="surface"]')?.getAttribute('data-driven') ?? '';
    return d === 'done' || d.startsWith('failed');
  }, null, { timeout: 45000 }).catch(() => {});
  const driven = await page.getAttribute('[data-testid="surface"]', 'data-driven').catch(() => null);
  if (driven !== 'done') report(v.name, 'harness', `branch not reached: ${driven}`);
  await page.waitForTimeout(700);
  return page;
}

async function names(page, v) {
  const cdp = await page.context().newCDPSession(page);
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const sel = '[data-testid="surface"] :is(button, a[href], [role=button], [role=link], [role=checkbox], [role=radio], [role=switch], [role=tab], input, select, textarea)';
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: sel });
  for (const nodeId of nodeIds) {
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
    const n = nodes.find((x) => !x.ignored) ?? nodes[0];
    if (!n || n.ignored) continue;
    const name = (n.name?.value ?? '').trim();
    if (!name) {
      const { outerHTML } = await cdp.send('DOM.getOuterHTML', { nodeId });
      report(v.name, 'names', `${n.role?.value ?? '?'} with no accessible name: ${outerHTML.slice(0, 120)}`);
    }
  }
  await cdp.detach();
}

async function keyboard(page, v) {
  const want = await page.evaluate(() => window.__a11y.controls());
  for (const d of await page.evaluate(() => window.__a11y.focusableHidden())) report(v.name, 'keyboard', `focusable inside aria-hidden: ${d}`);
  for (const d of await page.evaluate(() => window.__a11y.clickables())) report(v.name, 'keyboard', `looks pressable, no keyboard access: ${d}`);
  await page.evaluate(() => window.__a11y.mark());
  const seen = [];
  let out = false;
  for (let i = 0; i < want.length + 40; i++) {
    await page.keyboard.press('Tab');
    const a = await page.evaluate(() => window.__a11y.active());
    if (a.where === 'a11y-end') { out = true; break; }
    if (a.where === 'body' || a.where === 'outside') { report(v.name, 'keyboard', `Tab left the surface for ${a.where}${a.desc ? ` ${a.desc}` : ''}`); out = true; break; }
    if (a.where === 'surface') {
      if (seen.some((s) => s.key === a.key)) { report(v.name, 'keyboard', `focus trap: Tab came back to ${a.desc}`); break; }
      seen.push(a);
    }
  }
  if (!out) report(v.name, 'keyboard', 'Tab never left the surface (trap)');
  const reached = new Set(seen.map((s) => s.key));
  for (const c of want) if (!reached.has(c.key)) report(v.name, 'keyboard', `not reached by Tab: ${c.desc}`);
  for (let i = 1; i < seen.length; i++) {
    const [a, b] = [seen[i - 1], seen[i]];
    if (b.top < a.top - 8 || (Math.abs(b.top - a.top) <= 8 && b.left < a.left - 4)) report(v.name, 'keyboard', `out of visual order: ${b.desc} after ${a.desc}`);
  }
  // A visible indicator: the focused look differs from the resting one, or carries a ring.
  for (const s of seen) {
    const rest = await page.evaluate((k) => window.__a11y.restStyle(k), s.key);
    if (!s.fv) report(v.name, 'keyboard', `no :focus-visible on ${s.desc}`);
    else if (rest === s.style && !s.ring) report(v.name, 'keyboard', `no visible focus indicator on ${s.desc}`);
  }
  let back = false;
  for (let i = 0; i < want.length + 40; i++) {
    await page.keyboard.press('Shift+Tab');
    const a = await page.evaluate(() => window.__a11y.active());
    if (a.where === 'a11y-start') { back = true; break; }
    if (a.where !== 'surface' && a.where !== 'a11y-end') { report(v.name, 'keyboard', `Shift+Tab left the surface for ${a.where}`); back = true; break; }
  }
  if (!back) report(v.name, 'keyboard', 'Shift+Tab never left the surface (trap)');
}

async function stepFocus(context, v, which) {
  const page = await open(context, v);
  try {
    // Keyboard use first, so focus behaves as it does for a keyboard user.
    await page.keyboard.press('Shift');
    const pressed = await page.evaluate((w) => window.__a11y.pressTarget(w), which);
    if (!pressed) return;
    const dialogsBefore = await page.evaluate(() => window.__a11y.dialogs());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    if (await page.evaluate(() => window.__a11y.dialogs()) > dialogsBefore) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      const still = await page.evaluate(() => window.__a11y.dialogs()) > dialogsBefore;
      info.push(`${v.name}: overlay opened by ${pressed} ${still ? 'stays open on Escape' : 'closes on Escape'}`);
      return;
    }
    if (!(await page.evaluate(() => window.__a11y.probeGone()))) return; // no step change
    const a = await page.evaluate(() => window.__a11y.active());
    if (a.where !== 'surface') report(v.name, 'focus', `after Enter on ${pressed} focus went to ${a.where}${a.desc ? ` ${a.desc}` : ''}`);
  } finally {
    await page.close();
  }
}

async function contrast(page, v) {
  // A room change runs the app's colour transitions (lift-primary, chips: 200 ms): read settled colours.
  const style = await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
  for (const room of ROOMS) {
    await page.evaluate((r) => { document.documentElement.dataset.palette = r.id; document.documentElement.dataset.theme = r.mode; }, room);
    await page.waitForTimeout(80);
    for (const c of await page.evaluate(() => window.__a11y.contrast())) {
      report(v.name, 'contrast', `${room.id}: ${c.ratio}:1 < ${c.need} on ${c.desc} (${c.color} on ${c.bg})`);
    }
  }
  await page.evaluate(() => { document.documentElement.dataset.palette = 'velvet'; document.documentElement.dataset.theme = 'dark'; });
  await style.evaluate((n) => n.remove());
}

async function motionAndHold(context, v) {
  const page = await open(context, v);
  try {
    for (const a of await page.evaluate(() => window.__a11y.animations())) {
      report(v.name, 'motion', `${a.props.join('/')} runs ${a.iterations === Infinity ? 'forever' : `${a.duration} ms`} with reduced motion on ${a.in}`);
    }
    if (!(await page.evaluate(() => window.__a11y.holds()))) return;
    // Space held for longer than any hold (the angry card's vote is 4 s).
    await page.keyboard.press('Shift');
    await page.evaluate(() => window.__a11y.focusHold());
    await page.keyboard.down('Space');
    await page.waitForTimeout(4400);
    await page.keyboard.up('Space');
    await page.waitForTimeout(300);
    if (await page.evaluate(() => window.__a11y.holds())) report(v.name, 'hold', 'Space held did not complete the hold (reduced motion)');
    const a = await page.evaluate(() => window.__a11y.active());
    if (a.where !== 'surface') report(v.name, 'focus', `after the hold completed focus went to ${a.where}`);
  } finally {
    await page.close();
  }
  // A quick Enter or Space, or a switch's / screen reader's click (no pointer, no key: detail 0): the
  // hands-free fill, for someone who can't hold a key or a switch.
  for (const how of ['Enter', 'Space', 'click']) {
    const p2 = await open(context, v);
    try {
      await p2.keyboard.press('Shift');
      await p2.evaluate(() => window.__a11y.focusHold());
      if (how === 'click') await p2.evaluate(() => document.activeElement.click());
      else await p2.keyboard.press(how);
      await p2.waitForTimeout(4600);
      if (await p2.evaluate(() => window.__a11y.holds())) report(v.name, 'hold', `a quick ${how} did not complete the hold hands-free (reduced motion)`);
    } finally {
      await p2.close();
    }
  }
}

try {
  const { chromium } = await loadPlaywright();
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base)).ok) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  const browser = await chromium.launch();
  const ctx = (reducedMotion) => browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', reducedMotion });
  const context = await ctx('no-preference');
  const reduced = await ctx('reduce');
  const indexPage = await context.newPage();
  await indexPage.goto(base, { waitUntil: 'load' });
  const map = await indexPage.evaluate(() => window.__reviewMap);
  await indexPage.close();
  visits = plan(map.surfaces);
  const one = async (v) => {
    const page = await open(context, v);
    const bad = (check, msg) => report(v.name, check, msg);
    await names(page, v);
    for (const t of await page.evaluate(() => window.__a11y.targets())) {
      if (!t.inSentence && (t.w < 44 || t.h < 44)) bad('targets', `${t.w}×${t.h} ${t.desc}`);
    }
    for (const l of await page.evaluate(([a, b]) => window.__a11y.live(a, b), [LIVE_LINES, LIVE_SELECTORS])) {
      if (l.kind !== 'polite') bad('live', `${l.kind === 'none' ? 'not announced' : 'assertive'}: ${l.desc}`);
    }
    for (const d of await page.evaluate(() => window.__a11y.assertive())) bad('live', `assertive region: ${d}`);
    await contrast(page, v);
    await keyboard(page, v);
    await page.close();
    await stepFocus(context, v, 'first');
    await stepFocus(context, v, 'last');
    await motionAndHold(reduced, v);
    process.stdout.write('.');
  };
  // A few screens at once: Playwright gives every page its own focus, so keyboard walks don't collide.
  const queue = [...visits];
  await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => {
    for (let v = queue.shift(); v; v = queue.shift()) await one(v);
  }));
  process.stdout.write('\n');
  await browser.close();
} finally {
  server.kill();
}

console.log(`${visits.length} screens, ${ROOMS.length} rooms`);
for (const i of info.sort()) console.log(`info  ${i}`);
for (const o of outside.sort()) console.log(`host  ${o}`);
if (problems.length) {
  console.error(problems.sort().join('\n'));
  console.error(`${problems.length} problem(s)`);
  process.exit(1);
}
console.log('ok: names, keyboard, focus, live lines, targets, reduced motion and holds, contrast in every room');
