#!/usr/bin/env node
/**
 * The parts review page's check (not part of npm test): serves the built dev-dist/ as plain files, opens
 * every surface and branch of dev/parts-review.html at 390×844 in Chromium, screenshots each, and fails
 * on any console error, page error, failed or non-font network request, a branch the driver couldn't
 * reach, or a screen without the line it is there to show. Then it walks every screen again in one page by
 * the hash (#s=…&b=…), as an Artifact frame navigates: never a reload, always back at the top.
 *   npx vite build --config dev/vite.harness.config.ts
 *   node dev/review/check.mjs [shots dir]   (default /home/claude/lanes/briefs/review-shots)
 * Uses the preinstalled Playwright (PLAYWRIGHT_MODULE, else `playwright`, else /opt/node-tools) and its
 * browsers (PLAYWRIGHT_BROWSERS_PATH, default /opt/pw-browsers). Never installs anything.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { partsFromFixture } from '../../tests/lib/partsContentFixture.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = join(ROOT, 'dev-dist');
const PAGE = 'dev/parts-review.html';
const SHOTS = resolve(process.argv[2] ?? '/home/claude/lanes/briefs/review-shots');
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

/* ── what to check on each screen (the surfaces and branches come from the page itself) ── */
const content = partsFromFixture(JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/parts-content.json'), 'utf8')), () => true);
const copy = (id) => {
  const c = content.prompts[id]?.copy ?? Object.values(content.options).flatMap((s) => Object.values(s).flat()).find((o) => o.id === id)?.label;
  if (!c) throw new Error(`no copy for ${id}`);
  return c.split('{')[0].trim();
};

/** The line each screen is there to show (a prompt or option id), or a selector. */
const EXPECT = {
  'meet/walk': 'meet_find', 'meet/far_away': 'gate_far_away', 'meet/tender': 'meet_tender', 'meet/stop_tender': 'meet_stop_title',
  'meet/stop_own': 'meet_stop_title', 'meet/danger': 'meet_thank', 'meet/nothing': 'meet_nothing', 'meet/worried': 'meet_unblend',
  'meet/worried_end': 'meet_unblend_end', 'meet/too_many': 'aftercare_too_many', 'meet/paused': 'paused_heads_up', 'meet/keep': 'meet_keep',
  'meet/close': 'close_checkback', 'meet/danger_close': 'meet_done',
  'meet/front': 'meet_front', 'meet/front_keep': 'meet_keep', // 5d (lane 2)
  'checkback/louder': 'aftercare_louder', 'tag/row': 'tag_question', 'tag/new': 'tag_new_later', 'me/cards': 'card_where', 'me/long': 'card_where', 'reflect/': 'reflect_title',
  'settings/on': 'settings_dissociation', 'settings/confirm': 'settings_delete_confirm', 'settings/failed': 'settings_delete_failed',
  'settings/done': 'settings_delete_done', 'cope/pick': 'cope_title', 'cope/anchor': 'cope_change', 'cope/new': 'cope_save',
  'cope/failed': 'cope_save_failed', 'debrief/named': 'debrief_who_named', 'debrief/general': 'debrief_who',
  'debrief/general_new': 'tag_new_later', 'ps_later/ask': 'ps_later', 'ps_later/done': 'ps_later_done', 'tag/urge': 'tag_question',
  'offer/a': 'offer_eyebrow', 'offer/b': 'offer_eyebrow', 'offer/c': 'offer_eyebrow', 'offer/evidence': 'offer_question',
  'offer/evidence_c': 'offer_more_than_one', 'offer/split': 'offer_split',
  'review/blocks': 'review_noname', 'review/answered': 'review_not_sure', 'review/done': 'review_noname', 'review/failed': 'review_done',
  'patterns/list': 'patterns_title', 'patterns/removed': 'patterns_title',
  'tag/shape': 'tag_use_shape', 'tag/shape_unnamed': 'tag_use_shape_noname', 'tag/shape_done': 'tag_shape_done',
  'angry/first': 'angry_unblend', 'angry/protects': 'angry_protects', 'angry/speak': 'angry_later', 'angry/later': 'angry_later_done',
  // The den (lane 2)
  'den/room': 'den_room', 'den/one': 'den_one_part', 'den/sheet': 'den_stands_front', 'den/front': 'den_which_front', 'den/then': 'den_now',
  // A part's story (lane 2)
  'story/rich': 'story_met', 'story/tender': 'story_met', 'story/card': 'story_met', 'story/den': 'story_spend_time',
};
const SELECTOR = {
  'meet/danger': 'section[aria-label="Support right now"]', 'meet/danger_close': 'section[aria-label="Support right now"]',
  'checkback/louder': '[data-testid="part-checkback-aftercare"]',
  'review/blocks': 'section[aria-label="Support right now"]',
  'review/answered': '[data-testid="known-part-review"] button[aria-pressed="true"]',
  'review/failed': '[data-testid="known-part-review"] button[aria-pressed="true"]',
};
const NO_CHECKBACK = new Set(['meet/danger_close']);
// lane 4 (parts-steps-tried): screens that must also show "Steps that helped" (fresh loads, without ids).
const ALSO_EXPECT = {
  'me/cards': ['stats_steps'], 'me/long': ['stats_steps'], 'reflect/': ['stats_steps'],
  // lane 4 (wise-mind-parts): Wise mind's step back
  'wise_mind/who': ['wm_who', 'wm_unmet', 'wm_no_one'], 'wise_mind/placed': ['wm_step_back'], 'wise_mind/stepped': ['wm_held'],
  'wise_mind/wont': ['wm_wont_line', 'wm_meet_later'], 'wise_mind/wont_unmet': ['wm_later_done'], 'wise_mind/tender': ['wm_held'],
  'wise_mind/safety': ['wm_step_back'],
};
const ALSO_SELECTOR = { 'wise_mind/safety': '[data-testid="crisis-banner-compact"]', 'wise_mind/tender': '[data-den-tender]' }; // lane 4

/** Every surface and branch, angry's in both wordings, and a few with Show ids. */
function plan(map) {
  const visits = [{ name: 'index', query: '' }, { name: 'index--ids', query: '#ids=1' }];
  for (const s of map) {
    for (const b of s.branches.length ? s.branches : ['']) {
      const q = `#s=${s.id}${b ? `&b=${b}` : ''}`;
      const v = { name: `${s.id}${b ? `--${b}` : ''}`, query: q, key: `${s.id}/${b}`, surface: s.id, branch: b };
      visits.push(v);
      if (s.id === 'angry') visits.push({ ...v, name: `${v.name}--plain`, query: `${q}&plain=1`, plain: true });
    }
  }
  for (const [surface, branch] of [['meet', 'keep'], ['meet', 'close'], ['angry', 'first'], ['tag', 'row'], ['me', 'cards'], ['unblend_oa', 'shame-hide'], ['oa_goal', 'shame-hide.connection'], ['debrief', 'named'], ['ps_later', 'ask'], ['offer', 'evidence'], ['review', 'blocks'], ['patterns', 'list']]) {
    visits.push({ name: `${surface}${branch ? `--${branch}` : ''}--ids`, query: `#s=${surface}${branch ? `&b=${branch}` : ''}&ids=1`, ids: true, surface, branch });
  }
  return visits;
}

/* ── serve and visit ── */
const port = 47000 + Math.floor(Math.random() * 2000);
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}/${PAGE}`;
const isFont = (url) => /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url);
const problems = [];
let visits = [];

try {
  const { chromium } = await loadPlaywright();
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base)).ok) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  mkdirSync(SHOTS, { recursive: true });
  for (const f of readdirSync(SHOTS)) if (f.endsWith('.png')) rmSync(join(SHOTS, f));

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  // Fonts are the one call allowed out; they're blocked here so the check needs no network.
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (r) => r.abort());
  // The page lists its own surfaces and branches, so a new branch is checked without touching this file.
  const indexPage = await context.newPage();
  await indexPage.goto(base, { waitUntil: 'load' });
  const map = await indexPage.evaluate(() => window.__reviewMap);
  await indexPage.close();
  if (map.uncovered.length) problems.push(`sign-off pack surfaces with no harness screen: ${map.uncovered.join(', ')}`);
  if (map.unknown.length) problems.push(`harness screens for no pack surface: ${map.unknown.join(', ')}`);
  visits = plan(map.surfaces);
  for (const v of visits) {
    const page = await context.newPage();
    const bad = (msg) => problems.push(`${v.name}: ${msg}`);
    page.on('console', (m) => { if (m.type() === 'error' && !isFont(m.location()?.url ?? '') && !/fonts\.(googleapis|gstatic)/.test(m.text())) bad(`console error: ${m.text()}`); });
    page.on('pageerror', (e) => bad(`page error: ${e.message}`));
    page.on('requestfailed', (r) => { if (!isFont(r.url())) bad(`request failed: ${r.url()}`); });
    page.on('request', (r) => { const u = r.url(); if (!u.startsWith(`http://127.0.0.1:${port}/`) && !isFont(u) && !u.startsWith('data:') && !u.startsWith('blob:')) bad(`call out: ${u}`); });
    page.on('response', (r) => { if (r.status() >= 400 && !isFont(r.url())) bad(`HTTP ${r.status()}: ${r.url()}`); });

    await page.goto(`${base}${v.query}`, { waitUntil: 'load' });
    if (v.surface) {
      await page.waitForFunction(() => {
        const d = document.querySelector('[data-testid="surface"]')?.getAttribute('data-driven') ?? '';
        return d === 'done' || d.startsWith('failed');
      }, null, { timeout: 45000 }).catch(() => bad('timed out waiting for the branch'));
      const driven = await page.getAttribute('[data-testid="surface"]', 'data-driven').catch(() => null);
      if (driven !== 'done') bad(`branch not reached: ${driven}`);
      await page.waitForTimeout(700);
      const text = await page.locator('[data-testid="surface"]').innerText().catch(() => '');
      if (!text.trim()) bad('empty surface');
      if (!v.ids) {
        const want = EXPECT[v.key];
        if (want && !(v.plain && v.key === 'angry/speak') && !(v.plain && v.key === 'angry/later')) {
          const id = v.plain && content.prompts[`${want}_plain`] ? `${want}_plain` : want;
          if (!text.toLowerCase().includes(copy(id).toLowerCase())) bad(`missing ${id}: "${copy(id)}"`);
        }
        if (v.plain && (v.key === 'angry/speak' || v.key === 'angry/later') && text.includes(copy('angry_later'))) bad('later line shown with plain wording');
        if (SELECTOR[v.key] && !(await page.locator(SELECTOR[v.key]).count())) bad(`missing ${SELECTOR[v.key]}`);
        for (const id of ALSO_EXPECT[v.key] ?? []) if (!text.toLowerCase().includes(copy(id).toLowerCase())) bad(`missing ${id}: "${copy(id)}"`); // lane 4
        if (ALSO_SELECTOR[v.key] && !(await page.locator(ALSO_SELECTOR[v.key]).count())) bad(`missing ${ALSO_SELECTOR[v.key]}`); // lane 4
        if (NO_CHECKBACK.has(v.key) && text.includes(copy('close_checkback'))) bad('check-back question after a danger ending');
        if (v.surface === 'oa_goal') {
          const shows = (await page.locator('[data-testid="goal-line"]').count()) > 0;
          const silent = /^(guilt-punish|custom)\./.test(v.branch);
          if (shows === silent) bad(silent ? 'goal line shown where it must not be' : 'no goal line');
        }
        if (v.surface?.startsWith('unblend_') && v.branch !== 'blank' && !(await page.locator('[data-testid="unblend-line"]').count())) bad('no unblend line');
      } else if (!text.includes('⟨')) bad('Show ids printed no ids');
    } else {
      await page.waitForSelector('[data-surface]', { timeout: 15000 }).catch(() => bad('no index'));
    }
    // A pointer user's view: a real tap on blank page, so programmatic focus shows no keyboard ring.
    await page.mouse.click(2, 2);
    await page.screenshot({ path: join(SHOTS, `${v.name}.png`), fullPage: true });
    await page.close();
  }

  // In-frame navigation, as an Artifact frame does it: one page, never reloaded, every screen reached by
  // the hash (real link clicks first, then every branch in turn). A screen that leaks state from the one
  // before (answers, events, the tag row's memory, storage) shows up here and not in the fresh loads above.
  const tour = await context.newPage();
  const tbad = (msg) => problems.push(`in-page: ${msg}`);
  tour.on('pageerror', (e) => tbad(`page error: ${e.message}`));
  tour.on('console', (m) => { if (m.type() === 'error' && !isFont(m.location()?.url ?? '') && !/fonts\.(googleapis|gstatic)/.test(m.text())) tbad(`console error: ${m.text()} (${m.location()?.url ?? ''})`); });
  tour.on('requestfailed', (r) => { if (!isFont(r.url())) tbad(`request failed: ${r.url()}`); });
  await tour.goto(base, { waitUntil: 'load' });
  await tour.evaluate(() => { window.__noReload = true; });
  const reached = async (label) => {
    await tour.waitForFunction(() => {
      const d = document.querySelector('[data-testid="surface"]')?.getAttribute('data-driven') ?? '';
      return d === 'done' || d.startsWith('failed');
    }, null, { timeout: 45000 }).catch(() => tbad(`${label}: timed out`));
    const driven = await tour.getAttribute('[data-testid="surface"]', 'data-driven').catch(() => null);
    if (driven !== 'done') tbad(`${label}: branch not reached: ${driven}`);
    if (!(await tour.evaluate(() => window.__noReload === true))) tbad(`${label}: the page reloaded`);
  };
  await tour.click('[data-surface="meet"]');
  await reached('link to meet');
  if (!(await tour.evaluate(() => location.hash)).startsWith('#s=meet')) tbad('the surface link is not a hash link');
  await tour.click('[data-branch="keep"]');
  await reached('link to meet/keep');
  await tour.click('text=← All surfaces');
  await tour.waitForSelector('[data-surface]', { timeout: 15000 }).catch(() => tbad('back to the index'));
  if ((await tour.evaluate(() => location.hash)) !== '') tbad('the index link is not #');
  for (const v of visits.filter((x) => x.surface && !x.ids)) {
    await tour.evaluate((h) => { window.scrollTo(0, 400); location.hash = h; }, v.query);
    await tour.waitForFunction((h) => location.hash === h, v.query);
    await reached(v.name);
    await tour.waitForTimeout(500);
    if ((await tour.evaluate(() => window.scrollY)) !== 0) tbad(`${v.name}: not scrolled to the top`);
    const text = await tour.locator('[data-testid="surface"]').innerText().catch(() => '');
    const want = EXPECT[v.key];
    if (want && !v.plain && !text.toLowerCase().includes(copy(want).toLowerCase())) tbad(`${v.name}: missing ${want}`);
    if (SELECTOR[v.key] && !v.plain && !(await tour.locator(SELECTOR[v.key]).count())) tbad(`${v.name}: missing ${SELECTOR[v.key]}`);
  }
  await tour.close();
  await browser.close();
} finally {
  server.kill();
}

console.log(`${visits.length} screens → ${SHOTS}`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('ok: no console errors, no failed or outside requests, every branch reached');
