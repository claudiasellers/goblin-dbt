/**
 * Urge Surfing wave state (A0-2 peak fix; DT PRD §3.5 item 4).
 *
 * The peak used to start at a fixed 7 whatever the user entered, so a surf
 * that started at 3 could report a peak lower than its final reading, or a
 * peak nobody felt. The peak now starts at the reading the user starts with
 * and only ever rises. The slider itself stays until DT-05 rebuilds the tool.
 */
export interface UrgeWave {
  current: number;
  peak: number;
}

export function startWave(initial: number): UrgeWave {
  return { current: initial, peak: initial };
}

export function updateWave(wave: UrgeWave, reading: number): UrgeWave {
  return { current: reading, peak: Math.max(wave.peak, reading) };
}

/**
 * Which pull is being surfed (parts data fix 4). The question and its four chips are Find the
 * feeling's own pull step (`FeelingUrge` nodes, shipped in src/data/content/find-the-feeling.json),
 * so a surfed urge lands on the same ids the parts layer already maps to a protective move. One
 * optional tap, ask-fresh: the pick lives only in this visit's ToolSession (`urgeIds`).
 */
export interface PullChoice {
  id: string;
  label: string;
  sub: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** The urges in the graph's order as `{ id, label, sub }`; `[]` for missing or malformed content. */
export function pullChoices(content: unknown): PullChoice[] {
  const urges = isRecord(content) ? content.urges : undefined;
  if (!Array.isArray(urges)) return [];
  return urges
    .filter(isRecord)
    .map((u) => ({ id: text(u.id), label: text(u.label), sub: text(u.sub), order: Number.isFinite(u.order) ? (u.order as number) : Number.MAX_SAFE_INTEGER }))
    .filter((u) => u.id && u.label)
    .sort((a, b) => a.order - b.order)
    .map(({ id, label, sub }) => ({ id, label, sub }));
}

/** The pull step's question (`flow.copy.pull.title`), or '' when the content has none. */
export function pullQuestion(content: unknown): string {
  const flow = isRecord(content) ? content.flow : undefined;
  const copy = isRecord(flow) ? flow.copy : undefined;
  const pull = isRecord(copy) ? copy.pull : undefined;
  return isRecord(pull) ? text(pull.title) : '';
}
