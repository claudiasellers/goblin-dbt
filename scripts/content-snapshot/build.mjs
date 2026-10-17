#!/usr/bin/env node
/**
 * Content snapshots: the read-only content three check-in screens used to fetch from the graph on
 * every visit, written as files the app ships (src/data/content/). The graph stays the source; these
 * are derived copies, regenerated after every graph load (scripts/content-snapshot/refresh.mjs), so
 * nothing is hand-edited and nothing drifts.
 *
 *   node scripts/content-snapshot/build.mjs                       # newest backups/graph-content-only-*.json
 *   node scripts/content-snapshot/build.mjs --from <export.json>
 *
 * Input: a `node scripts/graph-export.mjs --content-only` export. Anything else is refused: the
 * files ship in the app bundle, where anyone can read them, so a single user-data node stops the
 * build (exit 2) before anything is written.
 *
 * Output (each `{ source: { file, exportedAt }, content }`):
 *   related-words.json     per Emotion id: the "Often alongside" candidates, the getRelatedEmotions
 *                          query minus its opposite-emotion rows (OPPOSITE_OF is "the opposite", not
 *                          "alongside": with them the row showed Abandoned / Apathetic / Ashamed for Restful)
 *   body-map.json          getBodyMapContent for every live map (the app picks the maps for its words);
 *                          places computed by the same functions/src/bodyMap/places.ts
 *   find-the-feeling.json  getFindTheFeelingContent, exactly
 *   discriminating-questions.json  getDiscriminatingQuestions per quadrant (the check-in's
 *                          "Continue" waited on it, cold, before the follow-up questions)
 *   capacity.json          getCapacityContent (band rules, hand-off primitives; loaded with every page)
 *   spine.json             getSpineContent (session-close copy, follow-up types; loaded with every tool)
 *   wise-mind.json         getWiseMindContent (Wise mind's questions, what each mind says, practices, answers, copy)
 *   parts.json             parts copy (schema/parts.cypher), signed-off rows only: no Cloud Function
 *                          serves it; the shape is tests/fixtures/parts-content.json's moves / prompts /
 *                          options / hurts, plus canTouch (Recover event → hurt ids, approved edges),
 *                          cut to the fields screens read (an allowlist, partsAllowlist.mjs)
 * Each builder mirrors the Cypher in the Cloud Function it replaces (named on the function).
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { importTs } from '../../tests/lib/importTs.mjs';
import { projectParts } from './partsAllowlist.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const OUT_DIR = resolve(root, 'src/data/content');
export const BACKUPS_DIR = resolve(root, 'backups');
/** Labels that mark a person's data (functions/src/userdata/layers.ts). None may reach the app. */
export const USER_LABELS = ['User', 'UserData', 'LogRecord', 'ProfileItem', 'System'];

const { placesFromFelt } = await importTs('functions/src/bodyMap/places.ts');

/** A string constant from a source file, so a content / code version mismatch fails here, not in the app. */
function constant(file, name) {
  const m = readFileSync(resolve(root, file), 'utf8').match(new RegExp(`${name}\\s*=\\s*'([^']+)'`));
  if (!m) throw new Error(`Cannot find ${name} in ${file}`);
  return m[1];
}
export const BODY_MAP_VERSION = constant('functions/src/bodyMap/index.ts', 'BODY_MAP_VERSION');
export const FIND_FLOW_VERSION = constant('functions/src/findTheFeeling/index.ts', 'FIND_FLOW_VERSION');
export const CAPACITY_VERSION = constant('functions/src/capacity/index.ts', 'CAPACITY_VERSION');
export const SPINE_VERSION = constant('functions/src/spine/registry.ts', 'SPINE_VERSION');
export const WISE_MIND_VERSION = constant('functions/src/wiseMind/index.ts', 'WISE_MIND_VERSION');

