import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ToolSessionContext, type ToolSessionApi, type ToolSessionCloseInput } from '../hooks/useToolSession';
import { closeToolSession, getSpineContent, startToolSession, type SessionExt } from '../services/spine';
import { newId } from '../lib/spine/ids';
import { emotionIdsFromLink, sessionEmotionIds, sessionUrgeIds, spineFrom } from '../lib/spine/toolLink';
import { closeKindFor, durationSec } from '../lib/spine/close';
import { useToday } from '../hooks/useToday';
import { profileCache } from '../lib/profileCache';
import { PROFILE_WRITING_CLOSES } from '../lib/skillRuntime/playerTools';
import type { CapacityReading, ThenVsNow } from '../data/capacityTypes';

/**
 * One ToolSession per tool visit (PR-S3; mounted by ToolPage with `key={location.key}`).
 *
 * Starts the session at mount (status 'open', R19) when signed in; closes it when the tool calls
 * `close()` or, failing that, when the page unmounts: completed if the tool reached its completion
 * screen, else exited early. A killed tab leaves it open, which reads as abandoned (derived).
 */
/**
 * `inside`: a sub-run inside another tool's screen (plan C1 rule 5, R8): entry `embedded`, the host's session
 * as `hostSessionId`, nothing read from the page's address (the host owns that).
 */
/**
 * `deferStart` (persist-nothing, plan C3a R15): nothing is written at mount; the session starts when the tool calls
 * `begin()`, and a visit that never begins leaves no record at all (no ToolSession, no compat ToolUsage). Ending a
 * relationship uses it so that its safety branch saves nothing unless the person chooses to, and a visit left
 * half-way saves nothing either. `persisted` stays false for a deferred visit: nothing else may hang off it.
 */
