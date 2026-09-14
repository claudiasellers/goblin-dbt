import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { getCheckInsByUser, getDearManSessions, type CheckInRecord, type DearManSessionRecord } from '../services/neo4j';
import { quadrantColors } from '../data/emotions';
import { HistoryInsights } from '../components/history/HistoryInsights';
import { Insights } from './Insights';

export function History() {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [dearManSessions, setDearManSessions] = useState<DearManSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'checkins' | 'dearman'>('insights');

  useEffect(() => {
    async function fetchHistory() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [checkInResult, dearManResult] = await Promise.allSettled([
          getCheckInsByUser(user.uid),
          getDearManSessions(),
        ]);

        if (checkInResult.status === 'fulfilled') {
          setCheckIns(checkInResult.value);
        } else {
          console.error('Failed to fetch check-ins:', checkInResult.reason);
          setError('Failed to load your check-in history.');
        }

        if (dearManResult.status === 'fulfilled') {
          setDearManSessions(dearManResult.value);
        } else {
          console.error('Failed to fetch DEAR MAN sessions:', dearManResult.reason);
          // Don't set error — check-ins can still show
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
        setError('Failed to load your history.');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [user]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <span className="text-5xl mb-4 block">📊</span>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          Your history
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-6">
          Sign in to see your check-in history and patterns over time.
        </p>
        <div className="space-y-3">
          <Link
            to="/signup"
            className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary"
          >
            Create account
          </Link>
          <Link
            to="/login"
            className="block w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin mb-4"></div>
        <p className="text-[var(--color-text-secondary)]">Loading your history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl mb-4 block">😕</span>
        <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-block py-2 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
        Reflect
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[var(--color-glass-card)] rounded-lg p-1">
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'insights'
              ? 'bg-[var(--color-accent-fill)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Insights
        </button>
        <button
          onClick={() => setActiveTab('checkins')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'checkins'
              ? 'bg-[var(--color-accent-fill)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('dearman')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'dearman'
              ? 'bg-[var(--color-accent-fill)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          DEAR MAN{dearManSessions.length > 0 ? ` (${dearManSessions.length})` : ''}
        </button>
      </div>

      {activeTab === 'insights' && <Insights />}

      {activeTab === 'checkins' && (
        <>
          {checkIns.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">📝</span>
              <p className="text-[var(--color-text-secondary)] mb-4">
                No check-ins yet. Start by checking in with how you're feeling.
              </p>
              <Link
                to="/"
                className="inline-block py-2 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary"
              >
                Check in now
              </Link>
            </div>
          ) : (
            <>
              <HistoryInsights checkIns={checkIns} />
              <CheckInFeed checkIns={checkIns} />
            </>
          )}
        </>
      )}

      {activeTab === 'dearman' && (
        <>
          {dearManSessions.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">🗣️</span>
              <p className="text-[var(--color-text-secondary)] mb-4">
                No DEAR MAN scripts yet. Use the DEAR MAN tool to prep for or debrief a conversation.
              </p>
              <Link
                to="/tool/dear-man"
                className="inline-block py-2 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary"
              >
                Try DEAR MAN
              </Link>
            </div>
          ) : (
            <DearManFeed sessions={dearManSessions} />
          )}
        </>
      )}
    </div>
  );
}

const quadrantDotColor: Record<string, string> = {
  'high-unpleasant': 'var(--color-q-hu-fill)',
  'high-pleasant': 'var(--color-q-hp-fill)',
  'low-unpleasant': 'var(--color-q-lu-fill)',
  'low-pleasant': 'var(--color-q-lp-fill)',
};

function groupByDate(checkIns: CheckInRecord[]): { label: string; key: string; items: CheckInRecord[] }[] {
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const groups: { label: string; key: string; items: CheckInRecord[] }[] = [];

  for (const ci of checkIns) {
    const key = `${ci.timestamp.getFullYear()}-${ci.timestamp.getMonth()}-${ci.timestamp.getDate()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(ci);
    } else {
      groups.push({ label: fmt.format(ci.timestamp), key, items: [ci] });
    }
  }
  return groups;
}

function CheckInFeed({ checkIns }: { checkIns: CheckInRecord[] }) {
  const groups = groupByDate(checkIns);
  const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="bg-[var(--color-glass-card)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-xl p-4">
      <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-3">Feed</h3>

      <div className="space-y-5 max-h-96 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.key}>
            {/* Date header */}
            <p className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1.5">
              {group.label}
            </p>

            {/* Timeline for this day */}
            <div className="relative pl-5">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--color-border-subtle)]" />

              <div className="space-y-1">
                {group.items.map((ci) => (
                  <FeedItem key={ci.id} checkIn={ci} timeFmt={timeFmt} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// DEAR MAN FEED
// ============================================

const situationTypeLabels: Record<string, string> = {
  'asking_for_something': 'Asking for something',
  'saying_no': 'Saying no',
  'expressing_feelings': 'Expressing feelings',
  'resolving_conflict': 'Resolving conflict',
  'boundary': 'Setting a boundary',
  'ask': 'Making a request',
};

const feelingLabels: Record<string, string> = {
  feel_angry: 'Angry', feel_hurt: 'Hurt', feel_frustrated: 'Frustrated',
  feel_anxious: 'Anxious', feel_sad: 'Sad', feel_lonely: 'Lonely',
  feel_overwhelmed: 'Overwhelmed', feel_scared: 'Scared', feel_disappointed: 'Disappointed',
  feel_resentful: 'Resentful', feel_embarrassed: 'Embarrassed', feel_disrespected: 'Disrespected',
  feel_unheard: 'Unheard', feel_invisible: 'Invisible', feel_confused: 'Confused',
  feel_helpless: 'Helpless', feel_exhausted: 'Exhausted', feel_trapped: 'Trapped',
};

const priorityLabels: Record<string, string> = {
  objective: 'Getting what I need',
  relationship: 'Keeping the relationship strong',
  'self-respect': 'Keeping my self-respect intact',
};

const overallLabels: Record<string, string> = {
  went_well: 'It went well',
  mixed: 'Mixed',
  not_well: "It didn't go well",
};

const debriefOptionLabels: Record<string, string> = {
  debrief_stayed_calm: 'I stayed calm',
  debrief_said_it: 'I said what I needed to say',
  debrief_they_listened: 'They actually listened',
  debrief_didnt_back_down: "I didn't back down",
  debrief_kept_facts: 'I kept it about the facts',
  debrief_compromised: 'We found a compromise',
  debrief_no_over_apologize: "I didn't apologize for having needs",
  debrief_used_anchor: 'I used my anchor phrase',
  debrief_more_specific: 'Get more specific about what I need',
  debrief_name_feelings: 'Name my feelings earlier',
  debrief_stay_with_defense: 'Stay with it when they got defensive',
  debrief_no_old_stuff: 'Not bring up old stuff',
  debrief_better_time: 'Pick a better time',
  debrief_less_apologizing: 'Not apologize so much',
  debrief_plan_b: 'Have a plan B ready',
  debrief_breathe: 'Take a breath when I felt overwhelmed',
};

/** Resolve an ID to a human label, falling back to humanizing the ID itself */
function humanize(id: string, labelMap?: Record<string, string>): string {
  if (labelMap?.[id]) return labelMap[id];
  // Strip common prefixes and convert underscores to spaces
  return id.replace(/^(feel_|debrief_)/, '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

function DearManFeed({ sessions }: { sessions: DearManSessionRecord[] }) {
  const dateFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <DearManSessionCard
          key={session.id}
          session={session}
          dateFmt={dateFmt}
          timeFmt={timeFmt}
        />
      ))}
    </div>
  );
}

function DearManSessionCard({
  session,
  dateFmt,
  timeFmt,
}: {
  session: DearManSessionRecord;
  dateFmt: Intl.DateTimeFormat;
  timeFmt: Intl.DateTimeFormat;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPrep = session.type === 'prep';

  return (
    <div
      className="bg-[var(--color-glass-card)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-xl p-4 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`
            px-2.5 py-0.5 rounded-full text-xs font-medium
            ${isPrep
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
            }
          `}>
            {isPrep ? 'Prep' : 'Debrief'}
          </span>
          {session.situationType && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              {situationTypeLabels[session.situationType] || session.situationType}
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--color-text-tertiary)]">
          {dateFmt.format(session.createdAt)} · {timeFmt.format(session.createdAt)}
        </span>
      </div>

      {/* Anchor phrase preview */}
      {isPrep && session.anchorPhrase && (
        <p className="text-sm text-[var(--color-text-primary)] mt-2 italic">
          "{session.anchorPhrase}"
        </p>
      )}

      {/* Debrief overall preview */}
      {!isPrep && session.debriefOverall && (
        <p className="text-sm text-[var(--color-text-secondary)] mt-2">
          How it went: <span className="font-medium text-[var(--color-text-primary)]">{overallLabels[session.debriefOverall] || session.debriefOverall}</span>
        </p>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)] space-y-2 text-sm">
          {isPrep ? (
            <>
              {session.describeCustom && (
                <Detail label="Describe" value={session.describeCustom} />
              )}
              {session.assertCustom && (
                <Detail label="Assert" value={session.assertCustom} />
              )}
              {session.feelings.length > 0 && (
                <Detail label="Feelings" value={session.feelings.map(f => humanize(f, feelingLabels)).join(', ')} />
              )}
              {session.middleGroundCustom && (
                <Detail label="Middle ground" value={session.middleGroundCustom} />
              )}
              {session.walkAwayCustom && (
                <Detail label="Walk-away point" value={session.walkAwayCustom} />
              )}
              {session.priorities.length > 0 && (
                <Detail label="Priorities" value={session.priorities.map(p => humanize(p, priorityLabels)).join(', ')} />
              )}
            </>
          ) : (
            <>
              {session.debriefWentWell.length > 0 && (
                <Detail label="Went well" value={session.debriefWentWell.map(d => humanize(d, debriefOptionLabels)).join(', ')} />
              )}
              {session.debriefToChange.length > 0 && (
                <Detail label="To change" value={session.debriefToChange.map(d => humanize(d, debriefOptionLabels)).join(', ')} />
              )}
              {session.debriefCurrentFeelings.length > 0 && (
                <Detail label="Feeling now" value={session.debriefCurrentFeelings.map(f => humanize(f, feelingLabels)).join(', ')} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-[var(--color-text-tertiary)]">{label}: </span>
      <span className="text-xs text-[var(--color-text-secondary)]">{value}</span>
    </div>
  );
}

function FeedItem({ checkIn, timeFmt }: { checkIn: CheckInRecord; timeFmt: Intl.DateTimeFormat }) {
  const [expanded, setExpanded] = useState(false);
  const colors = quadrantColors[checkIn.quadrant] || { bg: 'bg-gray-200', text: 'text-gray-800' };
  const dotColor = quadrantDotColor[checkIn.quadrant] || 'var(--color-text-tertiary)';
  const intensityLabel = checkIn.intensity.y > 0.66 ? 'High' : checkIn.intensity.y > 0.33 ? 'Medium' : 'Low';

  return (
    <div
      className="relative flex items-start gap-3 py-2 cursor-pointer group"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Timeline dot */}
      <div
        className="absolute -left-5 top-[14px] w-[9px] h-[9px] rounded-full ring-2 ring-[var(--color-bg-primary)] z-10"
        style={{ backgroundColor: dotColor }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`
            px-2.5 py-0.5 rounded-full text-xs font-medium
            ${colors.bg} ${colors.text}
          `}>
            {checkIn.emotion}
          </span>
          <span className="text-xs text-[var(--color-text-tertiary)] ml-auto shrink-0">
            {timeFmt.format(checkIn.timestamp)}
          </span>
        </div>

        {expanded && (
          <div className="mt-2 ml-0.5 text-sm space-y-2">
            <div className="flex gap-4 text-xs">
              <span className="text-[var(--color-text-tertiary)]">
                Intensity: <span className="text-[var(--color-text-secondary)] font-medium">{intensityLabel}</span>
              </span>
              {checkIn.bodySensations.length > 0 && (
                <span className="text-[var(--color-text-tertiary)]">
                  Body: <span className="text-[var(--color-text-secondary)] font-medium">{checkIn.bodySensations.map(s => s.region).join(', ')}</span>
                </span>
              )}
            </div>
            {checkIn.note && (
              <p className="text-xs text-[var(--color-text-secondary)] italic">"{checkIn.note}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
