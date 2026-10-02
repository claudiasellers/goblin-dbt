import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HeatFigure, type FigureMark } from './HeatFigure';
import { FeelingSquare } from '../FeelingSquare';
import { MORE_PLACES, REGIONS, glowFor, isRegionId, type RegionId, type Side } from '../../../data/bodyFigure';
import { getBodyMapContent } from '../../../services/bodyMap';
import type { PadWord } from '../../../data/bodyMapTypes';
import { HEAT, PAD_UNSET, describePad, isPadSet, markColour, wordsForPad } from '../../../lib/bodyPad';
import type { SquarePoint } from '../../../lib/feelingSquare';

/** One marked place, as the check-in saves it. `intensity` is the sensation pad's dot (x: how
 *  comfortable, y: how intense); the middle (`PAD_UNSET`) means the pad wasn't touched. */
export interface BodyMark {
  x: number;
  y: number;
  region: string;
  side: Side;
  intensity: { x: number; y: number };
  tags: string[];
  sensationIds: string[];
}

interface BodyStepProps {
  marks: BodyMark[];
  onChange: (marks: BodyMark[]) => void;
  /** Continue with the marks. */
  onComplete: () => void;
  /** Leave the step without marks. */
  onSkip: () => void;
  isSomaticEntry?: boolean;
}

const PAD_AXES = ['stronger', 'fainter', 'uncomfortable', 'comfortable'] as const;

/** The panel's unsaved state, shown live on the figure. */
interface Draft { side: Side; intensity: SquarePoint }

/** Centre of a mark on the figure, normalised to the viewBox, for the record's x / y. */
function centre(region: RegionId, side: Side) {
  const g = glowFor(region, side);
  const cx = g.reduce((s, e) => s + e.cx, 0) / g.length;
  const cy = g.reduce((s, e) => s + e.cy, 0) / g.length;
  return { x: Math.round(((cx + 10) / 220) * 1000) / 1000, y: Math.round(((cy + 6) / 432) * 1000) / 1000 };
}

/**
 * The body step (docs/design/body-map.md, steps 2–3): the heat figure (drag to a place and lift, or
 * tap), the places it can't show as chips, and a panel for the chosen place: the sensation pad (how
 * intense, how comfortable) and the graph's words for that place and that quarter of the pad. The
 * mark's glow takes the pad's colour as the dot moves. Both sides by default; paired places offer
 * your left / your right. Marks belong to the whole check-in, never to a feeling.
 */
