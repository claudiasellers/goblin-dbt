import type { ReactNode } from 'react';
import { regionLabel } from '../../../data/bodyFigure';
import { zoneColour } from '../../../lib/bodyMark';
import { listWords, type Ghost, type MirrorTab, type SharedPlace } from '../../../lib/bodyMirror';
import type { BodyMark } from './BodyStep';

/** Which view the mirror shows: one map's tab, or where the maps share places. */
export type MirrorView = number | 'together';

const Word = ({ children }: { children: ReactNode }) => <em className="body-mirror__word">{children}</em>;

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** Words in the voice face: "anxious", "anxious and overwhelmed", "a, b and c". `start`: they open
 *  the sentence (the first one capitalised). */
function Words({ words: given, start = false }: { words: string[]; start?: boolean }) {
  const words = start && given.length ? [cap(given[0]), ...given.slice(1)] : given;
  if (words.length <= 1) return <Word>{words[0]}</Word>;
  return (
    <>
      {words.slice(0, -1).map((w, i) => (
        <span key={w}>{i > 0 ? ', ' : ''}<Word>{w}</Word></span>
      ))}
      {' and '}
      <Word>{words[words.length - 1]}</Word>
    </>
  );
}

interface MirrorTabsProps {
  tabs: MirrorTab[];
  shared: SharedPlace[];
  view: MirrorView;
  onView: (v: MirrorView) => void;
}

/** One tab per map (canvas Z1–Z3), in the words' square colours, plus Together when two maps share a
 *  place. Only shown for two or more maps. The tabs change the hint, never your marks. */
export function MirrorTabs({ tabs, shared, view, onView }: MirrorTabsProps) {
  if (tabs.length < 2) return null;
  const together = shared.length > 0;
  const stripe = `linear-gradient(90deg, ${tabs.slice(0, 2).map((t, i) => `${zoneColour(t.zone)} ${i * 50}% ${(i + 1) * 50}%`).join(', ')})`;
  return (
    <div className="body-mirror__tabs" role="tablist" aria-label="Typical places for each feeling">
      {tabs.map((t, i) => (
        <button key={t.map.id} type="button" role="tab" aria-selected={view === i} className="body-mirror__tab" onClick={() => onView(i)}>
          <i style={{ background: zoneColour(t.zone) }} aria-hidden="true" />
          {t.words.join(' · ')}
        </button>
      ))}
      {together && (
        <button type="button" role="tab" aria-selected={view === 'together'} className="body-mirror__tab" onClick={() => onView('together')}>
          <i style={{ background: stripe }} aria-hidden="true" />
          Together
        </button>
      )}
    </div>
  );
}

interface MirrorPanelProps {
  tabs: MirrorTab[];
  shared: SharedPlace[];
  view: MirrorView;
  marks: BodyMark[];
  onPick: (ghost: Ghost, tab: MirrorTab) => void;
  onAddAll: (tab: MirrorTab) => void;
  onClose: () => void;
}

/** Whether a mark already holds this ghost's word at its place. */
const holds = (marks: BodyMark[], g: Ghost) => marks.some((m) => m.region === g.region && m.sensationIds.includes(g.sensationId));

/**
 * Under the body (canvas Y2, Z1, Z3): one line about the map, the typical places as chips ("Sound
 * familiar? Tap any that fit"), "Add all of these", and DEAR MAN's mirror disclaimer. Tapping a chip
 * opens that place pre-filled; nothing becomes yours without a tap.
 */
export function MirrorPanel({ tabs, shared, view, marks, onPick, onAddAll, onClose }: MirrorPanelProps) {
  const tab = view === 'together' ? null : tabs[view] ?? tabs[0];
  const open = tab ? tab.ghosts.filter((g) => !holds(marks, g)) : [];

  return (
    <section className="body-mirror mt-3" aria-label="Where this often shows up">
      <div className="body-mirror__head">
        <p className="body-mirror__line">
          {tab ? <TabLine tab={tab} /> : <TogetherLine tabs={tabs} shared={shared} />}
        </p>
        <button type="button" className="body-mirror__close" onClick={onClose} aria-label="Hide the typical places">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {tab ? (
        <>
          <p className="body-mirror__cap">Sound familiar? Tap any that fit</p>
          <div className="body-mirror__chips" style={{ ['--ghost' as string]: zoneColour(tab.zone) }}>
            {tab.ghosts.map((g) => {
              const on = holds(marks, g);
              return (
                <button key={`${g.region}-${g.sensationId}`} type="button" className={`body-mirror__chip${on ? ' is-on' : ''}`}
                  aria-pressed={on} onClick={() => onPick(g, tab)}>
                  <i aria-hidden="true" />
                  {regionLabel(g.region)} · {g.label.toLowerCase()}
                </button>
              );
            })}
          </div>
          {open.length > 1 && (
            <button type="button" className="body-mirror__all" onClick={() => onAddAll(tab)}>
              + Add all of these
            </button>
          )}
        </>
      ) : (
        <div className="body-mirror__legend">
          {tabs.map((t) => (
            <span key={t.map.id}><i style={{ background: zoneColour(t.zone) }} aria-hidden="true" />{t.words.join(' · ')}</span>
          ))}
          <span>
            <i aria-hidden="true" style={{ background: `linear-gradient(90deg, ${zoneColour(tabs[0].zone)} 50%, ${zoneColour(tabs[1]?.zone ?? tabs[0].zone)} 50%)` }} />
            {tabs.length > 2 ? 'more than one' : 'both'}
          </span>
        </div>
      )}

      <p className="body-mirror__small">This is where many people feel it, not where you’re supposed to. Only keep what’s true for you.</p>
    </section>
  );
}

/** One map: a single word names itself; several words of one family say why they share a map. */
function TabLine({ tab }: { tab: MirrorTab }) {
  if (tab.words.length === 1) {
    return <>Many people notice <Words words={tab.words} /> in places like these.</>;
  }
  return (
    <>
      <Words words={tab.words} start /> are in the same family ({tab.map.label.toLowerCase()}), so they often show up in the
      same places.
    </>
  );
}

/** Together (Z3): where the maps overlap, and why that matters. */
function TogetherLine({ tabs, shared }: { tabs: MirrorTab[]; shared: SharedPlace[] }) {
  const firsts = tabs.map((t) => t.words[0]);
  const places = listWords(shared.map((s) => regionLabel(s.region).toLowerCase()));
  if (tabs.length === 2) {
    return (
      <>
        Your feelings share some places ({places}). Striped means <Words words={firsts} /> both often show up there.
        That’s part of why they’re easy to mix up.
      </>
    );
  }
  return <>Your feelings share some places ({places}). Striped means more than one of them often shows up there.</>;
}
