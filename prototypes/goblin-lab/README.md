# Goblin Lab: Stage it / Shape it / Tune it prototypes

Clickable prototypes of the three alexithymia-first directions. Reference only: this code hard-codes word
tables and copy that production must read from the graph (see `docs/design/alexithymia-first-interaction.md`
and `docs/design/find-the-feeling.md`). Not part of the app build.

```
cd prototypes/goblin-lab && npm install && npx vite        # dev server
npx vite build                                             # single-file dist/index.html
```

- `src/directions/Stage`: 3D diorama (React Three Fiber, GSAP)
- `src/directions/Shape`: shader sculpture in a gallery room (R3F, custom vertex displacement)
- `src/directions/Tune`: canvas string instrument + Web Audio synth
- `src/script.ts`, `src/record.ts`: shared prototype copy and the session record shape
- `SPEC.md`: the brief the prototypes were built against

Known prototype-only behaviour: every `blank` goes to activation, including flooded + blank. Production
follows the graph's flooding_triggered_shutdown rule (regulate, orient, no word); see find-the-feeling.md.
