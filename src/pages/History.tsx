import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { getCheckInsByUser, type CheckInRecord } from '../services/neo4j';
import { quadrantColors } from '../data/emotions';
import { HistoryInsights } from '../components/history/HistoryInsights';

export function History() {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await getCheckInsByUser(user.uid);
        setCheckIns(data);
      } catch (err) {
        console.error('Failed to fetch history:', err);
        setError('Failed to load your check-in history.');
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
          Log in to see your check-in history and patterns over time.
        </p>
        <div className="space-y-3">
          <Link
            to="/signup"
            className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
          >
            Create account
          </Link>
          <Link
            to="/login"
            className="block w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
          >
            Log in
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
          className="inline-block py-2 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
        Your History
      </h1>

      {checkIns.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">📝</span>
          <p className="text-[var(--color-text-secondary)] mb-4">
            No check-ins yet. Start by checking in with how you're feeling.
          </p>
          <Link
            to="/"
            className="inline-block py-2 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
          >
            Check in now
          </Link>
        </div>
      ) : (
        <>
        <HistoryInsights checkIns={checkIns} />
        <div className="space-y-4">
          {checkIns.map((checkIn) => (
            <CheckInCard key={checkIn.id} checkIn={checkIn} />
          ))}
        </div>
        </>
      )}
    </div>
  );
}

function CheckInCard({ checkIn }: { checkIn: CheckInRecord }) {
  const [expanded, setExpanded] = useState(false);
  const colors = quadrantColors[checkIn.quadrant] || { bg: 'bg-gray-200', text: 'text-gray-800' };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(checkIn.timestamp);

  // Convert intensity to labels
  const intensityLabel = checkIn.intensity.y > 0.66 ? 'High' : checkIn.intensity.y > 0.33 ? 'Medium' : 'Low';

  return (
    <div
      className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border-subtle)] cursor-pointer lift-card"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3">
        {/* Emotion badge */}
        <span className={`
          px-3 py-1 rounded-full text-sm font-medium
          ${colors.bg} ${colors.text}
        `}>
          {checkIn.emotion}
        </span>

        {/* Date */}
        <span className="text-sm text-[var(--color-text-tertiary)] ml-auto">
          {formattedDate}
        </span>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[var(--color-text-tertiary)]">Intensity</span>
              <p className="font-medium text-[var(--color-text-secondary)]">{intensityLabel}</p>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Body sensations</span>
              <p className="font-medium text-[var(--color-text-secondary)]">
                {checkIn.bodySensations.length || 'None'}
              </p>
            </div>
          </div>

          {checkIn.bodySensations.length > 0 && (
            <div className="mt-3">
              <span className="text-sm text-[var(--color-text-tertiary)]">Sensations:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {checkIn.bodySensations.map((sensation, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]"
                  >
                    {sensation.region}
                    {sensation.tags.length > 0 && `: ${sensation.tags.join(', ')}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {checkIn.note && (
            <div className="mt-3">
              <span className="text-sm text-[var(--color-text-tertiary)]">Note:</span>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">{checkIn.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
