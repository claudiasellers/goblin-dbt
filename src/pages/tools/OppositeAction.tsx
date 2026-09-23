import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { getEmotionById, getEmotionByName } from "../../data/emotions";
import { getToolById } from "../../data/tools";
import { EmotionPicker } from "../../components/tools/EmotionPicker";
import { useAuth } from "../../contexts/AuthContext";
import {
  getOppositeActionContent,
  saveOppositeActionSession,
  type OppositeActionContent,
} from "../../services/neo4j";
import type {
  OppositeActionFlow,
  OppositeActionSession,
} from "../../data/oppositeActionTypes";
import { oppositeActionRoute, reflectionKey } from "../../lib/oppositeAction";

type Stage =
  | "identify"
  | "context"
  | "urge"
  | "facts"
  | "decision"
  | "action"
  | "plan"
  | "practice"
  | "reflect"
  | "summary";
const stages: Stage[] = [
  "identify",
  "context",
  "urge",
  "facts",
  "decision",
  "action",
  "plan",
  "practice",
  "reflect",
  "summary",
];
const names = [
  "Name it",
  "Your situation",
  "The urge",
  "Check facts",
  "Choose a response",
  "Your opposite",
  "Make a plan",
  "Try it",
  "Reflect",
  "Your takeaway",
];
const button =
  "min-h-11 w-full p-3 rounded-xl border border-[var(--color-border)] text-left text-[var(--color-text-primary)] lift-secondary disabled:opacity-50";
const primary =
  "min-h-12 w-full p-3 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary disabled:opacity-50";
const input =
  "w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-accent)]";

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] space-y-3">
      {children}
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        maxLength={1500}
        rows={3}
        className={input}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-3">
      <span className="flex justify-between gap-3">
        <span>{label}</span>
        <strong>{value}/10</strong>
      </span>
      <input
        className="w-full accent-[var(--color-accent)]"
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="flex justify-between text-xs text-[var(--color-text-secondary)]">
        <span>Not present</span>
        <span>Very intense</span>
      </span>
    </label>
  );
}
const blank = (): OppositeActionSession => ({
  id: crypto.randomUUID(),
  schemaVersion: 1,
  contentVersion: "",
  emotionId: "",
  parentId: "",
  urgeId: "",
  customUrge: "",
  situation: "",
  observation: "",
  interpretation: "",
  goal: "",
  safety: "",
  facts: "",
  effectiveness: "",
  intensityBefore: 5,
  intensityAfter: null,
  actionSize: "",
  action: "",
  cue: "",
  barrier: "",
  backup: "",
  bodyPractice: false,
  willingness: "",
  status: "planned",
  outcome: "",
  reflection: "",
  sourceIds: [],
});