/** Refuses anything but a content-only export with no user data and no dangling relationships. */
export function assertContentOnly(exp) {
  if (exp?.scope !== 'content-only') {
    throw new Error(`Expected a --content-only export, got scope "${exp?.scope}". Run: node scripts/graph-export.mjs --content-only`);
  }
  const personal = exp.nodes.filter((n) => n.labels.some((l) => USER_LABELS.includes(l)));
  if (personal.length) throw new Error(`Export contains ${personal.length} user-data node(s); refusing to build app files from it`);
  const ids = new Set(exp.nodes.map((n) => n.elementId));
  const dangling = exp.relationships.filter((r) => !ids.has(r.start) || !ids.has(r.end));
  if (dangling.length) throw new Error(`Export has ${dangling.length} relationship(s) to nodes it doesn't contain`);
}

export function indexGraph(exp) {
  const byEl = new Map(exp.nodes.map((n) => [n.elementId, n]));
  const has = (n, label) => n.labels.includes(label);
  return {
    nodes: (label) => exp.nodes.filter((n) => has(n, label)),
    /** Relationships of a type, with endpoints resolved and optionally checked by label. */
    rels: (type, fromLabel, toLabel) => exp.relationships
      .filter((r) => r.type === type)
      .map((r) => ({ props: r.props ?? {}, a: byEl.get(r.start), b: byEl.get(r.end) }))
      .filter((r) => (!fromLabel || has(r.a, fromLabel)) && (!toLabel || has(r.b, toLabel))),
  };
}

/** Cypher ORDER BY for numbers / strings ascending: nulls last. */
const asc = (x, y) => (x == null ? (y == null ? 0 : 1) : y == null ? -1 : x < y ? -1 : x > y ? 1 : 0);
const pushTo = (map, k, v) => { if (!map.has(k)) map.set(k, []); map.get(k).push(v); };

/** getRelatedEmotions (functions/src/recommendation/index.ts) without the OPPOSITE_OF rows. */
export function buildRelatedWords(g) {
  const related = new Map();
  for (const r of g.rels('RELATED_TO', 'Emotion', 'Emotion')) { pushTo(related, r.a, r.b); pushTo(related, r.b, r.a); }
  const brainOf = new Map();
  const emotionsOfBrain = new Map();
  for (const r of g.rels('ACTIVATES_DURING', 'BrainStructure', 'Emotion')) { pushTo(brainOf, r.b, r.a); pushTo(emotionsOfBrain, r.a, r.b); }
  const patternsOf = new Map();
  for (const r of g.rels('ASSOCIATED_WITH', 'ActivationPattern', 'Emotion')) pushTo(patternsOf, r.b, r.a);

  const out = {};
  for (const e1 of g.nodes('Emotion').sort((a, b) => asc(a.props.id, b.props.id))) {
    const rows = [];
    const row = (e, reason, score) => rows.push({ id: e.props.id, name: e.props.name ?? null, quadrant: e.props.quadrant ?? null, reason, score });
    for (const rel of new Set(related.get(e1) ?? [])) if (rel.props.id !== e1.props.id) row(rel, 'related feeling', 4);
    // Neural-substrate overlap: emotions sharing a brain structure, and how many activation patterns too.
    const shared = new Map();
    for (const bs of new Set(brainOf.get(e1) ?? [])) {
      for (const e2 of new Set(emotionsOfBrain.get(bs) ?? [])) {
        if (e2.props.id !== e1.props.id) shared.set(e2, (shared.get(e2) ?? 0) + 1);
      }
    }
    const p1 = new Set(patternsOf.get(e1) ?? []);
    for (const [e2, sharedCount] of shared) {
      const overlap = (patternsOf.get(e2) ?? []).filter((p) => p1.has(p)).length;
      if (overlap > 0 && sharedCount > 1) row(e2, 'often occurs together', 3);
      else if (sharedCount > 1) row(e2, 'similar body response', 2);
      else row(e2, 'related feeling', 1);
    }
    // As the query: one row per (id, name, reason) at its best score, best first, then by name.
    const best = new Map();
    for (const r of rows) {
      const k = `${r.id}\u0000${r.name}\u0000${r.reason}`;
      if (!best.has(k) || best.get(k).score < r.score) best.set(k, r);
    }
    const list = [...best.values()].sort((a, b) => b.score - a.score || asc(a.name, b.name));
    if (list.length) out[e1.props.id] = list.map(({ score: _score, ...r }) => r);
  }
  return out;
}