export function BodyStep({ marks, onChange, onComplete, onSkip, isSomaticEntry = false }: BodyStepProps) {
  const [words, setWords] = useState<PadWord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<RegionId | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [hover, setHover] = useState<{ region: RegionId | null } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    getBodyMapContent()
      .then((c) => { if (live) setWords(c.padWords); })
      .catch(() => { if (live) { setWords([]); setFailed(true); } });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (editing) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [editing]);

  const figureMarks: FigureMark[] = marks
    .filter((m) => isRegionId(m.region) && m.region !== editing)
    .map((m) => ({ region: m.region as RegionId, side: m.side, colour: markColour(m.intensity) }));
  if (editing && draft) figureMarks.push({ region: editing, side: draft.side, colour: markColour(draft.intensity) });
  const colourOf = new Map(marks.map((m) => [m.region, markColour(m.intensity)]));

  function choose(region: RegionId) {
    setDraft(null);
    setEditing(region);
  }

  function save(mark: BodyMark | null, region: RegionId) {
    const rest = marks.filter((m) => m.region !== region);
    onChange(mark ? [...rest, mark] : rest);
    setEditing(null);
    setDraft(null);
  }

  function cancel() {
    setEditing(null);
    setDraft(null);
  }

  const readback = hover
    ? (hover.region ? REGIONS[hover.region].label : 'Not on the body')
    : null;

  return (
    <div className="max-w-md mx-auto flex flex-col">
      <h1 className="text-[2rem] leading-[1.08] text-[var(--color-text-primary)] m-0 [text-wrap:balance]">
        {isSomaticEntry ? 'Let’s start with your body' : 'Where do you feel it?'}
      </h1>
      <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">
        {isSomaticEntry ? 'Touch and drag to where you feel something, then lift. I’ll help with the words after.' : 'Touch and drag to where you feel it, then lift. Skip if nothing stands out.'}
      </p>

      <p className="body-readback mt-2 mb-0 text-center text-[17px] font-bold text-[var(--color-text-primary)]" aria-live="polite">
        {readback ?? (editing ? REGIONS[editing].label : '\u00a0')}
      </p>

      <div className="mt-1 self-center w-full max-w-[190px]">
        <HeatFigure marks={figureMarks} selected={editing} onPick={choose} onHover={setHover} fingerColour={HEAT} />
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label="More places">
        {MORE_PLACES.map((id) => (
          <button key={id} type="button" className={`den-chip den-chip--small${colourOf.has(id) ? ' is-marked' : ''}`}
            style={colourOf.has(id) ? { ['--mark' as string]: colourOf.get(id) } : undefined}
            aria-pressed={editing === id} onClick={() => choose(id)}>
            {REGIONS[id].label}
          </button>
        ))}
      </div>

      {editing ? (
        <div ref={panelRef}>
          <PlacePanel key={editing} region={editing} words={words} failed={failed}
            existing={marks.find((m) => m.region === editing) ?? null} onDraft={setDraft}
            onDone={(m) => save(m, editing)} onRemove={() => save(null, editing)} onCancel={cancel} />
        </div>
      ) : (
        <>
          {marks.length > 0 && (
            <ul className="mt-5 m-0 p-0 list-none flex flex-col gap-2" aria-label="Your marks">
              {marks.map((m) => (
                <li key={m.region}>
                  <button type="button" className="body-mark-row" onClick={() => isRegionId(m.region) && choose(m.region)}>
                    <span className="body-mark-row__dot" aria-hidden="true" style={{ ['--mark' as string]: markColour(m.intensity) }} />
                    <span className="font-semibold text-[var(--color-text-primary)]">{placeName(m)}</span>
                    <span className="text-[var(--color-text-secondary)]">
                      {[isPadSet(m.intensity) ? describePad(m.intensity).toLowerCase() : '', m.tags.join(', ').toLowerCase()].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="action-dock">
            {marks.length > 0 ? (
              <button type="button" onClick={onComplete}
                className="w-full min-h-[60px] rounded-[18px] text-[17px] font-bold bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-none cursor-pointer lift-primary">
                {isSomaticEntry ? 'Help me find the words' : 'Continue'}
              </button>
            ) : (
              <button type="button" onClick={onSkip} className="den-chip w-full min-h-[56px]">
                {isSomaticEntry ? 'Pick feelings instead' : 'Skip this step'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function placeName(m: BodyMark) {
  if (!isRegionId(m.region)) return m.region;
  const def = REGIONS[m.region];
  if (def.paired && m.side === 'left') return `${def.label}, your left`;
  if (def.paired && m.side === 'right') return `${def.label}, your right`;
  return def.label;
}

interface PlacePanelProps {
  region: RegionId;
  words: PadWord[] | null;
  failed: boolean;
  existing: BodyMark | null;
  onDraft: (draft: Draft) => void;
  onDone: (mark: BodyMark) => void;
  onRemove: () => void;
  onCancel: () => void;
}

/**
 * The chosen place: both sides or one, the sensation pad, and the graph's words for this place in
 * the pad's quarter (the dot's own quarter first; near the middle lines the neighbours show too;
 * picked words always stay).
 */
function PlacePanel({ region, words, failed, existing, onDraft, onDone, onRemove, onCancel }: PlacePanelProps) {
  const def = REGIONS[region];
  const [side, setSide] = useState<Side>(existing?.side ?? 'both');
  const [pad, setPad] = useState<SquarePoint | null>(isPadSet(existing?.intensity) ? existing!.intensity : null);
  const [picked, setPicked] = useState<string[]>(existing?.sensationIds ?? []);

  useEffect(() => { onDraft({ side, intensity: pad ?? PAD_UNSET }); }, [side, pad, onDraft]);

  // Words follow the dot; before it's down only words already picked show (pad first, words after).
  const shown = useMemo(
    () => wordsForPad(words ?? [], region, pad, picked).filter((w) => pad || picked.includes(w.id)),
    [words, region, pad, picked],
  );
  const anyHere = useMemo(() => wordsForPad(words ?? [], region, null).length > 0, [words, region]);

  // The word area only grows while the panel is open: when the dot moves to a corner with fewer
  // words, a shrinking panel would scroll the page (and the pad) under the finger.
  const wordsRef = useRef<HTMLDivElement>(null);
  const tallest = useRef(0);
  useLayoutEffect(() => {
    const el = wordsRef.current;
    if (!el) return;
    el.style.minHeight = '';
    tallest.current = Math.max(tallest.current, el.offsetHeight);
    el.style.minHeight = `${tallest.current}px`;
  });

  function movePad(p: SquarePoint) {
    // The exact middle is the saved "not touched" value; a dot put there on purpose sits a hair off it.
    setPad(p.x === PAD_UNSET.x && p.y === PAD_UNSET.y ? { x: 0.501, y: 0.5 } : p);
  }

  const byId = new Map((words ?? []).map((w) => [w.id, w]));

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function done() {
    const ids = picked.filter((id) => byId.has(id) || existing?.sensationIds.includes(id));
    const tags = ids.map((id) => byId.get(id)?.label ?? existing?.tags[existing.sensationIds.indexOf(id)] ?? id);
    onDone({ ...centre(region, side), region, side, intensity: pad ?? PAD_UNSET, tags, sensationIds: ids });
  }

  return (
    <section className="mt-5 body-panel" aria-label={def.label}>
      <h2 className="m-0 text-[1.6rem] leading-[1.1] text-[var(--color-text-primary)]">
        My {def.label.toLowerCase()} {def.plural ? 'feel' : 'feels'}…
      </h2>

      {def.paired && (
        <div className="mt-3 seg" role="radiogroup" aria-label="Which side">
          {([['both', 'Both sides'], ['left', 'Your left'], ['right', 'Your right']] as const).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={side === v} className={side === v ? 'is-on' : ''}
              onClick={() => setSide(v)}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 body-pad">
        <FeelingSquare point={pad} onMove={movePad} axes={PAD_AXES}
          label={`How it feels. Up is stronger, right is more comfortable. ${pad ? describePad(pad) : 'Not placed yet'}. Arrow keys move.`} />
      </div>
      <p className="body-readback mt-3 mb-0 text-center text-[15px] font-semibold text-[var(--color-text-primary)]" aria-live="polite">
        {describePad(pad)}
      </p>

      <div ref={wordsRef} className="mt-4">
        {words === null ? (
          <p className="m-0 text-[15px] text-[var(--color-text-secondary)]">Loading words…</p>
        ) : !anyHere ? (
          <p className="m-0 text-[15px] text-[var(--color-text-secondary)]">
            {failed ? 'Couldn’t load the words. ' : ''}You can still mark the place.
          </p>
        ) : (
          <>
            {!pad && <p className="m-0 mb-3 text-center text-[15px] text-[var(--color-text-secondary)]">Put the dot down and words for it show up here.</p>}
            {pad && shown.length === 0 && <p className="m-0 text-center text-[15px] text-[var(--color-text-secondary)]">No words for this corner yet. Move the dot, or just mark the place.</p>}
            {shown.length > 0 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Words for it"
                style={{ ['--chip-on' as string]: markColour(pad) }}>
                {shown.map((w) => (
                  <button key={w.id} type="button" className="den-chip den-chip--small" aria-pressed={picked.includes(w.id)}
                    onClick={() => toggle(w.id)}>
                    {w.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <button type="button" onClick={done}
          className="w-full min-h-[56px] rounded-[18px] text-[17px] font-bold bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-none cursor-pointer lift-primary">
          {existing ? 'Done' : 'Add this place'}
        </button>
        <div className="flex justify-center gap-6">
          <button type="button" onClick={onCancel}
            className="min-h-11 px-2 text-[15px] text-[var(--color-text-secondary)] bg-transparent border-none cursor-pointer">
            Cancel
          </button>
          {existing && (
            <button type="button" onClick={onRemove}
              className="min-h-11 px-2 text-[15px] text-[var(--color-text-secondary)] underline underline-offset-4 bg-transparent border-none cursor-pointer">
              Remove
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
