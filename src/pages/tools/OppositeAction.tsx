import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { getEmotionById, getEmotionByName } from "../../data/emotions";
import { getToolById } from "../../data/tools";
import { getMicroStepsForPattern, type MicroStep } from "../../data/microSteps";
import { EmotionPicker } from "../../components/tools/EmotionPicker";
import { ToolLoading } from "../../components/tools/ToolLoading";
import { HoldToConfirm } from "../../components/tools/oppositeAction/HoldToConfirm";
import { UrgeScale } from "../../components/tools/oppositeAction/UrgeScale";
import { TapCard } from "../../components/tools/oppositeAction/TapCardLoop";
import { UrgeBars } from "../../components/tools/oppositeAction/UrgeBars";
import { UrgeTrend } from "../../components/tools/oppositeAction/UrgeTrend";
import { Card, ChoiceList, Field } from "../../components/tools/oppositeAction/ui";
import {
  choiceButton,
  choiceSelected,
  enterAnimation,
  linkButton,
  primaryButton,
  secondaryText,
} from "../../components/tools/oppositeAction/styles";
import { useAuth } from "../../contexts/AuthContext";
import { useOppositeActionFollowUpsContext } from "../../hooks/useOppositeActionFollowUps";
import {
  getOppositeActionContent,
  getOppositeActionSession,
  saveOppositeActionSession,
  type OppositeActionContent,
} from "../../services/neo4j";
import type {
  OppositeActionFlow,
  OppositeActionSession,
} from "../../data/oppositeActionTypes";
import {
  capacityDefaultSize,
  fill,
  OA_RESULT_CLEARED,
  oaResultExt,
  oppositeActionRoute,
  type OppositeActionRoute,
  urgePhrase,
  urgeReadout,
} from "../../lib/oppositeAction";
import {
  buildFollowUpIcs,
  dueAtFor,
  dueAtForNextTime,
  followUpUrl,
  type DueWindow,
} from "../../lib/oppositeActionFollowUp";
import { useToolSession } from "../../hooks/useToolSession";
import { useUnblendLine } from "../../hooks/useUnblendLine";
import { useOaGoalLine } from "../../hooks/useOaGoalLine";
import { GoalLine } from "../../components/tools/oppositeAction/GoalLine";
import { oaSkillIds } from "../../lib/spine/wrap";
import { CheckFactsEntryLink } from "../../components/skillPlayer/CheckFactsEntryLink";

const FLOW_VERSION = "oa-guided-v2";

type Stage =
  | "identify"
  | "urge"
  | "check"
  | "body"
  | "plan"
  | "try"
  | "reflect"
  | "followup"
  | "summary";

/** Progress dots: try / reflect / follow-up share one beat. */
const DOTS: Stage[][] = [
  ["identify"],
  ["urge"],
  ["check"],
  ["body"],
  ["plan"],
  ["try", "reflect", "followup"],
  ["summary"],
];
const TITLES: Record<Stage, string> = {
  identify: "Name it",
  urge: "The urge",
  check: "Quick check",
  body: "Body reset",
  plan: "Pick a step",
  try: "Try it",
  reflect: "How it went",
  followup: "Checking in",
  summary: "Your readout",
};

const CHECK_STEPS = ["goal", "safety", "facts", "effectiveness"] as const;
const SAFETY_STEP = 1;
const EFFECTIVENESS_STEP = CHECK_STEPS.indexOf("effectiveness");
/** Index of the route result card that follows the last question. */
const CHECK_RESULT = CHECK_STEPS.length;

/** Parts on: the goal line above the effectiveness question, which the focused question is read with. */
const OA_GOAL_LINE_ID = "oa-goal-line";

const MISSED_COPY: Record<string, string> = {
  too_strong: "missedTooStrong",
  no_moment: "missedNoMoment",
  forgot: "missedForgot",
  chose_not: "missedChoseNot",
};
const ROUTE_HEADING: Record<string, string> = {
  opposite: "routeHeadingOpposite",
  problem: "routeHeadingProblem",
  clarify: "routeHeadingClarify",
  support: "routeHeadingSupport",
};

type Size = "small" | "medium" | "bigger";
const SIZE_COPY: Record<Size, string> = {
  small: "sizeSmall",
  medium: "sizeMedium",
  bigger: "sizeBigger",
};

/** Words too generic to count as two body cues "overlapping". */
const STOP_WORDS = new Set([
  "your", "with", "from", "that", "this", "into", "them", "then", "have",
  "just", "each", "feel", "notice", "slowly", "gently", "down", "away", "they",
  "than", "while", "what", "where", "onto", "over", "take", "make", "breath",
  "breathe", "once", "more", "some", "like", "back",
]);
function cueWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]+/g) ?? [])
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
    .map((w) => w.replace(/s$/, ""));
}

/** Working copy: identical to the saved session except the baseline may be unrated. */
type Draft = Omit<OppositeActionSession, "urgeBefore"> & {
  urgeBefore: number | null;
};

const blank = (): Draft => ({
  id: crypto.randomUUID(),
  schemaVersion: 2,
  contentVersion: "",
  emotionId: "",
  parentId: "",
  urgeId: "",
  urgeLabel: "",
  customUrge: "",
  situation: "",
  observation: "",
  interpretation: "",
  goal: "",
  safety: "",
  facts: "",
  effectiveness: "",
  urgeBefore: null,
  urgeAfterBody: null,
  urgeAfter: null,
  intensityBefore: null,
  intensityAfter: null,
  bodyCues: [],
  actionSize: "",
  action: "",
  cueId: "",
  cue: "",
  dueAt: "",
  barrier: "",
  backup: "",
  status: "planned",
  outcome: "",
  missedReason: "",
  reflection: "",
  sourceIds: [],
});

/** Shape the draft to satisfy validateOppositeActionSession (v2) for its status. */
function toPayload(d: Draft, urgeLabel: string): OppositeActionSession | null {
  if (d.urgeBefore === null) return null;
  const snag = d.barrier && d.barrier !== "none";
  const base: OppositeActionSession = {
    ...d,
    schemaVersion: 2,
    urgeBefore: d.urgeBefore,
    urgeLabel: urgeLabel.trim(),
    customUrge: d.urgeId === "custom" ? d.customUrge.trim() : "",
    situation: "",
    backup: snag ? d.backup : "",
    bodyCues: d.bodyCues.slice(0, 6),
    intensityAfter: d.intensityBefore === null ? null : d.intensityAfter,
  };
  if (d.status === "planned")
    return {
      ...base,
      urgeAfter: null,
      intensityAfter: null,
      outcome: "",
      missedReason: "",
      reflection: "",
    };
  if (d.status === "missed")
    return { ...base, urgeAfter: null, intensityAfter: null, outcome: "" };
  return { ...base, missedReason: "" };
}

function idsFromState(state: unknown): string[] {
  const raw = (state as { checkinEmotions?: string[] } | null)?.checkinEmotions;
  return (raw ?? [])
    .map((n) => getEmotionById(n)?.id ?? getEmotionByName(n)?.id)
    .filter((id): id is string => !!id);
}

