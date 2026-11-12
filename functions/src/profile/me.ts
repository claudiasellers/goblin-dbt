/**
 * The Me surface (PR-P1 backend, PR-P2 UI): every profile area with its items (set-aside ones too,
 * so they can be restored), found words (a log aggregate, read-only, D-10), and open pattern offers.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { int } from '../shared/values';
import { metaFrom } from './meta';
import { readProfileSlices, readProfileVersion, THING_LABELS, THING_OPTION } from './slices';
import type { ProfileAreaId, ProfileItemMeta } from './types';
import { statsByPart } from '../parts/stats';
import { readStatsRows } from '../parts/statsQueries';
import type { PartStats } from '../parts/statsTypes';
import { LATEST_MESSAGES_QUERY } from '../parts/say';
import type { PartMessageLine } from '../parts/sayTypes';
import { partSafetyCypher } from '../safety/partSafetyFlag';
import { ownDecrypter } from '../shared/crypto';
import { PROFILE_KINDS } from './kinds';

export interface MeItem {
  label: 'ProfileFact' | 'MyPattern' | 'OwnLine' | 'Part' | 'Person';
  meta: ProfileItemMeta;
  /** Graph copy for the kind ("Quiet hours", "What helps"). */
  title: string;
  /** Display summary; may contain {toolName} (the client fills it). */
  summary: string;
  /** Which editor the Me surface opens for "change" (null: not editable in place). */
  editor: 'quiet_hours' | null;
  value?: Record<string, unknown>;
  stillTrueCopy: string;
  setAsideCopy: string;
  toolId?: string | null;
  /** Part items only: what the Parts of me card shows. */
  part?: MePart;
}

/**
 * A kept part as its Me card shows it. Never the person's own-words fear (the card never shows it),
 * and no fears at all on a tender part: the conservative branch told them "we'll leave that be".
 */
export interface MePart {
  name: string | null;
  tender: boolean;
  places: string[];
  shapeSig: number[] | null;
  jobIds: string[];
  ownJob: string | null;
  fearIds: string[];
  preferredRoleIds: string[];
  moveIds: string[];
  lastVisitedAt: string | null;
  /**
   * The part safety flag (functions/src/safety/partSafetyFlag.ts), computed here from all of its fears,
   * a tender part's too: the card shows CrisisBanner alongside, never instead.
   */
  safety: boolean;
  /**
   * Active and resting parts only: lane 4's readout (functions/src/parts/stats.ts), passed through
   * untouched (each line null below its threshold). Absent on a set-aside part.
   */
  stats?: PartStats;
  /** Active and resting parts only: the latest thing the person said to it (sayToPart), for "You told it: …". */
  told?: PartMessageLine;
}
/** A part the person said they'd come back to (an open PartCandidate, a log record read for display). */
export interface MePartCandidate {
  id: string;
  origin: string;
  moveIds: string[];
  createdAt: string | null;
}
/** How many open candidates Me shows. */
export const ME_CANDIDATES_MAX = 3;

export interface GetMeResponse {
  version: number;
  staleCount: number;
  name: { firstName: string | null };
  areas: Array<{ id: ProfileAreaId; label: string; blurb: string; items: MeItem[]; kinds: Array<{ id: string; label: string }> }>;
  readOnly: {
    foundWords: Array<{ emotionId: string; name: string | null; count: number }>;
    /** Witness lines the user kept (SAVED_LINE, A5-2), in the you-voice. */
    savedLines: Array<{ lineId: string; text: string }>;
  };
  offers: Array<{ id: string; statement: string; offerCopy: string; toolId: string | null; evidenceCount: number }>;
  /** Open PartCandidates, newest first, at most 3; always empty with parts off. */
  partCandidates: MePartCandidate[];
}

const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** The card's fields from a Part's properties; arrays absent → [], strings absent → null. */
export function mePart(p: Record<string, unknown>, moveIds: unknown, safety: unknown = false): MePart {
  const tender = p.tender === true;
  return {
    name: strOrNull(p.name),
    tender,
    places: ids(p.places),
    shapeSig: Array.isArray(p.shapeSig) ? p.shapeSig.map((x) => (typeof x === 'number' ? x : int(x))) : null,
    jobIds: ids(p.jobIds),
    ownJob: strOrNull(p.ownJob),
    fearIds: tender ? [] : ids(p.fearIds),
    preferredRoleIds: ids(p.preferredRoleIds),
    moveIds: [...new Set(ids(moveIds))].sort(),
    lastVisitedAt: strOrNull(p.lastVisitedAt),
    safety: safety === true,
  };
}