/** getBodyMapContent (functions/src/bodyMap/index.ts) for every live map. */
export function buildBodyMap(g) {
  const head = g.nodes('BodyMapContent').find((n) => n.props.id === 'body_map');
  if (!head || head.props.version !== BODY_MAP_VERSION) {
    throw new Error(`Body map content is ${head ? head.props.version : 'missing'}; the app expects ${BODY_MAP_VERSION}`);
  }
  const padWords = g.nodes('SensationType')
    .filter((s) => s.props.padStatus === 'live')
    .sort((a, b) => asc(a.props.padRank, b.props.padRank))
    .map((s) => ({ id: s.props.id, label: s.props.padLabel, zones: s.props.zones ?? [], regions: s.props.regions ?? [], energy: s.props.energy }));

  const mirrors = g.rels('MIRRORS', 'BodyMap', 'Emotion');
  const groups = g.rels('GROUPS', 'BodyMap', 'Emotion');
  const felt = g.rels('FELT_AS', 'Emotion', 'SensationType').filter((r) => r.props.status === 'live' && r.b.props.padStatus === 'live');
  const maps = g.nodes('BodyMap')
    .filter((m) => m.props.status === 'live')
    .sort((a, b) => asc(a.props.rank, b.props.rank) || asc(a.props.id, b.props.id))
    .map((m) => {
      const wordIds = mirrors.filter((r) => r.a === m).sort((x, y) => asc(x.props.rank, y.props.rank)).map((r) => r.b.props.id);
      const emotions = new Set(groups.filter((r) => r.a === m).map((r) => r.b));
      const rows = felt.filter((r) => emotions.has(r.a)).map((r) => ({
        emotionId: r.a.props.id, region: r.props.region ?? null, sensationId: r.b.props.id,
        label: r.b.props.padLabel ?? null, energy: r.b.props.energy ?? null,
        weight: typeof r.props.weight === 'number' ? r.props.weight : null,
      }));
      return { id: m.props.id, label: m.props.label, wordIds, places: placesFromFelt(rows) };
    });
  return { version: BODY_MAP_VERSION, regions: head.props.regions ?? [], padWords, maps };
}

