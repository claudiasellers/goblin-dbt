import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { emotions, getEmotionById, getEmotionByName } from '../../data/emotions';
import {
  getOppositeActionContent,
  type OppositeActionContent,
  type ActionUrgeData,
} from '../../services/neo4j';

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
  const location = useLocation();
  const rawCheckinEmotions = (location.state as { checkinEmotions?: string[] } | null)?.checkinEmotions;
  // Check-in stores emotion names ("Rejected"); OA uses IDs ("rejected"). Convert.
  const checkinEmotionIds = useMemo(() => {
    if (!rawCheckinEmotions?.length) return undefined;
    return rawCheckinEmotions
      .map(name => getEmotionByName(name)?.id ?? getEmotionById(name)?.id)
      .filter((id): id is string => id != null);
  }, [rawCheckinEmotions]);
  const didAutoLoad = useRef(false);

  const [phase, setPhase] = useState<Phase>('intro');
  const [selectedEmotionIds, setSelectedEmotionIds] = useState<string[]>(checkinEmotionIds ?? []);
  const [search, setSearch] = useState('');
  const [showPleasant, setShowPleasant] = useState(false);
  const [selectedUrges, setSelectedUrges] = useState<ActionUrgeData[]>([]);
  const [customUrge, setCustomUrge] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [parentOverrides, setParentOverrides] = useState<Record<string, string>>({});
  const [chosenSizes, setChosenSizes] = useState<Record<string, 'small' | 'medium' | 'bigger'>>({});
  const [guiltFitsNote, setGuiltFitsNote] = useState<string | null>(null);

  // Graph data — fetched after emotion selection
  const [oaData, setOaData] = useState<OppositeActionContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load OA data when arriving from check-in with pre-selected emotions
  useEffect(() => {
    if (!checkinEmotionIds?.length || didAutoLoad.current) return;
    didAutoLoad.current = true;

    async function loadFromCheckin() {
      setLoading(true);
      setError(null);
      try {
        const data = await getOppositeActionContent(checkinEmotionIds!);
        setOaData(data);
        const hasApplicable = data.emotions.some(e => e.applicable);
        setPhase(hasApplicable ? 'name-urge' : 'redirect');
      } catch {
        setError('Could not load opposite action data. Please try again.');
        setPhase('identify');
      } finally {
        setLoading(false);
      }
    }

    loadFromCheckin();
  }, [checkinEmotionIds]);

  // ── Derived from graph data ──

  const applicableEmotions = useMemo(
    () => oaData?.emotions.filter(e => e.applicable) ?? [],
    [oaData]
  );

  const nonApplicable = useMemo(
    () => oaData?.emotions.filter(e => !e.applicable) ?? [],
    [oaData]
  );

  const applicableIds = useMemo(
    () => applicableEmotions.map(e => e.emotionId),
    [applicableEmotions]
  );

  // Unique parents from applicable emotions, with overrides applied
  const parents = useMemo(() => {
    const raw = [...new Set(
      applicableEmotions
        .map(e => e.dbtParent)
        .filter((p): p is string => p != null)
    )];
    return [...new Set(raw.map(p => parentOverrides[p] ?? p))];
  }, [applicableEmotions, parentOverrides]);

  // Parent protocol data from the graph
  const parentData = useMemo(() =>
    parents
      .filter(p => oaData?.parents[p])
      .map(p => ({ parent: p, ...oaData!.parents[p] })),
    [parents, oaData]
  );

  // All available urges, grouped by parent
  const allAvailableUrges = useMemo(() =>
    parentData
      .filter(pd => pd.urges.length > 0)
      .map(pd => ({
        parent: pd.parent,
        parentLabel: pd.label,
        urges: pd.urges,
      })),
    [parentData]
  );

  // Display labels for selected urges
  const urgeLabels = useMemo(() => {
    const labels = selectedUrges.map(u => u.label);
    if (customUrge.trim()) labels.push(customUrge.trim());
    return labels;
  }, [selectedUrges, customUrge]);

  // For show-opposites: each selected urge mapped to its opposites
  const urgeOppositesList = useMemo(() => {
    const result: { key: string; label: string; opposites: { small: string; medium: string; bigger: string } }[] = [];
    for (const urge of selectedUrges) {
      result.push({
        key: urge.id,
        label: urge.label,
        opposites: { small: urge.small, medium: urge.medium, bigger: urge.bigger },
      });
    }
    if (customUrge.trim() && parentData[0]?.defaultOpposites) {
      result.push({ key: 'custom', label: customUrge.trim(), opposites: parentData[0].defaultOpposites });
    }
    return result;
  }, [selectedUrges, customUrge, parentData]);

  // Body opposites from all parents
  const bodyOpposites = useMemo(() =>
    parentData
      .filter(pd => pd.bodyOpposite)
      .map(pd => ({ parent: pd.parent, label: pd.label, text: pd.bodyOpposite })),
    [parentData]
  );

  // Acknowledgments from all parents
  const acknowledgments = useMemo(() =>
    parentData.filter(pd => pd.acknowledgment).map(pd => pd.acknowledgment),
    [parentData]
  );

  // All sizes chosen?
  const allSizesChosen = urgeOppositesList.length > 0 && urgeOppositesList.every(u => chosenSizes[u.key]);

  // Grouped emotions for identify phase
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

  // ── Actions ──

  const toggleEmotion = (id: string) => {
    setSelectedEmotionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleUrge = (urge: ActionUrgeData) => {
    setSelectedUrges(prev =>
      prev.some(u => u.id === urge.id)
        ? prev.filter(u => u.id !== urge.id)
        : [...prev, urge]
    );
  };

  const continueFromIdentify = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOppositeActionContent(selectedEmotionIds);
      setOaData(data);
      const hasApplicable = data.emotions.some(e => e.applicable);
      setPhase(hasApplicable ? 'name-urge' : 'redirect');
    } catch {
      setError('Could not load opposite action data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedEmotionIds]);

  const goToCheckFacts = () => setPhase('check-facts');

  const goToOpposites = () => {
    setGuiltFitsNote(null);
    if (parents.some(p => p === 'shame' || p === 'guilt')) {
      setPhase('guilt-fork');
    } else {
      setPhase('show-opposites');
    }
  };

  const reset = () => {
    setPhase('intro');
    setSelectedEmotionIds([]);
    setSearch('');
    setShowPleasant(false);
    setSelectedUrges([]);
    setCustomUrge('');
    setShowCustomInput(false);
    setParentOverrides({});
    setChosenSizes({});
    setGuiltFitsNote(null);
    setOaData(null);
    setError(null);
  };

  // ── Helpers ──

  const emotionNameList = (ids: string[]) => {
    const names = ids.map(id => getEmotionById(id)?.name?.toLowerCase()).filter(Boolean) as string[];
    if (names.length <= 2) return names.join(' and ');
    return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
  };

  // ─── LOADING FROM CHECK-IN ───
  if (loading && phase === 'intro') {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin mb-4"></div>
        <p className="text-[var(--color-text-secondary)]">
          Loading for {emotionNameList(selectedEmotionIds)}...
        </p>
      </div>
    );
  }

  // ─── INTRO ───
  if (phase === 'intro') {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
            How this works
          </h3>
          <ul className="space-y-2 text-[var(--color-text-secondary)]">
            <li>• Every emotion comes with an <strong>action urge</strong> — what it pushes you to do</li>
            <li>• The opposite isn't to the emotion — it's to the <strong>urge</strong></li>
            <li>• We'll figure out what your emotions want you to do, check if that's actually helpful, and find the right-sized opposite</li>
          </ul>
        </div>
        <button
          onClick={() => setPhase('identify')}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
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
        <p className="text-[var(--color-text-secondary)]">
          What are you feeling right now?{' '}
          <span className="text-sm text-[var(--color-text-tertiary)]">Select all that apply.</span>
        </p>

        <input
          type="text"
          placeholder="Search emotions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {Object.entries(grouped).map(([family, members]) => (
            <div key={family}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-2">
                {familyLabels[family] ?? family}
              </h4>
              <div className="flex flex-wrap gap-2">
                {members.map(e => {
                  const selected = selectedEmotionIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleEmotion(e.id)}
                      disabled={loading}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        selected
                          ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
                      }`}
                    >
                      {e.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {!search && !showPleasant && (
          <button
            onClick={() => setShowPleasant(true)}
            className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            + Show pleasant emotions too
          </button>
        )}

        {error && (
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        )}

        {selectedEmotionIds.length > 0 && (
          <button
            onClick={continueFromIdentify}
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary disabled:opacity-50"
          >
            {loading
              ? 'Loading...'
              : `Continue with ${selectedEmotionIds.length === 1
                  ? getEmotionById(selectedEmotionIds[0])?.name
                  : `${selectedEmotionIds.length} emotions`}`}
          </button>
        )}
      </div>
    );
  }

  // ─── REDIRECT (not OA applicable) ───
  if (phase === 'redirect') {
    const altNames: Record<string, string> = {
      'mindfulness-emotions': 'Sit With It (Mindfulness)',
      'please-skill': 'PLEASE (Self-Care Basics)',
      'check-the-facts': 'Check the Facts',
      'name-it': 'Name It',
      'body-scan': 'Body Scan',
    };
    const notApplicableNames = nonApplicable.map(m => getEmotionById(m.emotionId)?.name).filter(Boolean);
    const uniqueAlts = [...new Set(nonApplicable.map(m => m.alternativeSkill).filter(Boolean))] as string[];

    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
            Opposite Action isn't the best fit for {notApplicableNames.length === 1
              ? `"${notApplicableNames[0]}"`
              : 'these emotions'}
          </h3>
          {nonApplicable.map(m => (
            <p key={m.emotionId} className="text-[var(--color-text-secondary)] mb-2">
              {m.clinicalNote}
            </p>
          ))}
        </div>

        {uniqueAlts.map(alt => (
          <Link
            key={alt}
            to={`/tool/${alt}`}
            className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary text-center"
          >
            Try {altNames[alt] ?? alt}
          </Link>
        ))}

        <button
          onClick={() => { setPhase('identify'); setSelectedEmotionIds([]); setOaData(null); }}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
        >
          Pick different emotions
        </button>
      </div>
    );
  }

  // ─── NAME THE URGE ───
  if (phase === 'name-urge') {
    const emotionLabel = applicableIds.length === 1
      ? getEmotionById(applicableIds[0])?.name?.toLowerCase() ?? 'this'
      : 'these feelings';
    const skippedNames = nonApplicable.map(m => getEmotionById(m.emotionId)?.name).filter(Boolean);

    return (
      <div className="space-y-6">
        {skippedNames.length > 0 && (
          <div className="p-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-secondary)]">
            Opposite Action works best for {emotionNameList(applicableIds)}.
            {' '}{skippedNames.join(', ')} {skippedNames.length === 1 ? 'is' : 'are'} better addressed with other tools.
          </div>
        )}

        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">
            What is {emotionLabel} making you want to do?
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Not what you think you <em>should</em> do — what's the pull? Select all that apply.
          </p>
        </div>

        {allAvailableUrges.map(({ parent, parentLabel, urges }) => (
          <div key={parent} className="space-y-2">
            {allAvailableUrges.length > 1 && (
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                {parentLabel} urges
              </h4>
            )}
            {urges.map(urge => {
              const selected = selectedUrges.some(u => u.id === urge.id);
              return (
                <button
                  key={urge.id}
                  onClick={() => toggleUrge(urge)}
                  className={`w-full text-left py-3 px-4 rounded-lg border transition-colors ${
                    selected
                      ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
                  }`}
                >
                  {urge.label}
                </button>
              );
            })}
          </div>
        ))}

        {!showCustomInput ? (
          <button
            onClick={() => setShowCustomInput(true)}
            className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            + Something else
          </button>
        ) : (
          <input
            type="text"
            placeholder="What's the urge? e.g., 'snap at everyone'"
            value={customUrge}
            onChange={e => setCustomUrge(e.target.value)}
            autoFocus
            className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        )}

        {(selectedUrges.length > 0 || customUrge.trim()) && (
          <button
            onClick={goToCheckFacts}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
          >
            Continue
          </button>
        )}

        <button
          onClick={() => { setPhase('identify'); setOaData(null); setSelectedUrges([]); setCustomUrge(''); setShowCustomInput(false); }}
          className="w-full text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Change emotions
        </button>
      </div>
    );
  }

  // ─── CHECK THE FACTS ───
  if (phase === 'check-facts') {
    const emotionLabel = applicableIds.length === 1
      ? getEmotionById(applicableIds[0])?.name?.toLowerCase() ?? 'this emotion'
      : 'these feelings';
    const urgeDisplay = urgeLabels.length === 1
      ? urgeLabels[0].toLowerCase()
      : urgeLabels.map(l => l.toLowerCase()).join(', ');

    // Group fits-the-facts items by parent
    const groupedByParent = parentData
      .filter(pd => pd.fitsTheFactsWhen?.length > 0)
      .map(pd => ({ parent: pd.parent, label: pd.label, items: pd.fitsTheFactsWhen }));

    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
            Check the facts
          </h3>
          <p className="text-[var(--color-text-secondary)]">
            You're feeling <strong>{emotionLabel}</strong> and it's pushing you to <strong>{urgeDisplay}</strong>.
          </p>
          <p className="text-[var(--color-text-secondary)] mt-3">
            Does any of this apply right now?
          </p>
        </div>

        {groupedByParent.map(({ parent, label, items }) => (
          <div key={parent} className="space-y-2">
            {groupedByParent.length > 1 && (
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                {label}
              </h4>
            )}
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => setPhase('fits-facts')}
                className="w-full text-left py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary"
              >
                {item}
              </button>
            ))}
          </div>
        ))}

        <div className="space-y-2 pt-2 border-t border-[var(--color-border-subtle)]">
          <button
            onClick={goToOpposites}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
          >
            None of these — it's bigger than the situation
          </button>
          <button
            onClick={goToOpposites}
            className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-tertiary)] lift-secondary"
          >
            I'm not sure
          </button>
        </div>
      </div>
    );
  }

  // ─── FITS FACTS ───
  if (phase === 'fits-facts') {
    const guidances = parentData
      .filter(pd => pd.fitsFactsGuidance)
      .map(pd => ({ label: pd.label, text: pd.fitsFactsGuidance }));

    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
            Your emotion fits the situation
          </h3>
          {guidances.map((g, i) => (
            <div key={i} className={i > 0 ? 'mt-4' : ''}>
              {guidances.length > 1 && (
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1">
                  {g.label}
                </p>
              )}
              <p className="text-[var(--color-text-secondary)]">
                {g.text}
              </p>
            </div>
          ))}
          <p className="text-sm text-[var(--color-text-secondary)] mt-4">
            When the emotion fits, it's giving you useful information. The move here is to address the situation, not to act opposite.
          </p>
        </div>

        <Link
          to="/tool/problem-solve"
          className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary text-center"
        >
          Try Problem Solve instead
        </Link>

        <button
          onClick={() => setPhase('check-facts')}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
        >
          Actually, let me reconsider
        </button>
      </div>
    );
  }

  // ─── GUILT / SHAME FORK ───
  if (phase === 'guilt-fork') {
    const hasShame = parents.includes('shame');
    const hasGuilt = parents.includes('guilt');
    const otherParents = parents.filter(p => p !== 'shame' && p !== 'guilt');

    if (hasShame) {
      return (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
              Let's look at this more closely
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Shame says <em>"I am bad."</em> Guilt says <em>"I did something bad."</em> They feel similar but need different responses.
            </p>
            <p className="text-[var(--color-text-secondary)] mt-3">
              Is this feeling about <strong>who you are</strong> as a person, or about <strong>something specific you did</strong>?
            </p>
          </div>

          <button
            onClick={() => {
              setParentOverrides(prev => ({ ...prev, shame: 'shame' }));
              setPhase('show-opposites');
            }}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
          >
            Who I am as a person
          </button>
          <button
            onClick={() => {
              setParentOverrides(prev => ({ ...prev, shame: 'guilt' }));
              setPhase('show-opposites');
            }}
            className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
          >
            Something specific I did
          </button>
        </div>
      );
    }

    // Guilt parent (no shame)
    if (hasGuilt) {
      return (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
              One more question about guilt
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Did what you did actually go against your <strong>own deeply-held values</strong>?
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              Not what others think you should feel guilty about — what <em>you</em> believe matters.
            </p>
          </div>

          <button
            onClick={() => {
              if (otherParents.length === 0) {
                setPhase('fits-facts');
              } else {
                setGuiltFitsNote(oaData?.parents['guilt']?.fitsFactsGuidance ?? null);
                setPhase('show-opposites');
              }
            }}
            className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
          >
            Yes, I violated my values
          </button>
          <button
            onClick={() => setPhase('show-opposites')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
          >
            No, I didn't
          </button>
        </div>
      );
    }

    // Shouldn't reach here — fallback
    setPhase('show-opposites');
    return null;
  }

  // ─── SHOW OPPOSITES (validation + graduated choices) ───
  if (phase === 'show-opposites' && urgeOppositesList.length > 0) {
    const emotionLabel = applicableIds.length === 1
      ? getEmotionById(applicableIds[0])?.name?.toLowerCase() ?? 'this emotion'
      : 'these feelings';
    const urgeDisplay = urgeLabels.map(l => l.toLowerCase()).join(', ');

    return (
      <div className="space-y-6">
        {/* Guilt fits note — when guilt fits the facts but other parents don't */}
        {guiltFitsNote && (
          <div className="p-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              About the guilt
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {guiltFitsNote} For the rest of what you're feeling, here are the opposites:
            </p>
          </div>
        )}

        {/* Validation */}
        <div className="p-5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
          <p className="text-[var(--color-text-primary)]">
            Your {emotionLabel} {applicableIds.length === 1 ? 'wants' : 'want'} you to <strong>{urgeDisplay}</strong>.
            {acknowledgments.length > 0 && (
              <> That makes sense — {acknowledgments[0].charAt(0).toLowerCase()}{acknowledgments[0].slice(1)}</>
            )}
          </p>
          <p className="text-[var(--color-text-secondary)] mt-3">
            But acting on {urgeLabels.length === 1 ? 'that urge' : 'those urges'} right now will probably keep the {emotionLabel} going.
            Moving opposite — even a little — can shift things.
          </p>
        </div>

        {/* Graduated choices per urge */}
        {urgeOppositesList.map(({ key, label, opposites }) => (
          <div key={key}>
            {urgeOppositesList.length > 1 ? (
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Instead of <em>{label.toLowerCase()}</em>:
              </p>
            ) : (
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                Pick what feels doable:
              </p>
            )}
            <div className="space-y-2">
              {(['small', 'medium', 'bigger'] as const).map(size => {
                const labels = { small: 'Small step', medium: 'Medium step', bigger: 'Bigger step' };
                const colors = {
                  small: 'border-[var(--color-border)] lift-secondary',
                  medium: 'border-[var(--color-border-accent)] lift-secondary',
                  bigger: 'border-[var(--color-accent)] lift-secondary',
                };
                const selected = chosenSizes[key] === size;

                return (
                  <button
                    key={size}
                    onClick={() => setChosenSizes(prev => ({ ...prev, [key]: size }))}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      selected
                        ? 'border-[var(--color-accent)] bg-[var(--color-bg-elevated)]'
                        : colors[size]
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                      {labels[size]}
                    </span>
                    <p className="text-[var(--color-text-primary)] mt-1">
                      {opposites[size]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Body opposites */}
        {bodyOpposites.length > 0 && (
          <div className="p-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-sm font-medium text-[var(--color-accent)] mb-1">
              Your body too
            </p>
            {bodyOpposites.map((bo, i) => (
              <p key={i} className={`text-[var(--color-text-secondary)]${i > 0 ? ' mt-2' : ''}`}>
                {bodyOpposites.length > 1 && (
                  <span className="text-xs font-medium text-[var(--color-text-tertiary)]">{bo.label}: </span>
                )}
                {bo.text}
              </p>
            ))}
          </div>
        )}

        {allSizesChosen && (
          <button
            onClick={() => setPhase('complete')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
          >
            I'm going to do this
          </button>
        )}
      </div>
    );
  }

  // ─── COMPLETE ───
  if (phase === 'complete') {
    const chosenActions = urgeOppositesList
      .filter(u => chosenSizes[u.key])
      .map(u => u.opposites[chosenSizes[u.key]!]);

    const whyItWorks = [...new Set(
      parentData.map(pd => pd.whyItWorks).filter(Boolean)
    )];

    return (
      <div className="text-center p-8 rounded-xl bg-[var(--color-bg-elevated)]">
        <span className="text-4xl mb-4 block" role="img" aria-hidden="true">🔄</span>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">
          That counts
        </h3>
        {chosenActions.map((action, i) => (
          <p key={i} className="text-[var(--color-text-secondary)] p-3 rounded-lg bg-[var(--color-bg-secondary)] mb-2">
            "{action}"
          </p>
        ))}
        {whyItWorks.map((why, i) => (
          <p key={i} className="text-sm text-[var(--color-text-secondary)] mb-2">
            {why}
          </p>
        ))}
        {bodyOpposites.length > 0 && (
          <p className="text-sm text-[var(--color-text-tertiary)] mb-6">
            And remember: {bodyOpposites.map(bo => bo.text.split('.')[0].toLowerCase()).join('. ')}.
          </p>
        )}
        <button
          onClick={reset}
          className="py-2 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary"
        >
          Start over
        </button>
      </div>
    );
  }

  // Fallback
  return null;
}