/** Open ones only, newest first (then id), at most ME_CANDIDATES_MAX. The query does the same; this is the second check. */
export function mePartCandidates(rows: Array<Record<string, unknown>>): MePartCandidate[] {
  const t = (v: string | null) => (v ? Date.parse(v) : Number.NaN);
  return rows
    .filter((r) => r.status === 'open' && typeof r.id === 'string')
    .map((r) => ({ id: r.id as string, origin: String(r.origin ?? ''), moveIds: ids(r.moveIds), createdAt: strOrNull(r.createdAt) }))
    .sort((a, b) => (t(b.createdAt) || -Infinity) - (t(a.createdAt) || -Infinity) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, ME_CANDIDATES_MAX);
}

async function readMe(tx: ManagedTransaction, uid: string, now: number): Promise<GetMeResponse> {
  // Parts off (absent = off) hides everything about parts: no part items, and no my_parts area, so a
  // client can't render an empty "Parts of me" for someone who never turned parts on.
  const partsRes = await tx.run(`MATCH (u:User {id: $uid}) RETURN coalesce(u.partsEnabled, false) AS partsOn`, { uid });
  const partsOn = partsRes.records[0]?.get('partsOn') === true;
  const areasRes = await tx.run(
    `MATCH (a:ProfileArea)
     OPTIONAL MATCH (k:ProfileKind)-[:IN_AREA]->(a)
     WITH a, collect(k {.id, .label}) AS kinds
     RETURN a.id AS id, a.label AS label, a.blurb AS blurb, kinds ORDER BY a.order`);
  const itemsRes = await tx.run(
    `MATCH (u:User {id: $uid})-[r:HAS_PROFILE_FACT|HAS_PATTERN|HAS_OWN_LINE|HAS_PERSON|HAS_PART]->(p:ProfileItem)
     WHERE type(r) <> 'HAS_PART' OR coalesce(u.partsEnabled, false)
     OPTIONAL MATCH (k:ProfileKind {id: p.kind})
     OPTIONAL MATCH (rule:PatternRule {id: p.statementId})
     RETURN CASE type(r) WHEN 'HAS_PROFILE_FACT' THEN 'ProfileFact' WHEN 'HAS_OWN_LINE' THEN 'OwnLine'
                         WHEN 'HAS_PART' THEN 'Part' WHEN 'HAS_PERSON' THEN 'Person' ELSE 'MyPattern' END AS label,
            p {.id, .kind, .area, .status, .source, .valueJson, .toolId, .text, .name,
               .tender, .places, .shapeSig, .jobIds, .ownJob, .fearIds, .preferredRoleIds,
               confirmedAt: toString(p.confirmedAt), revisitAt: toString(p.revisitAt),
               lastVisitedAt: toString(p.lastVisitedAt)} AS p,
            CASE type(r) WHEN 'HAS_PART' THEN [(p)-[:USES]->(mv:ProtectiveMove) | mv.id] ELSE [] END AS moveIds,
            CASE type(r) WHEN 'HAS_PART' THEN ${partSafetyCypher('p')} ELSE false END AS safety,
            k.label AS title, k.stillTrueCopy AS stillTrue, k.setAsideCopy AS setAside, rule.statementTemplate AS statement`,
    { uid });
  const words = await tx.run(
    `MATCH (:User {id: $uid})-[w:FOUND_WORD]->(e:Emotion)
     RETURN e.id AS emotionId, e.name AS name, w.count AS count ORDER BY w.lastAt DESC LIMIT 50`,
    { uid });
  const saved = await tx.run(
    `MATCH (:User {id: $uid})-[k:SAVED_LINE]->(l:ValidationLine)
     RETURN l.id AS lineId, l.text AS text ORDER BY k.lastAt DESC LIMIT 50`,
    { uid });
  const offers = await tx.run(
    `MATCH (:User {id: $uid})-[:HAS_PATTERN_OFFER]->(o:PatternOffer {status: 'offered'})
     OPTIONAL MATCH (rule:PatternRule {id: o.ruleId})
     RETURN o.id AS id, rule.statementTemplate AS statement, rule.offerCopy AS offerCopy, o.toolId AS toolId,
            size(coalesce(o.evidenceIds, [])) AS evidenceCount`,
    { uid });
  // Parts to come back to: read only with parts on (and gated in the query too).
  const candidates = partsOn ? await tx.run(
    `MATCH (u:User {id: $uid})-[:HAS_PART_CANDIDATE]->(c:PartCandidate)
     WHERE c.status = 'open' AND coalesce(u.partsEnabled, false)
     RETURN c.id AS id, c.origin AS origin, c.moveIds AS moveIds, toString(c.createdAt) AS createdAt, c.status AS status
     ORDER BY c.createdAt DESC, c.id LIMIT ${ME_CANDIDATES_MAX}`,
    { uid }) : null;
  // The parts' readout (what's helped, how they've felt toward it, when): one read for all parts.
  const stats = partsOn ? statsByPart(await readStatsRows(tx, uid)) : new Map<string, PartStats>();
  // The latest message to each part (log records, read here for display, never by a slice resolver).
  const told = new Map<string, PartMessageLine>();
  if (partsOn) {
    for (const r of (await tx.run(LATEST_MESSAGES_QUERY, { uid })).records) {
      const chipId = strOrNull(r.get('chipId'));
      const own = strOrNull(r.get('own'));
      const at = strOrNull(r.get('at'));
      if (at && (chipId || own)) told.set(String(r.get('partId')), { chipId, own, at });
    }
  }
  const byArea = new Map<string, MeItem[]>();
  let staleCount = 0;
  let decrypt: ((v: unknown) => string | null) | null = null;
  const unnamedThings: Array<{ ids: string[]; item: MeItem }> = [];
  for (const r of itemsRes.records) {
    if (r.get('label') === 'Part' && !partsOn) continue;   // the query gates it too
    const p = r.get('p') as Record<string, unknown>;
    const meta = metaFrom(p, now);
    if (meta.prompt === 'ask') staleCount++;
    let value: Record<string, unknown> | undefined;
    let summary = '';
    let thingIds: string[] | null = null;
    if (p.valueJson) {
      try { value = JSON.parse(String(p.valueJson)); } catch { value = undefined; }
    }
    // A registered kind's own words are stored encrypted (profile/items.ts): read back for the person only.
    const own = Object.prototype.hasOwnProperty.call(PROFILE_KINDS, meta.kind) ? PROFILE_KINDS[meta.kind].ownFields : [];
    if (value && own.some((f) => typeof value![f] === 'string')) {
      decrypt ??= await ownDecrypter(tx, uid);
      for (const f of own) if (typeof value[f] === 'string') value[f] = decrypt(value[f]);
    }
    if (meta.kind === 'quiet_hours' && value) summary = `${value.start}–${value.end}`;
    // A rewritten nightmare: its ending when the person wrote it; picked endings are ids (the title says enough).
    if (meta.kind === 'nightmare_script' && value && typeof value.endingOwn === 'string') summary = value.endingOwn;
    // A pros & cons card: the pull in their words when they wrote it, else their first reason in their words.
    if (meta.kind === 'pros_cons' && value) {
      const own = [value.pullOwn, value.longOwn, value.keepsOwn].find((x) => typeof x === 'string' && x.trim());
      if (typeof own === 'string') summary = own;
    }
    // A habit plan: the behaviour in their words when they wrote it (picked behaviours are ids; the title says enough).
    if (meta.kind === 'abstinence_plan' && value && typeof value.whatOwn === 'string' && value.whatOwn.trim()) summary = value.whatOwn;
    // A thing I like (ER-04): what they called it; a picked one is named from the graph after the loop.
    if (meta.kind === 'thing_i_like' && value) {
      const own = [value.kindOwn, value.pickOwn].find((x) => typeof x === 'string' && x.trim());
      if (typeof own === 'string') summary = own;
      else {
        const ids = (['pick', 'kind'] as const).flatMap((f) => (Array.isArray(value![`${f}Ids`]) ? (value![`${f}Ids`] as unknown[]) : [])
          .filter((x): x is string => typeof x === 'string').slice(0, 1).map((id) => THING_OPTION[f] + id));
        if (ids.length) thingIds = ids;
      }
    }
    // A person (IE-03): the name they gave, never the safety answer (Me is not where that's asked or shown).
    if (meta.kind === 'person' && value) {
      summary = typeof value.label === 'string' ? value.label : '';
      value = { label: value.label, role: value.role };
    }
    if (r.get('label') === 'MyPattern') summary = (r.get('statement') as string | null) ?? '';
    if (r.get('label') === 'OwnLine') summary = String(p.text ?? '');
    if (r.get('label') === 'Part') summary = String(p.name ?? '');
    const part = r.get('label') === 'Part' ? mePart(p, r.get('moveIds'), r.has('safety') ? r.get('safety') : false) : undefined;
    const partStats = part && (meta.status === 'active' || meta.status === 'resting') ? stats.get(meta.id) : undefined;
    if (part && partStats) part.stats = partStats;
    const toldIt = part && (meta.status === 'active' || meta.status === 'resting') ? told.get(meta.id) : undefined;
    if (part && toldIt) part.told = toldIt;
    const item: MeItem = {
      label: r.get('label'), meta, title: (r.get('title') as string | null) ?? meta.kind, summary,
      editor: meta.kind === 'quiet_hours' ? 'quiet_hours' : null,
      ...(value ? { value } : {}),
      stillTrueCopy: (r.get('stillTrue') as string | null) ?? '', setAsideCopy: (r.get('setAside') as string | null) ?? '',
      ...(p.toolId !== undefined ? { toolId: (p.toolId as string | null) ?? null } : {}),
      ...(part ? { part } : {}),
    };
    if (thingIds) unnamedThings.push({ ids: thingIds, item });
    (byArea.get(meta.area) ?? byArea.set(meta.area, []).get(meta.area)!).push(item);
  }
  if (unnamedThings.length) {
    const labels = new Map<string, string>();
    const ids = [...new Set(unnamedThings.flatMap((t) => t.ids))];
    for (const rec of (await tx.run(THING_LABELS, { ids })).records) labels.set(String(rec.get('id')), String(rec.get('label')));
    for (const t of unnamedThings) t.item.summary = t.ids.map((id) => labels.get(id)).find((x) => !!x) ?? '';
  }
  const { name } = await readProfileSlices(tx, uid, 'find-the-feeling', now);
  return {
    version: await readProfileVersion(tx, uid),
    staleCount,
    name,
    areas: areasRes.records.filter((r) => partsOn || r.get('id') !== 'my_parts').map((r) => ({
      id: r.get('id') as ProfileAreaId, label: r.get('label') as string, blurb: r.get('blurb') as string,
      items: byArea.get(r.get('id') as string) ?? [],
      kinds: (r.get('kinds') as Array<{ id: string; label: string }>).filter((k) => k.id),
    })),
    readOnly: {
      foundWords: words.records.map((r) => ({ emotionId: r.get('emotionId'), name: r.get('name') ?? null, count: int(r.get('count')) })),
      savedLines: saved.records.map((r) => ({ lineId: String(r.get('lineId')), text: String(r.get('text') ?? '') })),
    },
    offers: offers.records.map((r) => ({
      id: r.get('id'), statement: r.get('statement') ?? '', offerCopy: r.get('offerCopy') ?? '',
      toolId: r.get('toolId') ?? null, evidenceCount: int(r.get('evidenceCount')),
    })),
    partCandidates: candidates
      ? mePartCandidates(candidates.records.map((r) => ({
        id: r.get('id'), origin: r.get('origin'), moveIds: r.get('moveIds'), createdAt: r.get('createdAt'), status: r.get('status'),
      })))
      : [],
  };
}

export const getMe = callable<unknown, GetMeResponse>(
  { auth: 'required', label: 'getMe', errorMessage: 'Could not load Me' },
  async ({ uid }) => readTx((tx) => readMe(tx, uid as string, Date.now())),
);