/** getFindTheFeelingContent (functions/src/findTheFeeling/index.ts), with the same checks. */
export function buildFindTheFeeling(g) {
  const node = g.nodes('FindTheFeelingFlow').find((n) => n.props.id === 'find_the_feeling_flow');
  if (!node || node.props.version !== FIND_FLOW_VERSION) {
    throw new Error(`Find the feeling content is ${node ? node.props.version : 'missing'}; the app expects ${FIND_FLOW_VERSION}`);
  }
  const flow = JSON.parse(node.props.contentJson);
  const gates = flow?.gates;
  if (flow?.version !== FIND_FLOW_VERSION || !gates || !Array.isArray(gates.regulateBands) || !Array.isArray(gates.activateUrges)
    || typeof gates.maxWordsOffered !== 'number' || !Array.isArray(gates.floodedBlankRoutes) || !flow.copy) {
    throw new Error('Invalid find-the-feeling flow content');
  }
  const emotionsOfSignature = new Map();
  for (const r of g.rels('HAS_FEELING_SIGNATURE', 'Emotion', 'FeelingSignature')) pushTo(emotionsOfSignature, r.b, r.a);
  const toolsFor = new Map();
  for (const r of g.rels('ADDRESSES', 'TherapyConcept', 'Emotion')) if (r.a.props.appToolId != null) pushTo(toolsFor, r.b, r.a.props.appToolId);

  const byFamily = new Map();
  for (const inc of g.rels('INCLUDES', 'FeelingFamily', 'FeelingSignature')) {
    for (const e of emotionsOfSignature.get(inc.b) ?? []) {
      pushTo(byFamily, inc.a, {
        emotionId: e.props.id, name: e.props.name ?? e.props.id, shape: inc.b.props.shape, sound: inc.b.props.sound,
        offer: inc.props.offer, addressedBy: [...new Set(toolsFor.get(e) ?? [])].sort(asc),
      });
    }
  }
  const families = [...byFamily.entries()]
    .sort(([a], [b]) => asc(a.props.order, b.props.order))
    .map(([fam, words]) => ({
      id: fam.props.id, label: fam.props.label, order: fam.props.order,
      words: words.sort((x, y) => asc(x.offer, y.offer)),
    }));
  const routes = g.rels('ROUTES_TO', 'FeelingUrge', 'TherapyConcept').filter((r) => r.b.props.appToolId != null);
  const urges = g.nodes('FeelingUrge')
    .sort((a, b) => asc(a.props.order, b.props.order))
    .map((u) => ({
      id: u.props.id, label: u.props.label, sub: u.props.sub ?? null, order: u.props.order,
      routes: routes.filter((r) => r.a === u).sort((x, y) => asc(x.props.rank, y.props.rank)).map((r) => r.b.props.appToolId),
    }));
  if (!families.length || urges.length !== 4) throw new Error('Find the feeling content is incomplete');
  return { version: FIND_FLOW_VERSION, flow, families, urges, floodedBlankRoutes: gates.floodedBlankRoutes };
}

/**
 * getDiscriminatingQuestions (functions/src/recommendation/index.ts) for every quadrant that has
 * questions: the same fields the function returns (never the clinical rationale, citations or
 * signals on the nodes), questions by `order`, each with its responses by `order`.
 */
export function buildDiscriminatingQuestions(g) {
  const responsesOf = new Map();
  for (const r of g.rels('HAS_RESPONSE', 'DiscriminatingQuestion', 'QuestionResponse')) pushTo(responsesOf, r.a, r.b);
  const nextOf = new Map();
  for (const r of g.rels('TRIGGERS_NEXT', 'QuestionResponse', 'DiscriminatingQuestion')) pushTo(nextOf, r.a, r.b);
  const questions = g.nodes('DiscriminatingQuestion');
  const quadrants = [...new Set(questions.flatMap((q) => q.props.applicableQuadrants ?? []))].sort();
  const out = {};
  for (const quadrant of quadrants) {
    out[quadrant] = questions
      .filter((q) => (q.props.applicableQuadrants ?? []).includes(quadrant))
      .sort((a, b) => asc(a.props.order, b.props.order))
      .map((q) => ({
        id: q.props.id, text: q.props.text ?? null, subtext: q.props.subtext ?? null,
        order: Number(q.props.order), required: q.props.required ?? null,
        // One row per (response, next question), as the query's OPTIONAL MATCH returns them.
        responses: (responsesOf.get(q) ?? [])
          .sort((a, b) => asc(a.props.order, b.props.order))
          .flatMap((r) => {
            const base = { id: r.props.id, label: r.props.label ?? null, subtext: r.props.subtext ?? null, order: Number(r.props.order), isEscapeHatch: r.props.isEscapeHatch ?? null };
            const next = nextOf.get(r) ?? [];
            return next.length ? next.map((n) => ({ ...base, triggersNextQuestionId: n.props.id })) : [base];
          }),
      }))
      .filter((q) => q.responses.length > 0);
  }
  return out;
}

/** `int()` in functions/src/shared/values.ts, as JSON sends it: a number, or null where it gives NaN. */
const intOrNull = (v) => (typeof v === 'number' ? v : null);
const parseJson = (s) => JSON.parse(s ?? '{}');

