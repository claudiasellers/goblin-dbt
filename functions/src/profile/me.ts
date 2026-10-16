/**
 * The Me surface (PR-P1 backend, PR-P2 UI): every profile area with its items (set-aside ones too,
 * so they can be restored), found words (a log aggregate, read-only, D-10), and open pattern offers.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { int } from '../shared/values';
import { metaFrom } from './meta';
import { readProfileSlices, readProfileVersion } from './slices';
import type { ProfileAreaId, ProfileItemMeta } from './types';

export interface MeItem {
  label: 'ProfileFact' | 'MyPattern' | 'OwnLine' | 'Part';
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
}
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
    `MATCH (u:User {id: $uid})-[r:HAS_PROFILE_FACT|HAS_PATTERN|HAS_OWN_LINE|HAS_PART]->(p:ProfileItem)
     WHERE type(r) <> 'HAS_PART' OR coalesce(u.partsEnabled, false)
     OPTIONAL MATCH (k:ProfileKind {id: p.kind})
     OPTIONAL MATCH (rule:PatternRule {id: p.statementId})
     RETURN CASE type(r) WHEN 'HAS_PROFILE_FACT' THEN 'ProfileFact' WHEN 'HAS_OWN_LINE' THEN 'OwnLine'
                         WHEN 'HAS_PART' THEN 'Part' ELSE 'MyPattern' END AS label,
            p {.id, .kind, .area, .status, .source, .valueJson, .toolId, .text, .name,
               confirmedAt: toString(p.confirmedAt), revisitAt: toString(p.revisitAt)} AS p,
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
  const byArea = new Map<string, MeItem[]>();
  let staleCount = 0;
  for (const r of itemsRes.records) {
    if (r.get('label') === 'Part' && !partsOn) continue;   // the query gates it too
    const p = r.get('p') as Record<string, unknown>;
    const meta = metaFrom(p, now);
    if (meta.prompt === 'ask') staleCount++;
    let value: Record<string, unknown> | undefined;
    let summary = '';
    if (p.valueJson) {
      try { value = JSON.parse(String(p.valueJson)); } catch { value = undefined; }
    }
    if (meta.kind === 'quiet_hours' && value) summary = `${value.start}–${value.end}`;
    if (r.get('label') === 'MyPattern') summary = (r.get('statement') as string | null) ?? '';
    if (r.get('label') === 'OwnLine') summary = String(p.text ?? '');
    if (r.get('label') === 'Part') summary = String(p.name ?? '');
    const item: MeItem = {
      label: r.get('label'), meta, title: (r.get('title') as string | null) ?? meta.kind, summary,
      editor: meta.kind === 'quiet_hours' ? 'quiet_hours' : null,
      ...(value ? { value } : {}),
      stillTrueCopy: (r.get('stillTrue') as string | null) ?? '', setAsideCopy: (r.get('setAside') as string | null) ?? '',
      ...(p.toolId !== undefined ? { toolId: (p.toolId as string | null) ?? null } : {}),
    };
    (byArea.get(meta.area) ?? byArea.set(meta.area, []).get(meta.area)!).push(item);
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
  };
}

export const getMe = callable<unknown, GetMeResponse>(
  { auth: 'required', label: 'getMe', errorMessage: 'Could not load Me' },
  async ({ uid }) => readTx((tx) => readMe(tx, uid as string, Date.now())),
);
