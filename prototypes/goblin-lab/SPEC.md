# Goblin Lab: three non-obvious directions for "Recover from a hurtful moment"

## Why a second round
Round one (chat companion, swipe cards, weather-sky) was rejected as overplayed. Every idea here must be an
interaction paradigm you do NOT see in wellness apps. Banned: chat bubbles, swipe decks, mood weather, emoji
faces, sliders, 1–10 or any numeric/graded scale, progress-percent, streaks, confetti, a mascot talking.

## Who it's for
People with alexithymia after an interpersonal wound (invalidated → abandoned). They often cannot name or grade
what they feel. Design rule: **recognise, don't rate.** Use comparison, direct manipulation, the body, space,
sound. The emotion word is always *offered as a hypothesis*, never asked for.

## The clinical spine (every direction must produce this record; ids come from src/script.ts)
```ts
interface SessionRecord {
  scenarioId: 'brushed' | 'mocked' | 'left-out' | 'pulled-away' | 'small';
  band: 'steady' | 'stirred' | 'flooded';        // capacity, from the behavioural probe
  pull: 'chase' | 'fight' | 'hide' | 'blank';     // action urge
  word: string | null;                            // accepted hypothesis, null = "not sure" (valid)
  exitId: 'ask' | 'land' | 'opposite';
  close: 'louder' | 'same' | 'quieter' | 'much';
}
```
Gates (non-negotiable):
- flooded → regulation step **before** the word step. blank (shutdown) → an *activating* step, never calming.
- Ask (hand-off to DEAR MAN) is only unlocked when band is steady and pull is not blank; otherwise shown locked
  with "Opens once it's quieter."
- Opposite action copy per pull comes from `EXITS.opposite[pull]` in script.ts. Validation copy from
  `validationFor(scenario)` + `VALIDATION_FOLLOW`. Scenario list from `SCENARIOS`.
- Capacity is the behavioural probe `CAPACITY` ("If they texted you right now, you'd…" → 3 replies). Render it in
  the direction's own world, but keep the three options.
- The close is a **comparison** with the start (never a scale). Map to CLOSE ids.
- Words collected are the gamification (emotional granularity). Starting collection: `STARTING_WORDS`.
- Call `onRecord?.(record)` when the session completes (prop is optional).

## Engineering rules
- React 19 + TS strict. Tailwind v4 utilities available; colour tokens in src/index.css (`var(--bg)` etc.). You
  may define your own palette inside your direction; it must work in light AND dark (`prefers-color-scheme`).
- Each direction is `export function <Name>({ onRecord }: { onRecord?: (r: SessionRecord) => void })`, fills its
  parent (`h-full w-full`, parent is a ~390×780 phone frame or a full phone viewport), no page scroll.
- Installed: three, @react-three/fiber, @react-three/drei, gsap, motion (framer). WebAudio/canvas are native.
  No other deps without a very good reason.
- Touch-first: every gesture works with a finger and a mouse; hit targets ≥ 44px; `touch-action: none` on
  gesture surfaces only. Provide a tap alternative for any gesture (accessibility).
- `prefers-reduced-motion`: keep function, drop large motion.
- Dispose WebGL/Audio on unmount. Target 60fps on a mid phone: cap DPR at 2, no postprocessing chains.
- Only write inside your own folder `src/directions/<Name>/`. Do not edit shared files; import them.
- Verify: `npx tsc --noEmit -p .` must pass, then `npx vite build`, then click through the built
  `dist/index.html` with Playwright (global install: `/home/claude/.npm-global/lib/node_modules/playwright/index.mjs`,
  chromium launches with `chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] })`) at
  390×844, screenshot every step, LOOK at the screenshots and fix what's ugly or broken. Iterate until it is
  something a top design studio would show.
- Copy: plain, warm, short, second person. No clinical jargon on screen. No em-dash overload.