/** getCapacityContent (functions/src/capacity/index.ts), with its version check. */
export function buildCapacity(g) {
  const probe = g.nodes('CapacityProbe').find((n) => n.props.id === 'capacity_probe');
  if (!probe || probe.props.version !== CAPACITY_VERSION) {
    throw new Error(`Capacity content is ${probe ? probe.props.version : 'missing'}; the app expects ${CAPACITY_VERSION}`);
  }
  const primitives = g.nodes('HandoffPrimitive')
    .sort((a, b) => asc(a.props.rank, b.props.rank))
    .map(({ props: h }) => ({
      id: h.id ?? null, component: h.component ?? null, direction: h.direction ?? null, bands: h.bands ?? null,
      blank: h.blank ?? null, rank: intOrNull(h.rank), conceptId: h.conceptId ?? null, copy: parseJson(h.copyJson),
    }));
  const bandRules = g.nodes('BandRule')
    .sort((a, b) => asc(a.props.skillId, b.props.skillId) || asc(a.props.band, b.props.band))
    .map(({ props: r }) => {
      const copy = parseJson(r.copyJson);
      return { skillId: r.skillId ?? null, band: r.band ?? null, mode: r.mode ?? null, ...(copy.headsUp ? { headsUp: copy.headsUp } : {}) };
    });
  return { ...JSON.parse(probe.props.contentJson), version: CAPACITY_VERSION, primitives, bandRules };
}

/** getSpineContent (functions/src/spine/registry.ts): the close flow and readFollowUpTypes. */
export function buildSpine(g) {
  const flow = g.nodes('SessionCloseFlow').find((n) => n.props.id === 'session_close');
  if (!flow || flow.props.version !== SPINE_VERSION) {
    throw new Error(`Spine content is ${flow ? flow.props.version : 'missing'}; the app expects ${SPINE_VERSION}`);
  }
  const { version: _v, ...closeFlow } = JSON.parse(flow.props.contentJson);
  const followUpTypes = g.nodes('FollowUpType')
    .filter((n) => (n.props.reserved ?? false) === false)
    .sort((a, b) => asc(a.props.id, b.props.id))
    .map(({ props: t }) => {
      const content = parseJson(t.contentJson);
      return {
        id: t.id, ownerModule: t.ownerModule ?? null, tier: t.hierarchyTier ?? null, resolveMode: t.resolveMode ?? null,
        deepLinkTemplate: t.deepLinkTemplate ?? null, staleAfterHours: intOrNull(t.staleAfterHours), missedPath: t.missedPath ?? null,
        notify: { push: t.notifyPush === true, inTab: t.notifyInTab === true, ics: t.notifyIcs === true },
        enabled: t.enabled === true,
        ...(content.dir ? { dir: content.dir } : {}),
        copy: content.copy ?? { title: '' }, choices: content.choices ?? [], window: content.window ?? {},
        notification: content.notification ?? '',
      };
    });
  return { version: SPINE_VERSION, closeFlow, followUpTypes };
}

/** Signed off and not waiting on a decision. Edges are reviewed by their source id, so the same test holds for them. */
const signedOff = (props) => props.reviewStatus === 'approved' && props.pending == null;
/** A node's properties; shipParts cuts every row to PARTS_FIELDS (partsAllowlist.mjs), so nothing unlisted ships. */
const partsProps = (n) => ({ ...n.props });
const byOrder = (a, b) => asc(a.order, b.order) || asc(a.id, b.id);

/**
 * The parts content's canonical order, shared by buildParts and the fixture projection the drift test
 * compares it with: rows by `order`, prompts by flow then `order`, flows and steps by name, and the edge
 * lists without an order of their own (namedAs, guardedBy, sameAs) by id. An option's `moves` keep the
 * order they were given (OFFERED_FOR's `order`).
 */