function formatDue(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function downloadFile(filename: string, text: string, type: string) {
  const href = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function ProgressDots({ stage }: { stage: Stage }) {
  const current = DOTS.findIndex((group) => group.includes(stage));
  return (
    <div className="flex items-center gap-1.5">
      <span className="sr-only">
        Part {current + 1} of {DOTS.length}
      </span>
      {DOTS.map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`h-2 rounded-full motion-safe:transition-all ${
            i === current
              ? "w-5 bg-[var(--color-accent)]"
              : i < current
                ? "w-2 bg-[var(--color-accent)]"
                : "w-2 bg-[var(--color-border)]"
          }`}
        />
      ))}
    </div>
  );
}

export function OppositeAction() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const followUpId = searchParams.get("followUp");
  const { user, loading: authLoading } = useAuth();
  const { refresh: refreshFollowUps } = useOppositeActionFollowUpsContext();
  const toolSession = useToolSession();
  const patternId =
    (location.state as { activationPatternId?: string } | null)
      ?.activationPatternId ?? "fallback";

  const [stage, setStage] = useState<Stage>("identify");
  const [ids, setIds] = useState<string[]>(() => idsFromState(location.state));
  const [loading, setLoading] = useState(
    () => !followUpId && idsFromState(location.state).length === 1,
  );
  const [data, setData] = useState<OppositeActionContent | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  // The one emotion worked with is the session's when it opened without any (a hand-off's are kept).
  useEffect(() => {
    toolSession.setEmotionIds(draft.emotionId ? [draft.emotionId] : []);
  }, [draft.emotionId, toolSession]);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [checkStep, setCheckStep] = useState(0);
  const [customAction, setCustomAction] = useState(false);
  const [stepOpen, setStepOpen] = useState(true);
  const [escapeStep, setEscapeStep] = useState<MicroStep | null>(null);
  const [dueWindow, setDueWindow] = useState("");
  const [cueHour, setCueHour] = useState(0);
  const [followMode, setFollowMode] = useState(false);
  const [followChoice, setFollowChoice] = useState("");
  const [followStatus, setFollowStatus] = useState<
    "none" | "loading" | "notfound" | "error"
  >(() => (followUpId ? "loading" : "none"));
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  /** True once the missed record for this session is confirmed saved. */
  const [missedRecorded, setMissedRecorded] = useState(false);

  const requestId = useRef(0);
  const saveLock = useRef(false);
  /** A check result is on this visit's ToolSession (ext.er), so a step back must clear it. */
  const checkRecorded = useRef(false);
  /** Latest draft id, so a save that resolves late never marks a different session saved. */
  const draftId = useRef(draft.id);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [stage]);
  useEffect(() => {
    draftId.current = draft.id;
  }, [draft.id]);
  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  const flow: OppositeActionFlow | undefined = data?.flow;
  const c = flow?.copy ?? {};
  const choices = flow?.choices ?? {};
  const mapping = data?.emotions.find((e) => e.emotionId === draft.emotionId);
  const protocol = data?.parents[draft.parentId];
  const urge = protocol?.urges.find((u) => u.id === draft.urgeId);
  const urgeLabel =
    draft.urgeId === "custom"
      ? draft.customUrge
      : (urge?.label ?? draft.urgeLabel);
  const urgeText = urgePhrase(urgeLabel);
  // Parts on: "A part of you … right now." once an urge is picked, above what comes next (never for
  // "My urge is different": free text has no move).
  const unblend = useUnblendLine("oa", draft.urgeId && draft.urgeId !== "custom" ? draft.urgeId : null, stage === "urge");
  // Parts on: on the effectiveness card, the pull beside the person's goal (src/lib/oaGoalLine.ts). The
  // goal's label is OA's own choice; the line never shows for "My urge is different" or a safety-line move.
  const goalLine = useOaGoalLine(
    {
      urgeId: draft.urgeId || null,
      goalLabel: choices.goal?.find((o) => o.id === draft.goal)?.label ?? null,
    },
    stage === "check" && checkStep === EFFECTIVENESS_STEP,
  );
  const emotion = getEmotionById(draft.emotionId)?.name ?? "";
  const emotionLower = emotion.toLowerCase();
  const examples = urge ?? protocol?.defaultOpposites;
  const later = draft.status === "planned" && draft.cueId !== "now";
  const anchors = { lowLabel: c.scaleLow, highLabel: c.scaleHigh };
  const holdCopy = {
    holdLabel: c.bodyHold,
    holdingLabel: c.bodyHolding,
    countdownLabel: c.bodyCountdown,
    srHint: c.bodyHoldHint,
    doneLabel: c.bodyDone,
  };

  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((s) => ({ ...s, [key]: value }));
    setSaveState("idle");
  };
  const patch = (values: Partial<Draft>) => {
    setDraft((s) => ({ ...s, ...values }));
    setSaveState("idle");
  };
  const go = (next: Stage) => {
    setError("");
    setStage(next);
  };
  // Parts data fix 3: the urge and the check's result reach this visit's ToolSession as ids, set
  // by the tap that makes them, never from a hydrated plan (both are ask-fresh). No markComplete()
  // on `problem`: a completed visit here logs an opposite-action rep (closeTx writes one per
  // PracticeSkill.defaultFor), and judging the urge would help is not one. It closes as exited
  // early, with its step and ext.er.
  const recordCheck = (
    safety: string,
    facts: string,
    effectiveness: string,
    route: OppositeActionRoute,
  ) => {
    toolSession.setExt({
      er: { ...OA_RESULT_CLEARED, ...oaResultExt(safety, facts, effectiveness, route) },
    });
    toolSession.setStep(`result_${route}`);
    checkRecorded.current = true;
  };
  /**
   * The result no longer stands (Recheck, Previous, Back, another urge). Only once one was
   * recorded, so a visit that never reached a result sends no `ext.er` and no step, as before.
   */
  const clearCheck = (step: Stage) => {
    if (!checkRecorded.current) return;
    checkRecorded.current = false;
    toolSession.setExt({ er: OA_RESULT_CLEARED });
    toolSession.setStep(step);
  };
  const resetPlan = () => {
    patch({
      action: "",
      actionSize: "",
      cueId: "",
      cue: "",
      dueAt: "",
      barrier: "",
      backup: "",
      status: "planned",
      outcome: "",
      missedReason: "",
      reflection: "",
      urgeAfter: null,
      intensityAfter: null,
    });
    setCustomAction(false);
    setStepOpen(true);
    setDueWindow("");
  };
  const resetBody = () => {
    patch({ bodyCues: [], urgeAfterBody: null });
    setEscapeStep(null);
  };

  /**
   * Start another attempt on the same urge as a NEW session. Safety, facts and
   * effectiveness are cleared and re-asked from the safety card: circumstances
   * may have changed since the last attempt.
   */
  const restartFromSafety = (values: Partial<Draft>) => {
    setDraft((s) => ({
      ...s,
      id: crypto.randomUUID(),
      safety: "",
      facts: "",
      effectiveness: "",
      urgeAfterBody: null,
      urgeAfter: null,
      intensityAfter: null,
      bodyCues: [],
      cueId: "",
      cue: "",
      dueAt: "",
      status: "planned",
      outcome: "",
      missedReason: "",
      reflection: "",
      ...values,
    }));
    setEscapeStep(null);
    setDueWindow("");
    setFollowMode(false);
    setFollowChoice("");
    setNoteOpen(false);
    setSaveState("idle");
    setCheckStep(SAFETY_STEP);
    go("check");
  };

  const toolLink = (id: string, label?: string) => {
    const normalized = id.replace(/^dbt_/, "").replace(/_/g, "-");
    const tool = getToolById(normalized);
    return tool ? (
      <Link
        key={normalized}
        className={`${choiceButton} block`}
        to={`/tool/${normalized}`}
        state={{ checkinEmotions: [draft.emotionId] }}
      >
        {label ?? `Open ${tool.name}`} →
      </Link>
    ) : (
      <Link key="tools" className={`${choiceButton} block`} to="/tools">
        Explore other tools →
      </Link>
    );
  };

  // ── Content loading (ticket guards against stale responses) ──
  async function fetchContent(target: string[]) {
    const ticket = ++requestId.current;
    try {
      const result = await getOppositeActionContent(target);
      if (ticket !== requestId.current) return;
      if (!result.flow || result.flow.version !== FLOW_VERSION)
        throw new Error("content");
      const match = result.emotions.find((e) => e.emotionId === target[0]);
      if (!match) throw new Error("content");
      if (
        match.applicable &&
        (!match.dbtParent || !result.parents[match.dbtParent])
      )
        throw new Error("content");
      setData(result);
      setDraft({
        ...blank(),
        emotionId: target[0],
        parentId: match.dbtParent ?? "",
        contentVersion: result.flow.version,
        sourceIds: result.flow.sourceIds,
      });
      toolSession.setUrgeIds([]);
      clearCheck("urge");
      setCheckStep(0);
      setCustomAction(false);
      setStepOpen(true);
      setEscapeStep(null);
      setDueWindow("");
      setFollowMode(false);
      setFollowChoice("");
      setNoteOpen(false);
      setSaveState("idle");
      setError("");
      setLoading(false);
      setStage("urge");
    } catch {
      if (ticket === requestId.current) {
        setError(
          "The guided content could not load. Your selection is still here. Please retry or choose another tool.",
        );
        setLoading(false);
      }
    }
  }
  function startLoad() {
    if (ids.length !== 1) return;
    setLoading(true);
    setError("");
    void fetchContent(ids);
  }

  // Check-in handed us exactly one emotion: skip the picker.
  const autoLoad = useEffectEvent(() => {
    if (!followUpId && ids.length === 1) void fetchContent(ids);
  });
  useEffect(() => {
    autoLoad();
  }, []);

  // Follow-up mode: ?followUp=<sessionId> resumes a saved plan.
  const loadFollowUp = useEffectEvent(async (sessionId: string) => {
    const ticket = ++requestId.current;
    try {
      const saved = await getOppositeActionSession(sessionId);
      if (ticket !== requestId.current) return;
      if (!saved || saved.schemaVersion !== 2 || saved.status !== "planned") {
        setFollowStatus("notfound");
        return;
      }
      const result = await getOppositeActionContent([saved.emotionId]);
      if (ticket !== requestId.current) return;
      if (!result.flow || result.flow.version !== FLOW_VERSION)
        throw new Error("content");
      const match = result.emotions.find((e) => e.emotionId === saved.emotionId);
      if (!match?.applicable || !result.parents[saved.parentId])
        throw new Error("content");
      const hydrated: Draft & { createdAt?: string; updatedAt?: string } = {
        ...blank(),
        ...saved,
        bodyCues: Array.isArray(saved.bodyCues) ? saved.bodyCues : [],
      };
      delete hydrated.createdAt;
      delete hydrated.updatedAt;
      setData(result);
      setIds([saved.emotionId]);
      setDraft(hydrated);
      setCustomAction(hydrated.actionSize === "custom");
      setStepOpen(false);
      setFollowMode(true);
      setFollowChoice("");
      setFollowStatus("none");
      setSaveState("idle");
      setStage("followup");
    } catch {
      if (ticket === requestId.current) setFollowStatus("error");
    }
  });
  const uid = user?.uid;
  useEffect(() => {
    if (!followUpId || authLoading || !uid) return;
    void loadFollowUp(followUpId);
  }, [followUpId, authLoading, uid]);
  const followBlocked = !!followUpId && !authLoading && !uid;

  // ── Saving (explicit only) ──
  /**
   * Resolves to the saved draft (with its final dueAt) or null.
   * A call made while another save is in flight returns null WITHOUT touching
   * the UI state, so "Saved" can never describe a payload that was not sent.
   */
  async function save(d: Draft = draft): Promise<Draft | null> {
    if (!user || saveLock.current) return null;
    const label =
      d.urgeId === "custom"
        ? d.customUrge
        : (protocol?.urges.find((u) => u.id === d.urgeId)?.label ?? d.urgeLabel);
    // Follow-up times are computed at save time, not when the chip was tapped.
    let dueAt = d.dueAt;
    if (d.status === "planned") {
      if (d.cueId === "today" && dueWindow)
        dueAt = dueAtFor(dueWindow as DueWindow).toISOString();
      else if (d.cueId === "next_time") dueAt = dueAtForNextTime().toISOString();
    }
    const fresh: Draft = { ...d, dueAt };
    const payload = toPayload(fresh, label);
    if (!payload) return null;
    saveLock.current = true;
    setSaveState("saving");
    if (dueAt !== d.dueAt)
      setDraft((s) => (s.id === d.id ? { ...s, dueAt } : s));
    try {
      await saveOppositeActionSession(payload);
      if (draftId.current === d.id) setSaveState("saved");
      refreshFollowUps?.();
      // PR-S4: link this visit to the saved session; practising it is a rep of opposite action.
      // (The server mirrors a plan's due time as FollowUp oa_plan in the same save.)
      void toolSession.close({
        status: "completed",
        detail: { kind: "opposite_action", id: fresh.id },
        ...(oaSkillIds(fresh.status) ? { skillIds: oaSkillIds(fresh.status) } : {}),
      });
      return fresh;
    } catch {
      if (draftId.current === d.id) setSaveState("error");
      return null;
    } finally {
      saveLock.current = false;
    }
  }

  function calendarReminder(d: Draft) {
    if (!d.dueAt) return;
    const url = user
      ? followUpUrl(d.id)
      : `${window.location.origin}${window.location.pathname}#/tool/opposite-action`;
    downloadFile(
      "check-in.ics",
      buildFollowUpIcs({
        uid: d.id,
        start: new Date(d.dueAt),
        title: c.calendarTitle,
        body: c.calendarBody ?? "",
        url,
      }),
      "text/calendar;charset=utf-8",
    );
  }

  function startNew() {
    requestId.current += 1;
    setDraft(blank());
    toolSession.setUrgeIds([]);
    clearCheck("identify");
    setData(null);
    setIds([]);
    setLoading(false);
    setSaveState("idle");
    setFollowMode(false);
    setFollowChoice("");
    setFollowStatus("none");
    setCheckStep(0);
    setStepOpen(true);
    setEscapeStep(null);
    setNoteOpen(false);
    if (followUpId)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("followUp");
          return next;
        },
        { replace: true },
      );
    go("identify");
  }

  function back() {
    switch (stage) {
      case "urge":
        go("identify");
        return;
      case "check":
        resetPlan();
        resetBody();
        clearCheck("urge");
        go("urge");
        return;
      case "body":
        resetPlan();
        resetBody();
        clearCheck("check");
        setCheckStep(CHECK_STEPS.length - 1);
        go("check");
        return;
      case "plan":
        resetPlan();
        go("body");
        return;
      case "try":
        go("plan");
        return;
      case "reflect":
        change("status", "planned");
        go(followMode ? "followup" : "try");
        return;
      case "followup":
        setFollowChoice("");
        return;
      case "summary":
        if (draft.status === "practiced") go("reflect");
        else if (draft.status === "missed") go("followup");
        else go("plan");
        return;
      default:
        return;
    }
  }
  // Once a reflection or missed record is saved, Back must not walk into the
  // plan and re-save the same id as "planned".
  const finalized = saveState === "saved" && draft.status !== "planned";
  const canGoBack =
    stage !== "identify" &&
    saveState !== "saving" &&
    !(stage === "followup" && !followChoice) &&
    !(stage === "summary" && finalized);

  // ── Stage content ──
  let content: ReactNode;

  if (stage === "identify") {
    // Flow copy has not loaded yet at this point (it is fetched per emotion),
    // so this screen uses neutral UI wording.
    content = (
      <>
        {followUpId && followBlocked && (
          <Card>
            <p role="status">
              Checking in on a saved plan needs you to be signed in. You can
              sign in and open the reminder again, or start a new exercise
              below.
            </p>
          </Card>
        )}
        {followUpId && !followBlocked && followStatus === "loading" && (
          <ToolLoading label="Loading your plan…" />
        )}
        {followUpId &&
          (followStatus === "notfound" || followStatus === "error") && (
            <Card>
              <p role="status">
                {followStatus === "notfound"
                  ? "We could not find that plan. It may already have a check-in. You can start a new exercise below."
                  : "Your plan could not load right now. You can try the reminder link again later, or start a new exercise below."}
              </p>
              <button type="button" className={linkButton} onClick={startNew}>
                Start a new exercise
              </button>
            </Card>
          )}
        {!(followUpId && !followBlocked && followStatus === "loading") && (
          <>
            <Card>
              <p>
                Pick one emotion to work with. We will name the urge, check the
                facts, reset your body, and build a step you can try.
              </p>
              <p className={secondaryText}>
                Mixed feelings are welcome. Start with the one whose urge is
                causing the most trouble.
              </p>
            </Card>
            <EmotionPicker
              selectionMode="single"
              selectedIds={ids}
              onChange={(newIds) =>
                setIds(
                  newIds.length > ids.length
                    ? [newIds[newIds.length - 1]]
                    : newIds,
                )
              }
              onContinue={startLoad}
              loading={loading}
              error={
                error ||
                (ids.length > 1
                  ? "Choose one of your check-in emotions to focus on first."
                  : null)
              }
              prompt="Which emotion do you want to work with?"
            />
            {ids.length > 1 && (
              <div className="space-y-2">
                {ids.map((id) => (
                  <button
                    type="button"
                    className={choiceButton}
                    key={id}
                    onClick={() => setIds([id])}
                  >
                    Focus on {getEmotionById(id)?.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </>
    );
  } else if (!flow || !mapping) {
    content = (
      <Card>
        <p role="alert">The exercise content is unavailable.</p>
        <button type="button" className={primaryButton} onClick={startNew}>
          Choose an emotion again
        </button>
      </Card>
    );
  } else if (!mapping.applicable) {
    content = (
      <>
        <Card>
          <h3 className="font-semibold">{c.notApplicableTitle}</h3>
          <p>{mapping.clinicalNote || c.notApplicableFallback}</p>
        </Card>
        {toolLink(mapping.alternativeSkill ?? "")}
        <button type="button" className={choiceButton} onClick={startNew}>
          Choose another emotion
        </button>
      </>
    );
  } else if (stage === "urge") {
    const chosen = !!draft.urgeId;
    const selectUrge = (id: string) => {
      if (id === draft.urgeId) return;
      patch({
        urgeId: id,
        customUrge: "",
        urgeBefore: null,
        facts: "",
        effectiveness: "",
      });
      setCheckStep(0);
      // The pick made here, in this visit. "My urge is different" is free text: no id, never the text.
      toolSession.setUrgeIds(id === "custom" ? [] : [id]);
      clearCheck("urge");
    };
    content = (
      <>
        <p>{protocol?.acknowledgment || c.intro}</p>
        {!user && !authLoading && c.signedOutNote && (
          <p className={secondaryText}>{c.signedOutNote}</p>
        )}
        <h3 className="font-semibold">{c.urge}</h3>
        <div className="space-y-2" role="group" aria-label={c.urge}>
          {protocol?.urges.map((u) => (
            <button
              type="button"
              key={u.id}
              className={`${choiceButton} ${draft.urgeId === u.id ? choiceSelected : ""}`}
              aria-pressed={draft.urgeId === u.id}
              onClick={() => selectUrge(u.id)}
            >
              {draft.urgeId === u.id && <span aria-hidden="true">✓ </span>}
              {u.label}
            </button>
          ))}
          <button
            type="button"
            className={`${choiceButton} ${draft.urgeId === "custom" ? choiceSelected : ""}`}
            aria-pressed={draft.urgeId === "custom"}
            onClick={() => selectUrge("custom")}
          >
            {draft.urgeId === "custom" && <span aria-hidden="true">✓ </span>}
            {c.urgeCustom}
          </button>
        </div>
        {draft.urgeId === "custom" && (
          <Field
            label={c.urgeCustomPrompt}
            value={draft.customUrge}
            rows={2}
            onChange={(v) => change("customUrge", v)}
          />
        )}
        {chosen && (
          <div className={`space-y-4 ${enterAnimation}`}>
            {unblend && <p role="status" className={secondaryText}>{unblend}</p>}
            <UrgeScale
              label={fill(c.urgeStrength, { urge: urgeText })}
              hint={c.urgeStrengthHint}
              value={draft.urgeBefore}
              onChange={(v) => change("urgeBefore", v)}
              {...anchors}
            />
            <details className="p-4 rounded-xl border border-[var(--color-border)]">
              <summary className="cursor-pointer min-h-11 flex items-center">
                {c.feelingOptional}
              </summary>
              <div className="pt-3">
                <UrgeScale
                  label={fill(c.feelingNow, { emotion: emotionLower })}
                  value={draft.intensityBefore}
                  allowClear
                  onChange={(v) => change("intensityBefore", v)}
                  {...anchors}
                />
              </div>
            </details>
          </div>
        )}
        <button
          type="button"
          className={primaryButton}
          disabled={!urgeLabel.trim() || draft.urgeBefore === null}
          onClick={() => {
            setCheckStep(0);
            go("check");
          }}
        >
          Continue
        </button>
      </>
    );
  } else if (stage === "check") {
    const previous =
      checkStep > 0
        ? () => {
            clearCheck("check");
            setCheckStep((n) => n - 1);
          }
        : undefined;
    const recheck = () => {
      patch({ safety: "", facts: "", effectiveness: "" });
      clearCheck("check");
      setCheckStep(0);
    };
    const route = oppositeActionRoute(
      flow,
      draft.safety,
      draft.facts,
      draft.effectiveness,
    );
    let card: ReactNode;
    if (checkStep === 0) {
      card = (
        <TapCard
          key="goal"
          index={0}
          total={CHECK_STEPS.length}
          question={c.goalQuestion}
          options={choices.goal}
          value={draft.goal}
          onSelect={(id) => {
            change("goal", id);
            setCheckStep(1);
          }}
        />
      );
    } else if (checkStep === SAFETY_STEP) {
      const blocked = !!draft.safety && draft.safety !== "safe";
      card = (
        <TapCard
          key="safety"
          index={1}
          total={CHECK_STEPS.length}
          question={c.safety}
          options={choices.safety}
          value={draft.safety}
          onPrevious={previous}
          onSelect={(id) => {
            patch({ safety: id, facts: "", effectiveness: "" });
            if (id === "safe") {
              clearCheck("check");
              setCheckStep(2);
            } else recordCheck(id, "", "", "support");
          }}
          after={
            blocked && (
              <div className={`space-y-3 ${enterAnimation}`} role="alert">
                <p>{c.support}</p>
                {toolLink("pause")}
              </div>
            )
          }
        />
      );
    } else if (checkStep === 2) {
      const valuesCheck =
        draft.parentId === "guilt" || draft.parentId === "shame"
          ? c[`${draft.parentId}Check`]
          : "";
      card = (
        <TapCard
          key="facts"
          index={2}
          total={CHECK_STEPS.length}
          question={c.factsQuestion}
          options={choices.facts}
          value={draft.facts}
          onPrevious={previous}
          onSelect={(id) => {
            patch({ facts: id, effectiveness: "" });
            setCheckStep(3);
          }}
          before={
            valuesCheck ? (
              <p className="p-3 rounded-xl border border-[var(--color-border)]">
                {valuesCheck}
              </p>
            ) : null
          }
          after={
            <details className="p-4 rounded-xl border border-[var(--color-border)]">
              <summary className="cursor-pointer min-h-11 flex items-center">
                {c.factsDetailToggle}
              </summary>
              <div className="space-y-4 pt-3">
                <p className={secondaryText}>{c.facts}</p>
                {!!protocol?.fitsTheFactsWhen.length && (
                  <div>
                    <p className="text-sm font-medium mb-2">
                      {c.factsFitsHeading}
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                      {protocol.fitsTheFactsWhen.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Field
                  label={c.factsObserve}
                  placeholder={c.factsObservePlaceholder}
                  value={draft.observation}
                  onChange={(v) => change("observation", v)}
                />
                <Field
                  label={c.factsMeaning}
                  value={draft.interpretation}
                  onChange={(v) => change("interpretation", v)}
                />
                {/* The long form (docs/design/check-the-facts.md, *Where it starts*): this step itself is unchanged. */}
                <CheckFactsEntryLink emotionId={draft.emotionId || undefined} />
              </div>
            </details>
          }
        />
      );
    } else if (checkStep === EFFECTIVENESS_STEP) {
      card = (
        <TapCard
          key="effectiveness"
          index={3}
          total={CHECK_STEPS.length}
          question={c.effectiveness}
          options={choices.effectiveness}
          value={draft.effectiveness}
          onPrevious={previous}
          describedBy={goalLine ? OA_GOAL_LINE_ID : undefined}
          before={
            goalLine && <GoalLine id={OA_GOAL_LINE_ID} lines={goalLine} />
          }
          onSelect={(id) => {
            change("effectiveness", id);
            const next = oppositeActionRoute(flow, draft.safety, draft.facts, id);
            recordCheck(draft.safety, draft.facts, id, next);
            if (next === "opposite") {
              resetBody();
              go("body");
            } else setCheckStep(CHECK_RESULT);
          }}
        />
      );
    } else {
      card = (
        <div className={`space-y-3 ${enterAnimation}`} key="result">
          <Card>
            <h3 className="font-semibold text-lg">{c[ROUTE_HEADING[route]]}</h3>
            <p>{c[route]}</p>
            {route === "problem" && draft.facts === "fits" && (
              <p>{protocol?.fitsFactsGuidance}</p>
            )}
          </Card>
          {route === "problem" && toolLink("problem-solve")}
          {route === "opposite" ? (
            <button
              type="button"
              className={primaryButton}
              onClick={() => {
                resetBody();
                go("body");
              }}
            >
              Continue
            </button>
          ) : (
            <button type="button" className={choiceButton} onClick={recheck}>
              Recheck
            </button>
          )}
          {(route === "clarify" || route === "support") && toolLink("pause")}
          <button
            type="button"
            className={linkButton}
            onClick={() => {
              clearCheck("check");
              setCheckStep(CHECK_STEPS.length - 1);
            }}
          >
            ← Previous
          </button>
        </div>
      );
    }
    content = (
      <>
        <p className={secondaryText}>{c.checkIntro}</p>
        {card}
      </>
    );
  } else if (stage === "body") {
    const urgeCues = (urge?.somaticCues ?? []).map((s) => s.trim()).filter(Boolean);
    const cueSource =
      urge?.somaticReplace && urgeCues.length
        ? urgeCues
        : [...urgeCues, ...(protocol?.somaticCues ?? [])];
    const cues = Array.from(
      new Set(cueSource.map((s) => s.trim()).filter(Boolean)),
    ).slice(0, 3);
    const pickEscape = () => {
      const usable = (id: string) =>
        getMicroStepsForPattern(id).filter((s) => !s.requiresEnvironment);
      const pool = usable(patternId).length ? usable(patternId) : usable("fallback");
      // Avoid offering "the same thing again" (e.g. two cues about the feet).
      const taken = new Set(cues.flatMap(cueWords));
      const distinct = pool.filter(
        (s) => !cueWords(`${s.text} ${s.subtext ?? ""}`).some((w) => taken.has(w)),
      );
      const base = distinct.length ? distinct : pool;
      const others = base.filter((s) => s.id !== escapeStep?.id);
      const from = others.length ? others : base;
      setEscapeStep(from[Math.floor(Math.random() * from.length)] ?? null);
    };
    const markDone = (text: string) =>
      setDraft((s) =>
        s.bodyCues.includes(text)
          ? s
          : { ...s, bodyCues: [...s.bodyCues, text].slice(0, 6) },
      );
    const needsBaseline = draft.urgeBefore === null;
    const escaped = escapeStep !== null || cues.length === 0;
    const anyDone = draft.bodyCues.length > 0;
    content = (
      <>
        {needsBaseline ? (
          <UrgeScale
            label={fill(c.urgeStrength, { urge: urgeText })}
            hint={c.urgeStrengthHint}
            value={draft.urgeBefore}
            onChange={(v) => change("urgeBefore", v)}
            {...anchors}
          />
        ) : (
          <>
            <p>{c.bodyIntro}</p>
            {!escaped ? (
              <div className="space-y-3">
                {cues.map((cue) => (
                  <HoldToConfirm
                    key={cue}
                    text={cue}
                    done={draft.bodyCues.includes(cue)}
                    onComplete={() => markDone(cue)}
                    {...holdCopy}
                  />
                ))}
                {!anyDone && (
                  <button type="button" className={linkButton} onClick={pickEscape}>
                    {c.bodyEscape}
                  </button>
                )}
              </div>
            ) : (
              <div className={`space-y-3 ${enterAnimation}`}>
                <p>{c.bodyEscapeIntro}</p>
                {escapeStep ? (
                  <HoldToConfirm
                    key={escapeStep.id}
                    text={escapeStep.text}
                    subtext={escapeStep.subtext}
                    done={draft.bodyCues.includes(escapeStep.text)}
                    onComplete={() => markDone(escapeStep.text)}
                    {...holdCopy}
                  />
                ) : (
                  <button type="button" className={choiceButton} onClick={pickEscape}>
                    {c.bodyEscapeShow}
                  </button>
                )}
                <div className="flex flex-wrap gap-x-4">
                  {escapeStep && !draft.bodyCues.includes(escapeStep.text) && (
                    <button type="button" className={linkButton} onClick={pickEscape}>
                      {c.bodyEscapeAnother}
                    </button>
                  )}
                  {cues.length > 0 && (
                    <button
                      type="button"
                      className={linkButton}
                      onClick={() => setEscapeStep(null)}
                    >
                      {c.bodyEscapeBack}
                    </button>
                  )}
                </div>
              </div>
            )}
            {anyDone && (
              <div className={`space-y-4 ${enterAnimation}`}>
                <UrgeScale
                  label={fill(c.bodyRerate, { urge: urgeText })}
                  value={draft.urgeAfterBody}
                  onChange={(v) => change("urgeAfterBody", v)}
                  {...anchors}
                />
                <p className={secondaryText}>{c.bodyNotice}</p>
                <button
                  type="button"
                  className={primaryButton}
                  disabled={draft.urgeAfterBody === null}
                  onClick={() => {
                    let hasStep = !!draft.action.trim();
                    if (
                      !hasStep &&
                      examples?.small &&
                      capacityDefaultSize(
                        draft.urgeAfterBody ?? draft.urgeBefore ?? 0,
                      ) === "small"
                    ) {
                      patch({ actionSize: "small", action: examples.small });
                      setCustomAction(false);
                      hasStep = true;
                    }
                    setStepOpen(!hasStep);
                    go("plan");
                  }}
                >
                  Continue
                </button>
              </div>
            )}
          </>
        )}
      </>
    );
  } else if (stage === "plan") {
    const lowCapacity =
      capacityDefaultSize(draft.urgeAfterBody ?? draft.urgeBefore ?? 0) ===
      "small";
    const sizeLabel = (size: string) =>
      size in SIZE_COPY ? c[SIZE_COPY[size as Size]] : c.stepOwn;
    const sizeButton = (size: Size) =>
      examples?.[size] ? (
        <button
          type="button"
          key={size}
          className={`${choiceButton} ${draft.actionSize === size && !customAction ? choiceSelected : ""}`}
          aria-pressed={draft.actionSize === size && !customAction}
          onClick={() => {
            setCustomAction(false);
            setStepOpen(false);
            patch({ actionSize: size, action: examples[size] });
          }}
        >
          <span className="block text-xs uppercase tracking-wide opacity-80">
            {sizeLabel(size)}
          </span>
          <span className="block mt-1">{examples[size]}</span>
        </button>
      ) : null;
    const hasStep = !!draft.action.trim();
    const windows = (choices.dueWindow ?? []).filter(
      (o) =>
        !(o.id === "afternoon" && cueHour >= 15) &&
        !(o.id === "evening" && cueHour >= 19),
    );
    const snag = !!draft.barrier && draft.barrier !== "none";
    const ready =
      hasStep &&
      !!draft.cueId &&
      (draft.cueId !== "today" || windows.some((o) => o.id === dueWindow));
    const changeStep = () => {
      setStepOpen(true);
      setCustomAction(false);
      if (customAction) patch({ actionSize: "", action: "" });
    };
    let stepPicker: ReactNode;
    if (customAction) {
      stepPicker = (
        <div className="space-y-2">
          <Field
            label={c.stepOwnPrompt}
            value={draft.action}
            rows={2}
            onChange={(v) => change("action", v)}
          />
          <button type="button" className={linkButton} onClick={changeStep}>
            Change
          </button>
        </div>
      );
    } else if (!stepOpen && hasStep) {
      stepPicker = (
        <div className={`space-y-1 ${enterAnimation}`}>
          <div className={`${choiceButton} ${choiceSelected}`} aria-live="polite">
            <span className="block text-xs uppercase tracking-wide opacity-80">
              <span aria-hidden="true">✓ </span>
              {sizeLabel(draft.actionSize)}
            </span>
            <span className="block mt-1">{draft.action}</span>
          </div>
          <button type="button" className={linkButton} onClick={changeStep}>
            Change
          </button>
        </div>
      );
    } else {
      stepPicker = (
        <div className="space-y-2">
          {sizeButton("small")}
          {sizeButton("medium")}
          {lowCapacity && examples?.bigger ? (
            <details className="rounded-xl border border-[var(--color-border)] p-3">
              <summary className="cursor-pointer min-h-11 flex items-center">
                {c.stepMore}
              </summary>
              <div className="pt-2">{sizeButton("bigger")}</div>
            </details>
          ) : (
            sizeButton("bigger")
          )}
          <button
            type="button"
            className={choiceButton}
            onClick={() => {
              setCustomAction(true);
              setStepOpen(false);
              patch({ actionSize: "custom", action: "" });
            }}
          >
            {c.stepOwn}
          </button>
        </div>
      );
    }
    content = (
      <>
        <p>{c.stepIntro}</p>
        {lowCapacity && (
          <p className={`p-3 rounded-xl border border-[var(--color-border)] ${secondaryText}`}>
            {c.stepCapacity}
          </p>
        )}
        {draft.urgeId === "custom" && (
          <p className={secondaryText}>{c.customAction}</p>
        )}
        {stepPicker}
        {hasStep && (!stepOpen || customAction) && (
          <div className={`space-y-2 ${enterAnimation}`}>
            <h3 className="font-semibold">{c.whenQuestion}</h3>
            <ChoiceList
              options={choices.cue}
              value={draft.cueId}
              label={c.whenQuestion}
              onSelect={(id, o) => {
                const hour = new Date().getHours();
                setCueHour(hour);
                const windowOk =
                  !!dueWindow &&
                  !(dueWindow === "afternoon" && hour >= 15) &&
                  !(dueWindow === "evening" && hour >= 19);
                if (!windowOk) setDueWindow("");
                const dueAt =
                  id === "next_time"
                    ? dueAtForNextTime().toISOString()
                    : id === "today" && windowOk
                      ? dueAtFor(dueWindow as DueWindow).toISOString()
                      : "";
                patch({ cueId: id, cue: o.label, dueAt });
              }}
            />
          </div>
        )}
        {hasStep && draft.cueId === "today" && (
          <div className={`space-y-2 ${enterAnimation}`}>
            <h3 className="font-semibold">{c.dueQuestion}</h3>
            <ChoiceList
              options={windows}
              value={dueWindow}
              label={c.dueQuestion}
              onSelect={(id) => {
                setDueWindow(id);
                change("dueAt", dueAtFor(id as DueWindow).toISOString());
              }}
            />
          </div>
        )}
        {ready && (
          <div className={`space-y-4 ${enterAnimation}`}>
            {protocol?.bodyOpposite && (
              <Card>
                <p className="text-xs uppercase tracking-wide text-[var(--color-accent)]">
                  {c.stepBodyLine}
                </p>
                <p>{protocol.bodyOpposite}</p>
              </Card>
            )}
            <details className="p-4 rounded-xl border border-[var(--color-border)]">
              <summary className="cursor-pointer min-h-11 flex items-center">
                {c.snagToggle}
              </summary>
              <div className="space-y-3 pt-3">
                <ChoiceList
                  options={choices.barrier}
                  value={draft.barrier}
                  label={c.snagToggle}
                  onSelect={(id) =>
                    patch({ barrier: draft.barrier === id ? "" : id, backup: "" })
                  }
                />
                {snag && (
                  <Field
                    label={c.backupLabel}
                    value={draft.backup}
                    rows={2}
                    onChange={(v) => change("backup", v)}
                  />
                )}
              </div>
            </details>
            <button
              type="button"
              className={primaryButton}
              onClick={() => {
                if (draft.cueId === "now") go("try");
                else {
                  change("status", "planned");
                  go("summary");
                }
              }}
            >
              {draft.cueId === "now" ? "Try it now" : "Make my plan"}
            </button>
          </div>
        )}
      </>
    );
  } else if (stage === "try") {
    content = (
      <>
        <Card>
          <h3 className="text-xl font-semibold">{draft.action}</h3>
          {draft.bodyCues.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-accent)]">
                {c.tryBody}
              </p>
              <ul className="list-disc pl-5">
                {draft.bodyCues.map((cue) => (
                  <li key={cue}>{cue}</li>
                ))}
              </ul>
            </div>
          )}
          {draft.backup && (
            <p>
              <strong>{c.tryStuck}</strong> {draft.backup}
            </p>
          )}
        </Card>
        <p>{c.tryNow}</p>
        <button type="button" className={primaryButton} onClick={() => go("reflect")}>
          {c.tryDone}
        </button>
        <button
          type="button"
          className={choiceButton}
          onClick={() => {
            patch({ cueId: "", cue: "", dueAt: "" });
            setDueWindow("");
            go("plan");
          }}
        >
          {c.tryLater}
        </button>
      </>
    );
  } else if (stage === "reflect") {
    content = (
      <>
        <UrgeScale
          label={fill(c.reflectUrge, { urge: urgeText })}
          value={draft.urgeAfter}
          onChange={(v) => change("urgeAfter", v)}
          {...anchors}
        />
        {draft.intensityBefore !== null && (
          <details className="p-4 rounded-xl border border-[var(--color-border)]">
            <summary className="cursor-pointer min-h-11 flex items-center">
              {c.reflectFeeling}
            </summary>
            <div className="pt-3">
              <UrgeScale
                label={fill(c.feelingAfter, { emotion: emotionLower })}
                value={draft.intensityAfter}
                allowClear
                onChange={(v) => change("intensityAfter", v)}
                {...anchors}
              />
            </div>
          </details>
        )}
        <h3 className="font-semibold">{c.outcomeQuestion}</h3>
        <ChoiceList
          options={choices.outcome}
          value={draft.outcome}
          label={c.outcomeQuestion}
          onSelect={(id) => change("outcome", id)}
        />
        {draft.outcome === "unsafe" && (
          <Card>
            <p role="alert">{c.readoutUnsafe}</p>
            {toolLink("pause")}
          </Card>
        )}
        <details className="p-4 rounded-xl border border-[var(--color-border)]">
          <summary className="cursor-pointer min-h-11 flex items-center">
            {c.noteToggle}
          </summary>
          <div className="pt-3">
            <Field
              label={c.noteLabel}
              value={draft.reflection}
              onChange={(v) => change("reflection", v)}
            />
          </div>
        </details>
        <button
          type="button"
          className={primaryButton}
          disabled={draft.urgeAfter === null || !draft.outcome}
          onClick={() => {
            patch({ status: "practiced", missedReason: "" });
            go("summary");
          }}
        >
          See my readout
        </button>
      </>
    );
  } else if (stage === "followup") {
    const missedKey = MISSED_COPY[draft.missedReason];
    const missedSaved = missedRecorded && draft.status === "missed";
    const saveMissed = async (d: Draft = draft): Promise<boolean> => {
      const ok = await save(d);
      if (ok) setMissedRecorded(true);
      return !!ok;
    };
    /**
     * "Keep the plan": a new planned session may carry the earlier answers
     * forward because nothing is practiced now; the future check-in only
     * reflects on what happened. Awaits its own save; the reminder downloads
     * only after the plan exists.
     */
    const keepPlan = async (withReminder: boolean) => {
      const next: Draft = {
        ...draft,
        id: crypto.randomUUID(),
        status: "planned",
        outcome: "",
        missedReason: "",
        reflection: "",
        urgeAfter: null,
        intensityAfter: null,
        cueId: "next_time",
        cue: choices.cue?.find((o) => o.id === "next_time")?.label ?? draft.cue,
        dueAt: dueAtForNextTime().toISOString(),
      };
      setDraft(next);
      setFollowMode(false);
      setSaveState("idle");
      go("summary");
      const saved = await save(next);
      if (saved && withReminder) calendarReminder(saved);
    };
    content = (
      <>
        <Card>
          <p className={secondaryText}>{c.followUpCardDue}</p>
          <h3 className="text-lg font-semibold">{draft.action}</h3>
          <p className={secondaryText}>
            {emotion} → {urgeLabel}
          </p>
        </Card>
        <h3 className="font-semibold">{c.followUpQuestion}</h3>
        <ChoiceList
          options={choices.followUp}
          value={followChoice}
          label={c.followUpQuestion}
          onSelect={(id) => {
            setFollowChoice(id);
            if (id === "did" || id === "partly") {
              patch({
                status: "planned",
                missedReason: "",
                urgeAfter: null,
                intensityAfter: null,
                outcome: id === "partly" ? "partial" : "",
              });
              go("reflect");
            } else {
              patch({ missedReason: "", status: "planned" });
            }
          }}
        />
        {followChoice === "not_yet" && (
          <div className={`space-y-3 ${enterAnimation}`}>
            <h3 className="font-semibold">{c.missedQuestion}</h3>
            <ChoiceList
              options={choices.missedReason}
              value={draft.missedReason}
              label={c.missedQuestion}
              onSelect={(id) => {
                const next: Draft = {
                  ...draft,
                  status: "missed",
                  missedReason: id,
                  outcome: "",
                  urgeAfter: null,
                  intensityAfter: null,
                };
                setDraft(next);
                setNoteOpen(false);
                setNoteSaved(false);
                setMissedRecorded(false);
                void saveMissed(next);
              }}
            />
            {saveState === "saving" && (
              <p role="status" className={secondaryText}>
                Saving…
              </p>
            )}
            {saveState === "error" && (
              <p role="alert">
                Saving did not succeed. Your answer is still here.{" "}
                <button type="button" className={linkButton} onClick={() => void saveMissed()}>
                  Retry saving
                </button>
              </p>
            )}
            {missedKey && missedSaved && (
              <Card className={enterAnimation}>
                <p>{c[missedKey]}</p>
                {draft.missedReason === "too_strong" && examples?.small && (
                  <>
                    <p className={secondaryText}>{examples.small}</p>
                    <button
                      type="button"
                      className={primaryButton}
                      onClick={() =>
                        restartFromSafety({
                          urgeBefore: null,
                          intensityBefore: null,
                          actionSize: "small",
                          action: examples.small,
                          barrier: "",
                          backup: "",
                        })
                      }
                    >
                      {c.missedTrySmall}
                    </button>
                  </>
                )}
                {draft.missedReason === "no_moment" && (
                  <button
                    type="button"
                    className={primaryButton}
                    onClick={() => void keepPlan(false)}
                  >
                    {c.missedKeepPlan}
                  </button>
                )}
                {draft.missedReason === "forgot" && (
                  <>
                    <button
                      type="button"
                      className={primaryButton}
                      onClick={() => void keepPlan(true)}
                    >
                      {c.missedReminder}
                    </button>
                    <p className={secondaryText}>{c.followUpCalendarNote}</p>
                  </>
                )}
                {draft.missedReason === "chose_not" &&
                  (noteOpen ? (
                    <>
                      <Field
                        label={c.missedNoteLabel}
                        value={draft.reflection}
                        onChange={(v) => {
                          change("reflection", v);
                          setNoteSaved(false);
                        }}
                      />
                      <button
                        type="button"
                        className={choiceButton}
                        disabled={!draft.reflection.trim() || (saveState === "saved" && noteSaved)}
                        onClick={async () => {
                          if (await saveMissed()) setNoteSaved(true);
                        }}
                      >
                        {saveState === "saved" && noteSaved ? "✓" : c.missedNoteSave}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={linkButton}
                      onClick={() => setNoteOpen(true)}
                    >
                      {c.missedNoteToggle}
                    </button>
                  ))}
              </Card>
            )}
            {missedKey && missedSaved && (
              <button type="button" className={choiceButton} onClick={startNew}>
                Start a new exercise
              </button>
            )}
          </div>
        )}
      </>
    );
  } else {
    const practiced = draft.status === "practiced";
    const readout = urgeReadout(
      draft.urgeBefore ?? 0,
      draft.urgeAfterBody,
      practiced ? draft.urgeAfter : null,
      practiced ? draft.outcome : "",
    );
    const unsafe = practiced && draft.outcome === "unsafe";
    const drop = readout.to === null ? 0 : readout.drop;
    const bigBars = readout.to !== null && drop >= 2;
    const showEmotion =
      practiced &&
      !unsafe &&
      draft.intensityBefore !== null &&
      draft.intensityAfter !== null;
    const bars = (size: "large" | "compact") => (
      <UrgeBars
        size={size}
        pullLabel={fill(c.readoutPullTo, { urge: urgeText })}
        from={readout.from}
        to={readout.to}
        fromLabel={c.readoutBefore}
        toLabel={practiced ? c.readoutAfterTry : c.readoutAfterBody}
      />
    );
    const acted = fill(c.readoutActed, { level: draft.urgeBefore ?? 0 });
    const plannedText =
      drop > 0
        ? fill(c.readoutPlanned, {
            from: draft.urgeBefore ?? 0,
            to: draft.urgeAfterBody ?? 0,
            urge: urgeText,
          })
        : c.readoutPlannedSame;
    let readoutBody: ReactNode;
    if (unsafe) {
      readoutBody = <p role="alert" className="text-lg font-semibold">{c.readoutUnsafe}</p>;
    } else if (practiced) {
      readoutBody = bigBars ? (
        <>
          {bars("large")}
          <p>{fill(c[readout.key], { urge: urgeText })}</p>
          <p className="font-medium">{acted}</p>
        </>
      ) : (
        <>
          <p className="text-xl font-semibold leading-snug">{acted}</p>
          <p>{fill(c[readout.key], { urge: urgeText })}</p>
          {readout.to !== null && bars("compact")}
        </>
      );
    } else {
      readoutBody = bigBars ? (
        <>
          {bars("large")}
          <p>{plannedText}</p>
        </>
      ) : (
        <>
          <p className="text-xl font-semibold leading-snug">{plannedText}</p>
          {readout.to !== null && bars("compact")}
        </>
      );
    }
    const saveLabel =
      saveState === "saving"
        ? "Saving…"
        : saveState === "saved"
          ? "Saved to your account"
          : saveState === "error"
            ? "Retry saving"
            : later || !practiced
              ? c.followUpSave
              : c.saveReflection;
    content = (
      <>
        <Card className={enterAnimation}>
          {readoutBody}
          {showEmotion && (
            <p className={secondaryText}>
              {emotion}: {draft.intensityBefore} → {draft.intensityAfter}.{" "}
              {c.readoutEmotionLag}
            </p>
          )}
        </Card>
        {unsafe && toolLink("pause")}
        {practiced && !unsafe && readout.key === "readoutUrgeHigher" && (
          <div className="space-y-2">
            <p className={secondaryText}>{c.readoutHigherTools}</p>
            {toolLink("cool-down")}
            {toolLink("urge-surfing")}
          </div>
        )}
        <Card>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs uppercase tracking-wide">Emotion → urge</dt>
              <dd>
                {emotion} → {urgeLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">Step</dt>
              <dd>{draft.action}</dd>
            </div>
            {draft.cue && (
              <div>
                <dt className="text-xs uppercase tracking-wide">When</dt>
                <dd>
                  {draft.cue}
                  {later && draft.dueAt && (
                    <span className={secondaryText}>
                      {" "}
                      · check-in {formatDue(draft.dueAt)}
                    </span>
                  )}
                </dd>
              </div>
            )}
            {draft.backup && (
              <div>
                <dt className="text-xs uppercase tracking-wide">Backup</dt>
                <dd>{draft.backup}</dd>
              </div>
            )}
            {draft.reflection && practiced && (
              <div>
                <dt className="text-xs uppercase tracking-wide">Your note</dt>
                <dd className="whitespace-pre-wrap">{draft.reflection}</dd>
              </div>
            )}
          </dl>
        </Card>
        <p className={secondaryText}>{c.privacy}</p>
        {user ? (
          <>
            <button
              type="button"
              className={primaryButton}
              disabled={saveState === "saving" || saveState === "saved"}
              onClick={() => void save()}
            >
              {saveLabel}
            </button>
            {saveState === "error" && (
              <p role="alert">
                Saving did not succeed. Your answers are still here; you can
                retry.
              </p>
            )}
            {later && saveState === "saved" && (
              <div className={`space-y-2 ${enterAnimation}`}>
                <p>{c.followUpOffer}</p>
                <button
                  type="button"
                  className={choiceButton}
                  onClick={() => calendarReminder(draft)}
                >
                  {c.followUpCalendar}
                </button>
                <p className={secondaryText}>{c.followUpCalendarNote}</p>
              </div>
            )}
            {saveState === "saved" && draft.urgeId && draft.urgeId !== "custom" && (
              <UrgeTrend urgeId={draft.urgeId} currentSessionId={draft.id} />
            )}
          </>
        ) : (
          <>
            <p className="text-sm">{c.signedOutSave}</p>
            {later && draft.dueAt && (
              <div className="space-y-2">
                <button
                  type="button"
                  className={choiceButton}
                  onClick={() => calendarReminder(draft)}
                >
                  {c.followUpCalendar}
                </button>
                <p className={secondaryText}>{c.followUpCalendarNote}</p>
              </div>
            )}
          </>
        )}
        {practiced && !unsafe && (
          <button
            type="button"
            className={choiceButton}
            onClick={() =>
              restartFromSafety({
                urgeBefore: draft.urgeAfter ?? draft.urgeAfterBody ?? draft.urgeBefore,
                intensityBefore: draft.intensityAfter ?? draft.intensityBefore,
              })
            }
          >
            Practice again
          </button>
        )}
        <button type="button" className={choiceButton} onClick={startNew}>
          Start a new exercise
        </button>
      </>
    );
  }

  return (
    <section className="space-y-5 text-[var(--color-text-primary)]">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="min-h-11 px-2 text-sm disabled:invisible"
          disabled={!canGoBack}
          onClick={back}
        >
          ← Back
        </button>
        <ProgressDots stage={stage} />
      </div>
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-xl font-semibold outline-none"
      >
        {TITLES[stage]}
      </h2>
      <fieldset disabled={saveState === "saving"} className="min-w-0 space-y-5">
        {content}
      </fieldset>
    </section>
  );
}