export function OppositeAction() {
  const location = useLocation();
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("identify");
  const [ids, setIds] = useState<string[]>(() => {
    const raw = (location.state as { checkinEmotions?: string[] } | null)
      ?.checkinEmotions;
    return (raw ?? [])
      .map((n) => getEmotionById(n)?.id ?? getEmotionByName(n)?.id)
      .filter((id): id is string => !!id);
  });
  const [data, setData] = useState<OppositeActionContent | null>(null);
  const [session, setSession] = useState(blank);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [customAction, setCustomAction] = useState(false);
  const [customCue, setCustomCue] = useState("");
  const [after, setAfter] = useState(5);
  const requestId = useRef(0);
  const saveLock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [stage]);
  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  const flow: OppositeActionFlow | undefined = data?.flow;
  const c = flow?.copy ?? {};
  const mapping = data?.emotions.find((e) => e.emotionId === session.emotionId);
  const protocol = data?.parents[session.parentId];
  const urge = protocol?.urges.find((u) => u.id === session.urgeId);
  const urgeLabel =
    session.urgeId === "custom" ? session.customUrge : (urge?.label ?? "");
  const emotion = getEmotionById(session.emotionId)?.name ?? "";
  const route = flow
    ? oppositeActionRoute(
        flow,
        session.safety,
        session.facts,
        session.effectiveness,
      )
    : "clarify";
  const goalLabel =
    flow?.choices.goal.find((o) => o.id === session.goal)?.label ?? "";
  const cueLabel =
    session.cue === "custom"
      ? customCue
      : (flow?.choices.cue.find((o) => o.id === session.cue)?.label ?? "");
  const change = <K extends keyof OppositeActionSession>(
    key: K,
    value: OppositeActionSession[K],
  ) => {
    setSession((s) => ({ ...s, [key]: value }));
    setSaveState("idle");
  };
  const go = (next: Stage) => {
    if (next === "facts" || next === "action") resetPlan();
    setError("");
    setStage(next);
  };
  const resetPlan = () => {
    setSession((s) => ({
      ...s,
      action: "",
      actionSize: "",
      cue: "",
      barrier: "",
      backup: "",
      bodyPractice: false,
      willingness: "",
      status: "planned",
      outcome: "",
      reflection: "",
      intensityAfter: null,
    }));
    setCustomAction(false);
    setCustomCue("");
    setSaveState("idle");
  };
  const choices = (
    group: string,
    value: string,
    select: (id: string) => void,
  ) => (
    <div className="space-y-2">
      {flow?.choices[group]?.map((o) => (
        <button
          type="button"
          key={o.id}
          aria-pressed={value === o.id}
          onClick={() => select(o.id)}
          className={`${button} ${value === o.id ? "border-[var(--color-accent)] bg-[var(--color-bg-elevated)] ring-1 ring-[var(--color-accent)]" : ""}`}
        >
          <span className="font-medium">{o.label}</span>
          {o.detail && <span className="block text-sm mt-1">{o.detail}</span>}
        </button>
      ))}
    </div>
  );
  const next = (target: Stage, enabled = true, label = "Continue") => (
    <button
      type="button"
      className={primary}
      disabled={!enabled}
      onClick={() => go(target)}
    >
      {label}
    </button>
  );
  const toolLink = (id: string, label?: string) => {
    const normalized = id.replace(/^dbt_/, "").replace(/_/g, "-");
    const tool = getToolById(normalized);
    return tool ? (
      <Link
        className={`${button} block`}
        to={`/tool/${normalized}`}
        state={{ checkinEmotions: [session.emotionId] }}
      >
        {label ?? `Open ${tool.name}`} →
      </Link>
    ) : (
      <Link className={`${button} block`} to="/tools">
        Explore other tools →
      </Link>
    );
  };

  async function load() {
    if (ids.length !== 1) return;
    const ticket = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const result = await getOppositeActionContent(ids);
      if (ticket !== requestId.current) return;
      if (!result.flow || result.flow.version !== "oa-guided-v1")
        throw new Error("content");
      const match = result.emotions.find((e) => e.emotionId === ids[0]);
      if (!match) throw new Error("content");
      if (
        match.applicable &&
        (!match.dbtParent || !result.parents[match.dbtParent])
      )
        throw new Error("content");
      setData(result);
      setSession({
        ...blank(),
        emotionId: ids[0],
        parentId: match.dbtParent ?? "",
        contentVersion: result.flow.version,
        sourceIds: result.flow.sourceIds,
      });
      setCustomAction(false);
      setCustomCue("");
      setSaveState("idle");
      go("context");
    } catch {
      if (ticket === requestId.current)
        setError(
          "The guided content could not load. Your selection is still here. Please retry or choose another tool.",
        );
    } finally {
      if (ticket === requestId.current) setLoading(false);
    }
  }
  async function save() {
    if (!user || saveLock.current) return;
    saveLock.current = true;
    setSaveState("saving");
    try {
      await saveOppositeActionSession({ ...session, cue: cueLabel });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    } finally {
      saveLock.current = false;
    }
  }
  function back() {
    if (stage === "summary") {
      go(session.status === "practiced" ? "reflect" : "practice");
      return;
    }
    if (
      ["plan", "action", "decision", "facts", "urge", "context"].includes(stage)
    )
      resetPlan();
    go(stages[Math.max(0, stages.indexOf(stage) - 1)]);
  }
  let content: ReactNode;
  if (stage === "identify") {
    content = (
      <>
        <Card>
          <p>
            Pick one emotion to work with. We will check the facts, find a
            response that serves your goal, and build a step you can try.
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Mixed feelings are welcome. Start with the one whose urge is causing
            the most trouble.
          </p>
        </Card>
        <EmotionPicker
          selectionMode="single"
          selectedIds={ids}
          onChange={(newIds) =>
            setIds(
              newIds.length > ids.length ? [newIds[newIds.length - 1]] : newIds,
            )
          }
          onContinue={load}
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
              <button className={button} key={id} onClick={() => setIds([id])}>
                Focus on {getEmotionById(id)?.name}
              </button>
            ))}
          </div>
        )}
      </>
    );
  } else if (!flow || !mapping) {
    content = (
      <Card>
        <p role="alert">The exercise content is unavailable.</p>
        {next("identify", true, "Choose an emotion again")}
      </Card>
    );
  } else if (!mapping.applicable) {
    content = (
      <>
        <Card>
          <h3 className="font-semibold">A different starting point</h3>
          <p>
            {mapping.clinicalNote ||
              "The guide does not recommend opposite action for this emotion."}
          </p>
        </Card>
        {toolLink(mapping.alternativeSkill ?? "")}
        {next("identify", true, "Choose another emotion")}
      </>
    );
  } else if (stage === "context") {
    content = (
      <>
        <p>{c.intro}</p>
        <p>{c.context}</p>
        {choices("situation", session.situation, (id) =>
          change("situation", id),
        )}
        <h3 className="font-semibold">
          What would you like your response to help you do?
        </h3>
        {choices("goal", session.goal, (id) => change("goal", id))}
        <Scale
          label={`How intense is ${emotion.toLowerCase()} right now?`}
          value={session.intensityBefore}
          onChange={(v) => change("intensityBefore", v)}
        />
        <Card>
          <h3 className="font-semibold">First, a safety check</h3>
          <p>{c.safety}</p>
          {choices("safety", session.safety, (id) => {
            change("safety", id);
            change("facts", "");
            change("effectiveness", "");
          })}
        </Card>
        {session.safety && session.safety !== "safe" ? (
          <>
            <Card>
              <p>{c.support}</p>
            </Card>
            {toolLink("pause")}
          </>
        ) : (
          next(
            "urge",
            !!session.situation && !!session.goal && session.safety === "safe",
          )
        )}
      </>
    );
  } else if (stage === "urge") {
    content = (
      <>
        <Card>
          <p>{protocol?.acknowledgment}</p>
          <p>{c.urge}</p>
        </Card>
        {protocol?.urges.map((u) => (
          <button
            type="button"
            key={u.id}
            className={button}
            aria-pressed={session.urgeId === u.id}
            onClick={() => {
              change("urgeId", u.id);
              change("customUrge", "");
              change("facts", "");
              change("effectiveness", "");
            }}
          >
            {session.urgeId === u.id ? "✓ " : ""}
            {u.label}
          </button>
        ))}
        <button
          className={button}
          aria-pressed={session.urgeId === "custom"}
          onClick={() => {
            change("urgeId", "custom");
            change("facts", "");
            change("effectiveness", "");
          }}
        >
          My urge is different
        </button>
        {session.urgeId === "custom" && (
          <Field
            label="What is the urge pushing you to do?"
            value={session.customUrge}
            onChange={(v) => change("customUrge", v)}
          />
        )}
        {next("facts", !!urgeLabel.trim())}
      </>
    );
  } else if (stage === "facts") {
    content = (
      <>
        <Card>
          <p>
            You are feeling <strong>{emotion.toLowerCase()}</strong>, with an
            urge to <strong>{urgeLabel}</strong>.
          </p>
          <p>
            Your goal: <strong>{goalLabel.toLowerCase()}</strong>.
          </p>
        </Card>
        <p>{c.facts}</p>
        <Field
          label="What did you observe? (optional)"
          placeholder="What could a camera or microphone capture?"
          value={session.observation}
          onChange={(v) => change("observation", v)}
        />
        <Field
          label="What meaning or prediction did you add? (optional)"
          value={session.interpretation}
          onChange={(v) => change("interpretation", v)}
        />
        <details className="p-4 rounded-xl border border-[var(--color-border)]">
          <summary className="cursor-pointer min-h-11">
            When {emotion.toLowerCase()} may fit the facts
          </summary>
          <ul className="list-disc pl-5 space-y-2">
            {protocol?.fitsTheFactsWhen.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
        {["guilt", "shame"].includes(session.parentId) && (
          <Card>
            <p>{c[`${session.parentId}Check`]}</p>
          </Card>
        )}
        <h3 className="font-semibold">{c.factsQuestion}</h3>
        {choices("facts", session.facts, (id) => {
          change("facts", id);
          change("effectiveness", "");
        })}
        {session.facts && (
          <>
            <h3 className="font-semibold">{c.effectiveness}</h3>
            {choices("effectiveness", session.effectiveness, (id) =>
              change("effectiveness", id),
            )}
          </>
        )}
        {next(
          "decision",
          !!session.facts && !!session.effectiveness,
          "See which response fits",
        )}
      </>
    );
  } else if (stage === "decision") {
    content = (
      <>
        <Card>
          <h3 className="font-semibold">
            {route === "opposite"
              ? "Try a different response to the urge"
              : route === "problem"
                ? "Address what is happening"
                : route === "support"
                  ? "Safety comes first"
                  : "Leave room for uncertainty"}
          </h3>
          <p>{c[route]}</p>
          {route === "problem" && session.facts === "fits" && (
            <p>{protocol?.fitsFactsGuidance}</p>
          )}
        </Card>
        {route === "opposite" ? (
          next("action", true, "Find a doable opposite")
        ) : route === "problem" ? (
          toolLink("problem-solve")
        ) : route === "support" ? (
          toolLink("pause")
        ) : (
          <>
            {next("facts", true, "Check the facts again")}
            {toolLink("pause")}
          </>
        )}
        {route === "opposite" &&
          toolLink("problem-solve", "I want to address the situation first")}
      </>
    );
  } else if (stage === "action") {
    const examples = urge ?? protocol?.defaultOpposites;
    content = (
      <>
        <Card>
          <p>
            Instead of <strong>{urgeLabel}</strong>, choose a step toward{" "}
            <strong>{goalLabel.toLowerCase()}</strong>.
          </p>
          <p>{c.action}</p>
        </Card>
        {session.urgeId === "custom" && <p>{c.customAction}</p>}
        {(["small", "medium", "bigger"] as const).map(
          (size) =>
            examples?.[size] && (
              <button
                key={size}
                className={button}
                aria-pressed={session.actionSize === size && !customAction}
                onClick={() => {
                  setCustomAction(false);
                  change("actionSize", size);
                  change("action", examples[size]);
                }}
              >
                <span className="block text-xs uppercase tracking-wide text-[var(--color-accent)]">
                  {size === "small"
                    ? "A small start"
                    : size === "medium"
                      ? "A little further"
                      : "Fuller practice"}
                </span>
                <span className="block mt-2">{examples[size]}</span>
              </button>
            ),
        )}
        <button
          className={button}
          aria-pressed={customAction}
          onClick={() => {
            setCustomAction(true);
            change("actionSize", "custom");
            change("action", "");
          }}
        >
          Write my own opposite
        </button>
        {customAction && (
          <Field
            label="What will you do differently, while keeping it safe?"
            value={session.action}
            onChange={(v) => change("action", v)}
          />
        )}
        {next("plan", !!session.action.trim(), "Make this concrete")}
      </>
    );
  } else if (stage === "plan") {
    content = (
      <>
        <Card>
          <h3 className="font-semibold">Your action</h3>
          <p>{session.action}</p>
          <p className="text-sm">To help you: {goalLabel.toLowerCase()}.</p>
        </Card>
        <h3 className="font-semibold">When will you try it?</h3>
        {choices("cue", session.cue, (id) => change("cue", id))}
        {session.cue === "custom" && (
          <Field
            label="When and where?"
            value={customCue}
            onChange={(v) => {
              setCustomCue(v);
              setSaveState("idle");
            }}
          />
        )}
        <Card>
          <h3 className="font-semibold">Bring your body along</h3>
          <p>{c.allTheWay}</p>
          <p>{protocol?.bodyOpposite}</p>
          <label className="flex gap-3 items-start">
            <input
              className="mt-1"
              type="checkbox"
              checked={session.bodyPractice}
              onChange={(e) => change("bodyPractice", e.target.checked)}
            />
            <span>
              I have chosen a body or attention cue to practice with this
              action.
            </span>
          </label>
        </Card>
        <h3 className="font-semibold">What might get in the way?</h3>
        {choices("barrier", session.barrier, (id) => {
          change("barrier", id);
          change("backup", "");
        })}
        {session.barrier && session.barrier !== "none" && (
          <Field
            label="If that happens, what smaller step or support will you use?"
            value={session.backup}
            onChange={(v) => change("backup", v)}
          />
        )}
        <h3 className="font-semibold">Does this feel doable?</h3>
        {choices("willingness", session.willingness, (id) =>
          change("willingness", id),
        )}
        {session.willingness === "smaller" ? (
          <>
            <p>{c.lowConfidence}</p>
            {next("action", true, "Resize my action")}
          </>
        ) : (
          next(
            "practice",
            !!cueLabel.trim() &&
              !!session.barrier &&
              (session.barrier === "none" || !!session.backup.trim()) &&
              session.bodyPractice &&
              session.willingness === "ready",
            "Review and try",
          )
        )}
      </>
    );
  } else if (stage === "practice") {
    content = (
      <>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--color-accent)]">
            When: {cueLabel}
          </p>
          <h3 className="text-xl font-semibold">{session.action}</h3>
          <p>{protocol?.bodyOpposite}</p>
          {session.backup && (
            <p>
              <strong>If I get stuck:</strong> {session.backup}
            </p>
          )}
        </Card>
        <p>{c.practice}</p>
        <button
          className={primary}
          onClick={() => {
            change("status", "practiced");
            setAfter(session.intensityAfter ?? session.intensityBefore);
            go("reflect");
          }}
        >
          I tried it — reflect
        </button>
        <button
          className={button}
          onClick={() => {
            change("status", "planned");
            change("intensityAfter", null);
            change("outcome", "");
            change("reflection", "");
            go("summary");
          }}
        >
          I am planning to try it later
        </button>
        {next("action", true, "Adjust the action")}
      </>
    );
  } else if (stage === "reflect") {
    content = (
      <>
        <p>{c.reflect}</p>
        <Scale
          label={`How intense is ${emotion.toLowerCase()} now?`}
          value={after}
          onChange={setAfter}
        />
        <h3 className="font-semibold">What happened?</h3>
        {choices("outcome", session.outcome, (id) => change("outcome", id))}
        {session.outcome === "unsafe" && (
          <Card>
            <p>{c.reflectionUnsafe}</p>
            {toolLink("pause")}
          </Card>
        )}
        <Field
          label="What did you notice or learn? (optional)"
          value={session.reflection}
          onChange={(v) => change("reflection", v)}
        />
        <button
          className={primary}
          disabled={!session.outcome}
          onClick={() => {
            change("intensityAfter", after);
            go("summary");
          }}
        >
          See my takeaway
        </button>
      </>
    );
  } else {
    const practiced =
      session.status === "practiced" && session.intensityAfter !== null;
    content = (
      <>
        <Card>
          <h3 className="text-xl font-semibold">
            {practiced
              ? "You tried a different response"
              : "Your plan is ready"}
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs uppercase tracking-wide">
                Emotion → urge
              </dt>
              <dd>
                {emotion} → {urgeLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">Chosen action</dt>
              <dd>{session.action}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">When</dt>
              <dd>{cueLabel}</dd>
            </div>
            {session.backup && (
              <div>
                <dt className="text-xs uppercase tracking-wide">Backup</dt>
                <dd>{session.backup}</dd>
              </div>
            )}
            {practiced && (
              <div>
                <dt className="text-xs uppercase tracking-wide">
                  Intensity before → after
                </dt>
                <dd>
                  {session.intensityBefore}/10 → {session.intensityAfter}/10
                </dd>
              </div>
            )}
          </dl>
        </Card>
        {practiced ? (
          <Card>
            <p>
              {
                c[
                  reflectionKey(
                    session.intensityBefore,
                    session.intensityAfter!,
                    session.outcome,
                  )
                ]
              }
            </p>
            {session.reflection && (
              <p className="whitespace-pre-wrap">
                Your note: {session.reflection}
              </p>
            )}
          </Card>
        ) : (
          <p>
            You have made a plan. Come back to the practice step when you have
            tried it.
          </p>
        )}
        <p className="text-sm text-[var(--color-text-secondary)]">
          {c.privacy}
        </p>
        {user ? (
          <button
            className={primary}
            disabled={saveState === "saving" || saveState === "saved"}
            onClick={save}
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved to your account"
                : saveState === "error"
                  ? "Retry saving"
                  : practiced
                    ? "Save this reflection"
                    : "Save this plan"}
          </button>
        ) : (
          <p className="text-sm">
            You can use this exercise without saving. Sign in before starting if
            you want to save to your account.
          </p>
        )}
        {saveState === "error" && (
          <p role="alert">
            Saving did not succeed. Your answers are still here; you can retry.
          </p>
        )}
        {practiced && session.outcome === "unsafe" ? (
          toolLink("pause")
        ) : (
          <button
            className={button}
            onClick={() => {
              if (practiced) {
                setSession((s) => ({
                  ...s,
                  id: crypto.randomUUID(),
                  intensityBefore: s.intensityAfter ?? s.intensityBefore,
                  intensityAfter: null,
                  status: "planned",
                  outcome: "",
                  reflection: "",
                }));
                setSaveState("idle");
              }
              go("practice");
            }}
          >
            {practiced ? "Practice again" : "Back to my practice"}
          </button>
        )}
        {next("facts", true, "Recheck the situation")}
        <button
          className={button}
          onClick={() => {
            requestId.current += 1;
            setSession(blank());
            setData(null);
            setIds([]);
            setSaveState("idle");
            go("identify");
          }}
        >
          Start a new exercise
        </button>
      </>
    );
  }
  return (
    <section className="space-y-5 text-[var(--color-text-primary)]">
      <div className="flex items-center justify-between gap-3">
        <button
          className="min-h-11 px-2 text-sm disabled:invisible"
          disabled={stage === "identify" || saveState === "saving"}
          onClick={back}
        >
          ← Back
        </button>
        <span className="text-sm text-[var(--color-text-secondary)]">
          Step {stages.indexOf(stage) + 1} of {stages.length}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Exercise progress"
        aria-valuemin={1}
        aria-valuemax={stages.length}
        aria-valuenow={stages.indexOf(stage) + 1}
        className="h-1.5 rounded-full bg-[var(--color-border)]"
      >
        <div
          className="h-full rounded-full bg-[var(--color-accent)]"
          style={{ width: `${(stages.indexOf(stage) + 1) * 10}%` }}
        />
      </div>
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-xl font-semibold outline-none"
      >
        {names[stages.indexOf(stage)]}
      </h2>
      <fieldset disabled={saveState === "saving"} className="min-w-0 space-y-5">
        {content}
      </fieldset>
    </section>
  );
}