export function sortParts(c) {
  const sortObj = (o, f) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, f(o[k])]));
  return {
    version: c.version,
    moves: [...c.moves].sort(byOrder),
    prompts: Object.fromEntries(Object.entries(c.prompts)
      .sort(([ia, a], [ib, b]) => asc(a.flow, b.flow) || asc(a.order, b.order) || asc(ia, ib))),
    options: sortObj(c.options, (steps) => sortObj(steps, (list) => [...list].sort(byOrder)
      .map((o) => ({ ...o, sameAs: [...o.sameAs].sort((x, y) => asc(x.label, y.label) || asc(x.id, y.id)) })))),
    hurts: [...c.hurts].sort(byOrder).map((h) => ({
      ...h,
      namedAs: [...h.namedAs].sort(asc),
      guardedBy: [...h.guardedBy].sort((x, y) => asc(x.moveId, y.moveId) || asc(x.rank, y.rank)),
    })),
    // Events by id; each list keeps the order it was given (CAN_TOUCH's `order`).
    canTouch: sortObj(c.canTouch, (list) => [...list]),
    // Source label → source id → move id, both by key.
    expresses: sortObj(c.expresses, (table) => sortObj(table, (moveId) => moveId)),
    // The two numbers a screen needs, only once the policy is signed off (absent: the client's pinned defaults).
    ...(c.limits ? { limits: { nameMaxChars: c.limits.nameMaxChars, maxNonSelfAnswers: c.limits.maxNonSelfAnswers } } : {}),
  };
}

/**
 * What parts.json ships: the content in its canonical order, cut to the allowlist (PARTS_FIELDS in
 * partsAllowlist.mjs). buildParts and the fixture projection both end here.
 */
export const shipParts = (c) => projectParts(sortParts(c));

/**
 * Parts copy (schema/parts.cypher, from scripts/parts/content.py), signed-off rows only: a parts screen
 * renders only once its copy is signed off, so today this is nearly empty. Only what a screen reads
 * (PARTS_FIELDS, partsAllowlist.mjs: every row is cut to it):
 * trail rules, contexts and the rest of the policy (inference rules and safety numbers) stay on the server
 * (only `limits`, its name length and non-Self answer count, ships once the policy is signed off), and Two
 * pulls' pairs and keepsake wait for their phase. `expresses` (module id → move, approved edges to shipped
 * moves) feeds the in-the-moment unblend line. An approved option ships even when its prompt (or a
 * move it is offered for) isn't approved yet; the client checks a flow is complete (flowReady).
 * No parts content at all (parts.cypher not loaded yet) is an empty file, not an error.
 */