export function ToolSessionProvider({ toolId, inside, deferStart = false, children }: {
  toolId: string; inside?: { hostSessionId: string }; deferStart?: boolean; children: ReactNode;
}) {
  const { user } = useAuth();
  const location = useLocation();
  const [id] = useState(() => newId());
  const [link] = useState(() => {
    if (inside) {
      return { entry: 'embedded', checkInId: undefined, hostSessionId: inside.hostSessionId, followUpId: undefined, patternId: undefined, emotionIds: [] as string[] } as const;
    }
    const spine = spineFrom(location.state);
    const followUp = new URLSearchParams(location.search).get('followUp');
    const patternId = (location.state as { activationPatternId?: unknown } | null)?.activationPatternId;
    return {
      entry: spine?.entry ?? 'direct',
      checkInId: spine?.checkInId,
      hostSessionId: spine?.hostSessionId,
      followUpId: spine?.followUpId ?? (followUp && /^[0-9a-f-]{36}$/i.test(followUp) ? followUp : undefined),
      patternId: typeof patternId === 'string' ? patternId : undefined,
      // The feelings the link carries (a check-in result's words, or another tool's picks).
      emotionIds: emotionIdsFromLink(location.state),
    } as const;
  });
  const uid = user?.uid ?? null;
  // Fetch the close question's copy when the tool opens, not when it ends, so the question is ready
  // the moment the tool finishes (it used to wait on a cold server call). Cached per page load.
  useEffect(() => { getSpineContent().catch(() => { /* the close is optional */ }); }, []);
  // E2 §A3.6: Today refetches after any close (a skipped close question, Recover's follow-ups, ps_step).
  const { refresh: refreshToday } = useToday();

  const started = useRef<Promise<boolean> | null>(null);
  const startedAt = useRef(0);
  const step = useRef<string | undefined>(undefined);
  const practiced = useRef(false);
  const complete = useRef(false);
  const ext = useRef<SessionExt>({});
  const skills = useRef<string[]>([]);
  const emotionIds = useRef<string[]>([]);
  const urgeIds = useRef<string[]>([]);
  const bandAtStart = useRef<CapacityReading | null>(null);
  const wiseMindAnswer = useRef<string | null>(null);
  const fitsFacts = useRef<'fits' | 'partly' | 'doesnt_fit' | 'unsure' | null>(null);
  const thenVsNow = useRef<ThenVsNow | null>(null);
  const closed = useRef(false);
  const mounted = useRef(false);
  const bare = useRef(false);
  // Deferred (R15): false until `begin()`. The start effect below re-runs when it flips.
  const begun = useRef(!deferStart);
  // Starts the session once: at mount for a normal visit, at `begin()` for a deferred one (R15). Synchronous, so a
  // `ready()` right after `begin()` already waits on the start.
  const start = useCallback(() => {
    if (!uid || !begun.current || started.current || closed.current) return;
    startedAt.current = Date.now();
    started.current = startToolSession({
      id, toolId, entry: link.entry,
      ...(link.checkInId ? { checkInId: link.checkInId } : {}),
      ...(link.hostSessionId ? { hostSessionId: link.hostSessionId } : {}),
      ...(link.followUpId ? { followUpId: link.followUpId } : {}),
      ...(link.patternId ? { patternId: link.patternId } : {}),
      ...(link.emotionIds.length ? { emotionIds: link.emotionIds } : {}),
    }).then(() => true).catch(() => false);
  }, [uid, id, toolId, link]);
  useEffect(() => { start(); }, [start]);

  const api = useMemo<ToolSessionApi>(() => {
    const close = async (input: ToolSessionCloseInput = {}) => {
      if (closed.current) return null;
      closed.current = true;
      const ok = started.current ? await started.current : false;
      if (!ok) return null;
      if (bare.current) {
        // Persist-nothing (R15): the visit began, then the person changed an answer that means nothing is kept.
        try {
          const res = await closeToolSession({ id, status: input.status ?? (complete.current ? 'completed' : 'exited_early') });
          refreshToday();
          return res;
        } catch {
          return null;
        }
      }
      const mergedExt: SessionExt = { ...ext.current };
      const urges = input.urgeIds ? sessionUrgeIds(input.urgeIds) : urgeIds.current;
      for (const [ns, v] of Object.entries(input.ext ?? {})) mergedExt[ns] = { ...mergedExt[ns], ...v };
      try {
        const res = await closeToolSession({
          id,
          status: input.status ?? (complete.current ? 'completed' : 'exited_early'),
          ...(step.current ? { exitStep: step.current } : {}),
          practiced: practiced.current,
          durationSec: durationSec(startedAt.current, Date.now()),
          ...(Object.keys(mergedExt).length ? { ext: mergedExt } : {}),
          ...((input.thenVsNow ?? thenVsNow.current) ? { thenVsNow: input.thenVsNow ?? thenVsNow.current ?? undefined } : {}),
          ...(input.actedOnUrge ? { actedOnUrge: input.actedOnUrge } : {}),
          ...((input.bandAtStart ?? bandAtStart.current) ? { bandAtStart: input.bandAtStart ?? bandAtStart.current ?? undefined } : {}),
          ...(input.bandAtEnd ? { bandAtEnd: input.bandAtEnd } : {}),
          ...(urges.length ? { urgeIds: urges } : {}),
          ...(emotionIds.current.length ? { emotionIds: emotionIds.current } : {}),
          ...(input.detail ? { detail: input.detail } : {}),
          ...((input.skillIds ?? skills.current).length ? { skillIds: input.skillIds ?? skills.current } : {}),
          ...(input.repSource ? { repSource: input.repSource } : {}),
          ...(input.schedule?.length ? { schedule: input.schedule } : {}),
          ...(wiseMindAnswer.current ? { wiseMindAnswer: wiseMindAnswer.current } : {}),
          ...(fitsFacts.current ? { fitsFacts: fitsFacts.current } : {}),
        });
        // A projection wrote to the profile (the debrief's refusal counts, safetyRecheckAt): read it fresh next time.
        if (PROFILE_WRITING_CLOSES.has(toolId) && mergedExt.run) profileCache.clear();
        refreshToday();
        return res;
      } catch {
        return null;
      }
    };
    return {
      id,
      toolId,
      entry: link.entry,
      checkInId: link.checkInId,
      hostSessionId: link.hostSessionId,
      followUpId: link.followUpId,
      closeKind: closeKindFor(toolId),
      // A deferred visit (R15) reads as not persisted until it begins: nothing may hang off it before then.
      persisted: uid !== null && !deferStart,
      // A child's mount effect runs before this provider's start effect: give the start one turn to begin.
      ready: () => (started.current ?? (uid && begun.current
        ? new Promise<boolean>((r) => { setTimeout(() => { void (started.current ?? Promise.resolve(false)).then(r); }, 0); })
        : Promise.resolve(false))),
      setStep: (s) => { step.current = s; },
      markPracticed: () => { practiced.current = true; },
      markComplete: () => { complete.current = true; },
      setExt: (e) => {
        for (const [ns, v] of Object.entries(e)) ext.current[ns] = { ...ext.current[ns], ...v };
      },
      setSkillIds: (ids) => { skills.current = ids; },
      setEmotionIds: (ids) => { emotionIds.current = sessionEmotionIds(ids); },
      setUrgeIds: (ids) => { urgeIds.current = sessionUrgeIds(ids); },
      setBandAtStart: (r) => { bandAtStart.current = r; },
      setWiseMindAnswer: (a) => { wiseMindAnswer.current = a; },
      setFitsFacts: (v) => { fitsFacts.current = v; },
      setThenVsNow: (v) => { thenVsNow.current = v; },
      begin: () => { begun.current = true; start(); },
      setBare: (b) => { bare.current = b; },
      close,
      linkTo: (target, state) => ({
        pathname: `/tool/${target}`,
        state: { ...state, spine: { entry: 'handoff', hostSessionId: id } },
      }),
    };
  }, [id, toolId, link, uid, refreshToday, deferStart, start]);

  // Close on leave. Deferred a tick so StrictMode's dev-only unmount/remount doesn't close it.
  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; }, [api]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setTimeout(() => { if (!mounted.current) void apiRef.current.close(); }, 0);
    };
  }, []);

  return <ToolSessionContext.Provider value={api}>{children}</ToolSessionContext.Provider>;
}
