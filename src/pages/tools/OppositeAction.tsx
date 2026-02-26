import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { emotions, getEmotionById } from '../../data/emotions';
import { getMapping, type DBTParentEmotion } from '../../data/dbt-parent-mapping';
import { getProtocol } from '../../data/oppositeActionProtocols';
import { getUrgesForParent, type ActionUrge } from '../../data/urgeOpposites';
import { getFitsTheFactsWhen } from '../../data/emotion-regulation-content';

type Phase =
  | 'intro'
  | 'identify'
  | 'redirect'
  | 'name-urge'
  | 'check-facts'
  | 'fits-facts'
  | 'guilt-fork'
  | 'show-opposites'
  | 'complete';

const familyLabels: Record<string, string> = {
  fearful: 'Fearful',
  angry: 'Angry',
  sad: 'Sad',
  disgusted: 'Disgusted',
  bad: 'Bad',
  happy: 'Happy',
  surprised: 'Surprised',
};

const familyOrder = ['fearful', 'angry', 'sad', 'disgusted', 'bad', 'happy', 'surprised'];

export function OppositeAction() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [selectedEmotionId, setSelectedEmotionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showPleasant, setShowPleasant] = useState(false);
  const [selectedUrge, setSelectedUrge] = useState<ActionUrge | null>(null);
  const [customUrge, setCustomUrge] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [effectiveParent, setEffectiveParent] = useState<DBTParentEmotion | null>(null);
  const [chosenSize, setChosenSize] = useState<'small' | 'medium' | 'bigger' | null>(null);

  const selectedEmotion = selectedEmotionId ? getEmotionById(selectedEmotionId) : null;
  const mapping = selectedEmotionId ? getMapping(selectedEmotionId) : null;
  const parent = effectiveParent || mapping?.primary || null;
  const protocol = parent ? getProtocol(parent) : undefined;
  const urgeSet = parent ? getUrgesForParent(parent) : undefined;
  const urgeLabel = selectedUrge?.label || customUrge;

  // For show-opposites: use matched urge data, or fall back to defaults
  const matchedUrge = selectedUrge && urgeSet?.urges.find(u => u.id === selectedUrge.id)
    ? selectedUrge : null;
  const opposites = matchedUrge
    ? { small: matchedUrge.small, medium: matchedUrge.medium, bigger: matchedUrge.bigger }
    : urgeSet?.defaultOpposites ?? null;

  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? emotions.filter(e => e.name.toLowerCase().includes(q))
      : emotions;

    const unpleasant = ['fearful', 'angry', 'sad', 'disgusted', 'bad'];
    const groups: Record<string, typeof emotions> = {};
    for (const fam of familyOrder) {
      if (!showPleasant && !q && !unpleasant.includes(fam)) continue;
      const members = filtered.filter(e => e.family === fam);
      if (members.length > 0) groups[fam] = members;
    }
    return groups;
  }, [search, showPleasant]);

  const selectEmotion = (id: string) => {
    setSelectedEmotionId(id);
    const m = getMapping(id);
    if (!m || !m.oppositeActionApplicable) {
      setPhase('redirect');
    } else {
      setPhase('name-urge');
    }
  };

  const reset = () => {
    setPhase('intro');
    setSelectedEmotionId(null);
    setSearch('');
    setShowPleasant(false);
    setSelectedUrge(null);
    setCustomUrge('');
    setShowCustomInput(false);
    setEffectiveParent(null);
    setChosenSize(null);
  };

  const goToCheckFacts = () => setPhase('check-facts');

  const goToOpposites = () => {
    const p = effectiveParent || mapping?.primary;
    if (p === 'shame' || p === 'guilt') {
      setPhase('guilt-fork');
    } else {
      setPhase('show-opposites');
    }
  };

  // ─── INTRO ───
  if (phase === 'intro') {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-calm-50)] dark:bg-[var(--color-calm-900)]/20 border border-[var(--color-calm-200)] dark:border-[var(--color-calm-800)]">
          <h3 className="font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-3">
            How this works
          </h3>
          <ul className="space-y-2 text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)]">
            <li>• Every emotion comes with an <strong>action urge</strong> — what it pushes you to do</li>
            <li>• The opposite isn't to the emotion — it's to the <strong>urge</strong></li>
            <li>• We'll figure out what your emotion wants you to do, check if that's actually helpful, and find the right-sized opposite</li>
          </ul>
        </div>
        <button
          onClick={() => setPhase('identify')}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors"
        >
          Let's start
        </button>
      </div>
    );
  }

  // ─── IDENTIFY ───
  if (phase === 'identify') {
    return (
      <div className="space-y-5">
        <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)]">
          What are you feeling right now?
        </p>

        <input
          type="text"
          placeholder="Search emotions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full p-3 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] bg-white dark:bg-[var(--color-sage-900)] text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] placeholder:text-[var(--color-sage-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-400)]"
        />

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {Object.entries(grouped).map(([family, members]) => (
            <div key={family}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-sage-500)] dark:text-[var(--color-sage-400)] mb-2">
                {familyLabels[family] ?? family}
              </h4>
              <div className="flex flex-wrap gap-2">
                {members.map(e => (
                  <button
                    key={e.id}
                    onClick={() => selectEmotion(e.id)}
                    className="px-3 py-1.5 text-sm rounded-full border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] hover:bg-[var(--color-sage-200)] dark:hover:bg-[var(--color-sage-700)] transition-colors"
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!search && !showPleasant && (
          <button
            onClick={() => setShowPleasant(true)}
            className="text-sm text-[var(--color-sage-500)] dark:text-[var(--color-sage-400)] hover:text-[var(--color-sage-700)] dark:hover:text-[var(--color-sage-300)] transition-colors"
          >
            + Show pleasant emotions too
          </button>
        )}
      </div>
    );
  }

  // ─── REDIRECT (not OA applicable) ───
  if (phase === 'redirect') {
    const altSkill = mapping?.alternativeSkill;
    const altNames: Record<string, string> = {
      'mindfulness-emotions': 'Sit With It (Mindfulness)',
      'please-skill': 'PLEASE (Self-Care Basics)',
      'check-the-facts': 'Check the Facts',
      'name-it': 'Name It',
      'body-scan': 'Body Scan',
    };

    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-warm-100)] dark:bg-[var(--color-sage-800)] border border-[var(--color-sage-200)] dark:border-[var(--color-sage-700)]">
          <h3 className="font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-3">
            Opposite Action isn't the best fit for "{selectedEmotion?.name}"
          </h3>
          <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] mb-2">
            {mapping?.clinicalNote}
          </p>
          {altSkill && (
            <p className="text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)]">
              A better tool for this:
            </p>
          )}
        </div>

        {altSkill && (
          <Link
            to={`/tool/${altSkill}`}
            className="block w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors text-center"
          >
            Try {altNames[altSkill] ?? altSkill}
          </Link>
        )}

        <button
          onClick={() => { setPhase('identify'); setSelectedEmotionId(null); }}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] hover:bg-[var(--color-sage-100)] dark:hover:bg-[var(--color-sage-700)] font-medium transition-colors"
        >
          Pick a different emotion
        </button>
      </div>
    );
  }

  // ─── NAME THE URGE ───
  if (phase === 'name-urge') {
    const emotionName = selectedEmotion?.name?.toLowerCase() ?? 'this';

    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-calm-50)] dark:bg-[var(--color-calm-900)]/20 border border-[var(--color-calm-200)] dark:border-[var(--color-calm-800)]">
          <h3 className="font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-2">
            What is {emotionName} making you want to do?
          </h3>
          <p className="text-sm text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)]">
            Not what you think you <em>should</em> do — what's the pull?
          </p>
        </div>

        <div className="space-y-2">
          {urgeSet?.urges.map(urge => (
            <button
              key={urge.id}
              onClick={() => {
                setSelectedUrge(urge);
                setCustomUrge('');
                setShowCustomInput(false);
                goToCheckFacts();
              }}
              className="w-full text-left py-3 px-4 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] hover:bg-[var(--color-sage-200)] dark:hover:bg-[var(--color-sage-700)] transition-colors"
            >
              {urge.label}
            </button>
          ))}
        </div>

        {!showCustomInput ? (
          <button
            onClick={() => setShowCustomInput(true)}
            className="text-sm text-[var(--color-sage-500)] dark:text-[var(--color-sage-400)] hover:text-[var(--color-sage-700)] dark:hover:text-[var(--color-sage-300)] transition-colors"
          >
            + Something else
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="What's the urge? e.g., 'snap at everyone'"
              value={customUrge}
              onChange={e => setCustomUrge(e.target.value)}
              autoFocus
              className="w-full p-3 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] bg-white dark:bg-[var(--color-sage-900)] text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] placeholder:text-[var(--color-sage-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-400)]"
            />
            {customUrge.trim() && (
              <button
                onClick={() => {
                  setSelectedUrge(null);
                  goToCheckFacts();
                }}
                className="w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors"
              >
                Continue
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── CHECK THE FACTS ───
  if (phase === 'check-facts') {
    const emotionName = selectedEmotion?.name?.toLowerCase() ?? 'this emotion';
    const fitsItems = parent ? getFitsTheFactsWhen(parent) : [];

    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-calm-50)] dark:bg-[var(--color-calm-900)]/20 border border-[var(--color-calm-200)] dark:border-[var(--color-calm-800)]">
          <h3 className="font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-3">
            Check the facts
          </h3>
          <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)]">
            You're feeling <strong>{emotionName}</strong> and it's pushing you to <strong>{urgeLabel?.toLowerCase()}</strong>.
          </p>
          <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] mt-3">
            Does any of this apply right now?
          </p>
        </div>

        <div className="space-y-2">
          {fitsItems.map((item, i) => (
            <button
              key={i}
              onClick={() => setPhase('fits-facts')}
              className="w-full text-left py-3 px-4 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] hover:bg-[var(--color-sage-100)] dark:hover:bg-[var(--color-sage-700)] transition-colors"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="space-y-2 pt-2 border-t border-[var(--color-sage-200)] dark:border-[var(--color-sage-700)]">
          <button
            onClick={goToOpposites}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors"
          >
            None of these — it's bigger than the situation
          </button>
          <button
            onClick={goToOpposites}
            className="w-full py-3 px-4 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-500)] dark:text-[var(--color-sage-400)] hover:bg-[var(--color-sage-100)] dark:hover:bg-[var(--color-sage-700)] transition-colors"
          >
            I'm not sure
          </button>
        </div>
      </div>
    );
  }

  // ─── FITS FACTS ───
  if (phase === 'fits-facts') {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-warm-100)] dark:bg-[var(--color-sage-800)] border border-[var(--color-sage-200)] dark:border-[var(--color-sage-700)]">
          <h3 className="font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-3">
            Your emotion fits the situation
          </h3>
          <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] mb-4">
            {protocol?.fitsFactsGuidance}
          </p>
          <p className="text-sm text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)]">
            When the emotion fits, it's giving you useful information. The move here is to address the situation, not to act opposite.
          </p>
        </div>

        <Link
          to="/tool/problem-solve"
          className="block w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors text-center"
        >
          Try Problem Solve instead
        </Link>

        <button
          onClick={() => setPhase('check-facts')}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] hover:bg-[var(--color-sage-100)] dark:hover:bg-[var(--color-sage-700)] font-medium transition-colors"
        >
          Actually, let me reconsider
        </button>
      </div>
    );
  }

  // ─── GUILT / SHAME FORK ───
  if (phase === 'guilt-fork') {
    const p = mapping?.primary;

    if (p === 'shame') {
      return (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[var(--color-calm-50)] dark:bg-[var(--color-calm-900)]/20 border border-[var(--color-calm-200)] dark:border-[var(--color-calm-800)]">
            <h3 className="font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-3">
              Let's look at this more closely
            </h3>
            <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)]">
              Shame says <em>"I am bad."</em> Guilt says <em>"I did something bad."</em> They feel similar but need different responses.
            </p>
            <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] mt-3">
              Is this feeling about <strong>who you are</strong> as a person, or about <strong>something specific you did</strong>?
            </p>
          </div>

          <button
            onClick={() => {
              setEffectiveParent('shame');
              setPhase('show-opposites');
            }}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors"
          >
            Who I am as a person
          </button>
          <button
            onClick={() => {
              setEffectiveParent('guilt');
              setPhase('show-opposites');
            }}
            className="w-full py-3 px-4 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] hover:bg-[var(--color-sage-100)] dark:hover:bg-[var(--color-sage-700)] font-medium transition-colors"
          >
            Something specific I did
          </button>
        </div>
      );
    }

    // Guilt parent
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-calm-50)] dark:bg-[var(--color-calm-900)]/20 border border-[var(--color-calm-200)] dark:border-[var(--color-calm-800)]">
          <h3 className="font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-3">
            One more question about guilt
          </h3>
          <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)]">
            Did what you did actually go against your <strong>own deeply-held values</strong>?
          </p>
          <p className="text-sm text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)] mt-2">
            Not what others think you should feel guilty about — what <em>you</em> believe matters.
          </p>
        </div>

        <button
          onClick={() => {
            setEffectiveParent('guilt');
            setPhase('fits-facts');
          }}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] hover:bg-[var(--color-sage-100)] dark:hover:bg-[var(--color-sage-700)] font-medium transition-colors"
        >
          Yes, I violated my values
        </button>
        <button
          onClick={() => {
            setEffectiveParent('guilt');
            setPhase('show-opposites');
          }}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors"
        >
          No, I didn't
        </button>
      </div>
    );
  }

  // ─── SHOW OPPOSITES (validation + graduated choices) ───
  if (phase === 'show-opposites' && urgeSet && opposites) {
    const emotionName = selectedEmotion?.name?.toLowerCase() ?? 'this emotion';

    return (
      <div className="space-y-6">
        {/* Validation */}
        <div className="p-5 rounded-xl bg-[var(--color-warm-100)] dark:bg-[var(--color-sage-800)] border border-[var(--color-sage-200)] dark:border-[var(--color-sage-700)]">
          <p className="text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)]">
            Your {emotionName} wants you to <strong>{urgeLabel?.toLowerCase()}</strong>.
            {' '}That makes sense — {urgeSet.acknowledgment.charAt(0).toLowerCase()}{urgeSet.acknowledgment.slice(1)}
          </p>
          <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] mt-3">
            But acting on that urge right now will probably keep the {emotionName} going.
            Moving opposite — even a little — can shift things.
          </p>
        </div>

        {/* Graduated choices */}
        <div>
          <p className="text-sm font-medium text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)] mb-3">
            Pick what feels doable:
          </p>
          <div className="space-y-2">
            {(['small', 'medium', 'bigger'] as const).map(size => {
              const labels = { small: 'Small step', medium: 'Medium step', bigger: 'Bigger step' };
              const colors = {
                small: 'border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
                medium: 'border-emerald-400 dark:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
                bigger: 'border-emerald-500 dark:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
              };
              const selected = chosenSize === size;

              return (
                <button
                  key={size}
                  onClick={() => setChosenSize(size)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    selected
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                      : colors[size]
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    {labels[size]}
                  </span>
                  <p className="text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mt-1">
                    {opposites[size]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body opposite */}
        <div className="p-4 rounded-xl bg-[var(--color-calm-50)] dark:bg-[var(--color-calm-900)]/20 border border-[var(--color-calm-200)] dark:border-[var(--color-calm-800)]">
          <p className="text-sm font-medium text-[var(--color-calm-700)] dark:text-[var(--color-calm-300)] mb-1">
            Your body too
          </p>
          <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)]">
            {urgeSet.bodyOpposite}
          </p>
        </div>

        {chosenSize && (
          <button
            onClick={() => setPhase('complete')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors"
          >
            I'm going to do this
          </button>
        )}
      </div>
    );
  }

  // ─── COMPLETE ───
  if (phase === 'complete' && opposites && chosenSize) {
    return (
      <div className="text-center p-8 rounded-xl bg-[var(--color-sage-100)] dark:bg-[var(--color-sage-800)]">
        <span className="text-4xl mb-4 block" role="img" aria-hidden="true">🔄</span>
        <h3 className="text-xl font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-3">
          That counts
        </h3>
        <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-200)] p-3 rounded-lg bg-[var(--color-sage-200)] dark:bg-[var(--color-sage-700)] mb-4">
          "{opposites[chosenSize]}"
        </p>
        {protocol?.whyItWorks && (
          <p className="text-sm text-[var(--color-sage-600)] dark:text-[var(--color-sage-300)] mb-4">
            {protocol.whyItWorks}
          </p>
        )}
        {urgeSet && (
          <p className="text-sm text-[var(--color-sage-500)] dark:text-[var(--color-sage-400)] mb-6">
            And remember: {urgeSet.bodyOpposite.split('.')[0].toLowerCase()}.
          </p>
        )}
        <button
          onClick={reset}
          className="py-2 px-4 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] hover:bg-[var(--color-sage-200)] dark:hover:bg-[var(--color-sage-700)] transition-colors"
        >
          Start over
        </button>
      </div>
    );
  }

  // Fallback
  return null;
}