export function buildParts(g) {
  const rows = (label) => g.nodes(label).filter((n) => signedOff(n.props));
  const edges = (type, from, to) => g.rels(type, from, to).filter((r) => signedOff(r.props) && signedOff(r.a.props));
  const moveNodes = rows('ProtectiveMove').filter((n) => n.props.offerable === true);
  const promptNodes = rows('PartPrompt').filter((n) => n.props.copyKind !== 'keepsake');
  const optionNodes = rows('PartOption');
  const hurtNodes = rows('ProtectedHurt');

  const versions = [...new Set([...moveNodes, ...promptNodes, ...optionNodes, ...hurtNodes].map((n) => n.props.version))];
  if (versions.length > 1) throw new Error(`Parts content mixes versions ${versions.join(', ')}; load schema/parts.cypher again`);
  // With nothing signed off, the version every parts node carries reaches the file through the policy node.
  const policy = g.nodes('PartsPolicy').find((n) => n.props.id === 'parts');
  const version = versions[0] ?? policy?.props.version ?? null;
  const limits = policy && signedOff(policy.props)
    ? { nameMaxChars: policy.props.nameMaxChars, maxNonSelfAnswers: policy.props.maxNonSelfAnswers } : null;

  const offered = edges('OFFERED_FOR', 'PartOption', 'ProtectiveMove');
  const same = edges('SAME_AS', 'PartOption');
  const named = edges('NAMED_AS', 'ProtectedHurt', 'Emotion');
  const guards = edges('OFTEN_GUARDS', 'ProtectiveMove', 'ProtectedHurt');
  // Recover's "what happened" → the hurts it can touch (the angry card's chip order in Recover). The
  // event is Recover's content, not parts': an edge ships when it is approved and its hurt ships.
  const hurtIds = new Set(hurtNodes.map((h) => h.props.id));
  const canTouch = {};
  for (const r of g.rels('CAN_TOUCH', 'InvalidationEvent', 'ProtectedHurt')
    .filter((x) => signedOff(x.props) && hurtIds.has(x.b.props.id))
    .sort((x, y) => asc(x.props.order, y.props.order) || asc(x.b.props.id, y.b.props.id))) {
    (canTouch[r.a.props.id] ??= []).push(r.b.props.id);
  }

  // The unblend line (A part of you {move} right now.): each module id → the move it expresses, grouped by
  // its label (ActionUrge, FeelingUrge, PullOption, …). Reviewed by the source id (the edge's status; the
  // source is another module's content); ships only when the move ships, so go_blank / zone_out never do.
  const moveIds = new Set(moveNodes.map((m) => m.props.id));
  const expresses = {};
  for (const r of g.rels('EXPRESSES', null, 'ProtectiveMove').filter((x) => signedOff(x.props) && moveIds.has(x.b.props.id))) {
    (expresses[[...r.a.labels].sort()[0]] ??= {})[r.a.props.id] = r.b.props.id;
  }

  const options = {};
  for (const o of optionNodes) {
    const { flow, step } = o.props;
    ((options[flow] ??= {})[step] ??= []).push({
      id: o.props.id, ...partsProps(o),
      // Neo4j drops a null property; the shape keeps these two as null (scripts/parts/fixture.py).
      flag: o.props.flag ?? null, selfLike: o.props.selfLike ?? null,
      moves: offered.filter((r) => r.a === o).sort((x, y) => asc(x.props.order, y.props.order) || asc(x.b.props.id, y.b.props.id)).map((r) => r.b.props.id),
      sameAs: same.filter((r) => r.a === o).map((r) => ({ label: [...r.b.labels].sort()[0], id: r.b.props.id })),
    });
  }
  return shipParts({
    version,
    moves: moveNodes.map((m) => ({ id: m.props.id, ...partsProps(m) })),
    prompts: Object.fromEntries(promptNodes.map((p) => [p.props.id, partsProps(p)])),
    options,
    hurts: hurtNodes.map((h) => ({
      id: h.props.id, ...partsProps(h),
      namedAs: named.filter((r) => r.a === h).map((r) => r.b.props.id),
      guardedBy: guards.filter((r) => r.b === h).map((r) => ({ moveId: r.a.props.id, rank: r.props.rank })),
    })),
    canTouch,
    expresses,
    limits,
  });
}

/**
 * getWiseMindContent (functions/src/wiseMind/index.ts), with its version check. null when the graph has
 * no Wise mind content at all (a load that runs before schema/wise-mind.cypher's first load): the
 * committed wise-mind.json is kept, so the load order of a deploy doesn't matter. A wrong version throws.
 */
