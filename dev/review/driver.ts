/**
 * The review harness's branch driver (dev/parts-review.html): a branch that starts mid-flow is reached by
 * tapping through the real component, as a person would, so every screen on the way runs the app's own
 * rules. Each step names what to tap by content id (looked up in the same served parts content, so it
 * matches with "Show ids" on too), or by a literal label for the house's own buttons ("Next").
 * The root gets data-driven="done" (or "failed: …") for the Playwright check.
 */
import type { PartsContent } from '../../src/data/partsContentTypes';
import { getPartsContent } from '../../src/services/partsContent';
import { getSpineContent } from '../../src/services/spine';
import { getFindTheFeelingContent } from '../../src/services/neo4j';

export type DriveStep =
  /** A chip or link by parts option id. */
  | { opt: string }
  /** A Find chip by move id. */
  | { move: string }
  /** A hurt chip by id. */
  | { hurt: string }
  /** A button whose label is this parts prompt's copy (hold labels, Settings' delete buttons). */
  | { prompt: string }
  /** The orienting close's choice by id (the spine's copy). */
  | { close: string }
  /** A literal label: the house's own buttons ("Next") or a part's name. */
  | { tap: string }
  /** Shape it's five rounds, alternating sides. */
  | { shape: true }
  /** Press and let go of the hold button at once (the quiet "Next" then goes past it). */
  | { press: string }
  /** Type into the one text field on screen. */
  | { type: string }
  /** Tick the checkbox whose label starts with this text. */
  | { tick: string };

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function find(root: HTMLElement, label: string, what = 'button, a'): Promise<HTMLElement> {
  const want = norm(label);
  for (let i = 0; i < 100; i++) {
    const all = Array.from(root.querySelectorAll<HTMLElement>(what)).filter((b) => !(b as HTMLButtonElement).disabled);
    const hit = all.find((b) => norm(b.textContent) === want) ?? all.find((b) => norm(b.textContent).startsWith(want));
    if (hit) return hit;
    await sleep(50);
  }
  throw new Error(`nothing to tap: "${want}"`);
}

function labels(parts: PartsContent): Map<string, string> {
  const m = new Map<string, string>();
  for (const steps of Object.values(parts.options)) for (const list of Object.values(steps)) for (const o of list) m.set(`opt:${o.id}`, o.label);
  for (const mv of parts.moves) m.set(`move:${mv.id}`, mv.label);
  for (const h of parts.hurts) m.set(`hurt:${h.id}`, h.label);
  for (const [id, p] of Object.entries(parts.prompts)) m.set(`prompt:${id}`, p.copy);
  return m;
}

function setText(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, text);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export async function drive(root: HTMLElement, steps: readonly DriveStep[]): Promise<void> {
  root.dataset.driven = steps.length ? 'running' : 'done';
  if (!steps.length) return;
  try {
    const [parts, spine, ftf] = await Promise.all([getPartsContent(), getSpineContent(), getFindTheFeelingContent()]);
    const map = labels(parts);
    const label = (k: string) => { const v = map.get(k); if (v === undefined) throw new Error(`no copy for ${k}`); return v; };
    for (const s of steps) {
      await sleep(120);
      if ('opt' in s) (await find(root, label(`opt:${s.opt}`))).click();
      else if ('move' in s) (await find(root, label(`move:${s.move}`))).click();
      else if ('hurt' in s) (await find(root, label(`hurt:${s.hurt}`))).click();
      else if ('prompt' in s) (await find(root, label(`prompt:${s.prompt}`))).click();
      else if ('tap' in s) (await find(root, s.tap)).click();
      else if ('tick' in s) (await find(root, s.tick, 'label')).click();
      else if ('close' in s) {
        const choice = spine.closeFlow.kinds.orienting?.choices.find((c) => c.id === s.close);
        if (!choice) throw new Error(`no close choice ${s.close}`);
        (await find(root, choice.label)).click();
      } else if ('shape' in s) {
        const rounds = ftf.flow.copy.shape.rounds as readonly (readonly [string, string])[];
        for (let r = 0; r < rounds.length; r++) { (await find(root, rounds[r][r % 2])).click(); await sleep(120); }
      } else if ('press' in s) {
        const b = await find(root, label(`prompt:${s.press}`));
        b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
        await sleep(200);
        b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }));
      } else if ('type' in s) {
        let el: HTMLInputElement | HTMLTextAreaElement | null = null;
        for (let i = 0; i < 100 && !el; i++) { el = root.querySelector('textarea, input[type="text"], input:not([type])'); if (!el) await sleep(50); }
        if (!el) throw new Error('no text field');
        setText(el, s.type);
      }
    }
    await sleep(400);
    root.dataset.driven = 'done';
  } catch (e) {
    root.dataset.driven = `failed: ${(e as Error).message}`;
  }
}