export function buildWiseMind(g) {
  const flow = g.nodes('WiseMindFlow').find((n) => n.props.id === 'wise_mind_flow');
  if (!flow) return null;
  if (flow.props.version !== WISE_MIND_VERSION) {
    throw new Error(`Wise mind content is ${flow.props.version}; the app expects ${WISE_MIND_VERSION}`);
  }
  const doc = JSON.parse(flow.props.contentJson);
  const voicesOf = new Map();
  for (const r of g.rels('VOICES', 'MindVoice', 'WiseMindQuestion')) pushTo(voicesOf, r.b.props.id, r.a.props);
  const questions = g.nodes('WiseMindQuestion')
    .sort((a, b) => asc(a.props.order, b.props.order))
    .map(({ props: q }) => {
      const vs = (voicesOf.get(q.id) ?? []).sort((a, b) => asc(a.mind, b.mind) || asc(a.order, b.order));
      const side = (m) => vs.filter((v) => v.mind === m).map((v) => ({ id: v.id, label: v.label }));
      return { id: q.id, label: q.label, order: intOrNull(q.order), defaultPracticeId: q.defaultPracticeId,
        voices: { emotion: side('emotion'), reason: side('reason') } };
    });
  const practices = g.rels('HAS_PRACTICE', 'TherapyConcept', 'WiseMindPractice')
    .filter((r) => r.a.props.id === 'dbt_wise_mind')
    .map((r) => r.b.props)
    .sort((a, b) => asc(a.order, b.order))
    .map((p) => ({ id: p.id, name: p.name, sub: p.sub, kind: p.kind, lines: p.lines ?? [], breaths: intOrNull(p.breaths),
      seconds: intOrNull(p.seconds), order: intOrNull(p.order) }));
  const answers = g.nodes('WiseMindAnswer')
    .sort((a, b) => asc(a.props.order, b.props.order))
    .map(({ props: a }) => ({ id: a.id, label: a.label, order: intOrNull(a.order), nextToolIds: a.nextToolIds ?? [], kind: a.kind ?? null }));
  return { version: WISE_MIND_VERSION, ownMax: doc.ownMax, copy: doc.copy, questions, practices, answers };
}

/** Files a graph may not have content for yet: missing from an export, the committed file is kept. */
export const KEPT_WHEN_MISSING = ['wise-mind.json'];

/**
 * All the snapshots from one export (pure apart from reading the version constants). A file in
 * KEPT_WHEN_MISSING whose content isn't in the graph yet is left out (main keeps the committed one).
 */
export function buildSnapshots(exp) {
  assertContentOnly(exp);
  const g = indexGraph(exp);
  const wiseMind = buildWiseMind(g);
  return {
    'related-words.json': buildRelatedWords(g),
    'body-map.json': buildBodyMap(g),
    'find-the-feeling.json': buildFindTheFeeling(g),
    'discriminating-questions.json': buildDiscriminatingQuestions(g),
    'capacity.json': buildCapacity(g),
    'spine.json': buildSpine(g),
    'parts.json': buildParts(g),
    ...(wiseMind ? { 'wise-mind.json': wiseMind } : {}),
  };
}

/** The newest content-only export in backups/. */
export function newestExport(dir = BACKUPS_DIR) {
  const files = readdirSync(dir)
    .filter((f) => /^graph-content-only-.*\.json$/.test(f))
    .map((f) => join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!files.length) throw new Error(`No graph-content-only-*.json in ${dir}. Run: node scripts/graph-export.mjs --content-only`);
  return files[0];
}

/**
 * Write the snapshots to `outDir` (src/data/content/ by default). A KEPT_WHEN_MISSING file the export had
 * no content for is not touched: a warning says the committed one was kept.
 */
export function writeSnapshots(snapshots, source, { outDir = OUT_DIR, log = console } = {}) {
  mkdirSync(outDir, { recursive: true });
  for (const name of KEPT_WHEN_MISSING.filter((n) => !(n in snapshots))) {
    log.warn(`! src/data/content/${name}: no content for it in this graph yet; kept the committed file`);
  }
  for (const [name, content] of Object.entries(snapshots)) {
    const text = `${JSON.stringify({ source, content }, null, 2)}\n`;
    writeFileSync(join(outDir, name), text);
    log.log(`✓ src/data/content/${name.padEnd(22)} ${(text.length / 1024).toFixed(1)} KB`);
  }
  log.log(`  from ${source.file} (exported ${source.exportedAt})`);
}

function main() {
  const args = process.argv.slice(2);
  const from = args.includes('--from') ? resolve(args[args.indexOf('--from') + 1]) : newestExport();
  const exp = JSON.parse(readFileSync(from, 'utf8'));
  let snapshots;
  try {
    snapshots = buildSnapshots(exp);
  } catch (e) {
    console.error(`✗ ${e.message}\n  Nothing written.`);
    process.exit(2);
  }
  writeSnapshots(snapshots, { file: basename(from), exportedAt: exp.exportedAt });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
