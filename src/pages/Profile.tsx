import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { modules } from '../data/modules';
import { exportUserData, deleteUserData } from '../services/neo4j';

export function Profile() {
  const { user, logOut } = useAuth();
  const { profile, updateProfile, loading } = useUserProfile();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
          Profile Settings
        </h2>
        <p className="text-[var(--color-text-secondary)] mb-6">
          Sign in to access your profile settings.
        </p>
        <a
          href="#/login"
          className="inline-block px-6 py-2.5 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-bg-primary)] font-semibold text-sm lift-primary"
        >
          Sign in
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--color-bg-card)] rounded w-48" />
          <div className="h-32 bg-[var(--color-bg-card)] rounded" />
          <div className="h-32 bg-[var(--color-bg-card)] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
        Profile Settings
      </h2>

      <BasicInfoSection
        displayName={profile.displayName}
        email={profile.email}
        onSave={(name) => updateProfile({ displayName: name })}
      />

      <AppearanceSection
        theme={profile.theme}
        onChange={(theme) => updateProfile({ theme })}
      />

      <NotificationsSection
        checkInReminder={profile.checkInReminder}
        reminderTime={profile.reminderTime}
        reminderDays={profile.reminderDays}
        weeklyDigest={profile.weeklyDigest}
        onUpdate={updateProfile}
      />

      <GoalsSection
        dailyCheckInGoal={profile.dailyCheckInGoal}
        weeklyToolGoal={profile.weeklyToolGoal}
        focusCategories={profile.focusCategories}
        onUpdate={updateProfile}
      />

      <PrivacySection
        dataRetentionDays={profile.dataRetentionDays}
        shareAnonymousData={profile.shareAnonymousData}
        onUpdate={updateProfile}
        onLogOut={logOut}
      />
    </div>
  );
}

// ============================================
// Section Components
// ============================================

function SectionCard({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--color-bg-card-hover)] transition-colors"
      >
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {title}
        </h3>
        <svg
          className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-[var(--color-border-subtle)]">
          <div className="pt-4 space-y-4">{children}</div>
        </div>
      )}
    </div>
  );
}

// --- Basic Info ---
function BasicInfoSection({
  displayName,
  email,
  onSave,
}: {
  displayName: string | null;
  email: string;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(displayName || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(name);
    } catch {
      // error handled by context
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Basic Info">
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">
          Display Name
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How should we greet you?"
            className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
          <button
            onClick={handleSave}
            disabled={saving || name === (displayName || '')}
            className="px-4 py-2 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-bg-primary)] text-sm font-medium lift-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">
          Email
        </label>
        <p className="text-sm text-[var(--color-text-secondary)]">{email}</p>
      </div>
    </SectionCard>
  );
}

// --- Appearance ---
function AppearanceSection({
  theme,
  onChange,
}: {
  theme: 'dark' | 'light' | 'system';
  onChange: (theme: 'dark' | 'light' | 'system') => Promise<void>;
}) {
  const options: { value: 'dark' | 'light' | 'system'; label: string }[] = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'System' },
  ];

  return (
    <SectionCard title="Appearance">
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-2">
          Theme
        </label>
        <div className="flex gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                theme === opt.value
                  ? 'bg-[var(--color-accent-muted)] border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-[var(--color-border-accent)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

// --- Notifications ---
function NotificationsSection({
  checkInReminder,
  reminderTime,
  reminderDays,
  weeklyDigest,
  onUpdate,
}: {
  checkInReminder: boolean;
  reminderTime: string;
  reminderDays: number[];
  weeklyDigest: boolean;
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
}) {
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  function toggleDay(day: number) {
    const newDays = reminderDays.includes(day)
      ? reminderDays.filter((d) => d !== day)
      : [...reminderDays, day].sort();
    onUpdate({ reminderDays: newDays });
  }

  return (
    <SectionCard title="Notifications" defaultOpen={false}>
      <ToggleRow
        label="Check-in Reminders"
        description="Get reminded to check in with yourself"
        checked={checkInReminder}
        onChange={(val) => onUpdate({ checkInReminder: val })}
      />

      {checkInReminder && (
        <>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">
              Reminder Time
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => onUpdate({ reminderTime: e.target.value })}
              className="px-3 py-2 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-2">
              Reminder Days
            </label>
            <div className="flex gap-1.5">
              {dayLabels.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                    reminderDays.includes(i)
                      ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)] border border-[var(--color-accent)]'
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <ToggleRow
        label="Weekly Digest"
        description="Receive a weekly summary of your emotional patterns (coming soon)"
        checked={weeklyDigest}
        onChange={(val) => onUpdate({ weeklyDigest: val })}
      />
    </SectionCard>
  );
}

// --- Goals ---
function GoalsSection({
  dailyCheckInGoal,
  weeklyToolGoal,
  focusCategories,
  onUpdate,
}: {
  dailyCheckInGoal: number;
  weeklyToolGoal: number;
  focusCategories: string[];
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <SectionCard title="Goals" defaultOpen={false}>
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">
          Daily Check-in Goal
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="1"
            max="5"
            value={dailyCheckInGoal}
            onChange={(e) =>
              onUpdate({ dailyCheckInGoal: parseInt(e.target.value) })
            }
            className="flex-1 accent-[var(--color-accent)]"
          />
          <span className="text-sm font-medium text-[var(--color-text-primary)] w-8 text-center">
            {dailyCheckInGoal}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">
          Weekly Tool Usage Goal
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="1"
            max="14"
            value={weeklyToolGoal}
            onChange={(e) =>
              onUpdate({ weeklyToolGoal: parseInt(e.target.value) })
            }
            className="flex-1 accent-[var(--color-accent)]"
          />
          <span className="text-sm font-medium text-[var(--color-text-primary)] w-8 text-center">
            {weeklyToolGoal}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-2">
          Focus Categories
        </label>
        <div className="flex flex-wrap gap-2">
          {modules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => {
                const newCats = focusCategories.includes(mod.id)
                  ? focusCategories.filter((c) => c !== mod.id)
                  : [...focusCategories, mod.id];
                onUpdate({ focusCategories: newCats });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                focusCategories.includes(mod.id)
                  ? 'bg-[var(--color-accent-muted)] border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-[var(--color-border-accent)]'
              }`}
            >
              {mod.name}
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

// --- Privacy & Data ---
function PrivacySection({
  dataRetentionDays,
  shareAnonymousData,
  onUpdate,
  onLogOut,
}: {
  dataRetentionDays: number | null;
  shareAnonymousData: boolean;
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
  onLogOut: () => Promise<void>;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `goblin-dbt-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteUserData(true);
      await onLogOut();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const retentionOptions = [
    { value: null, label: 'Keep forever' },
    { value: 90, label: '90 days' },
    { value: 180, label: '6 months' },
    { value: 365, label: '1 year' },
  ];

  return (
    <SectionCard title="Privacy & Data" defaultOpen={false}>
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-2">
          Data Retention
        </label>
        <div className="flex flex-wrap gap-2">
          {retentionOptions.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => onUpdate({ dataRetentionDays: opt.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                dataRetentionDays === opt.value
                  ? 'bg-[var(--color-accent-muted)] border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-[var(--color-border-accent)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <ToggleRow
        label="Anonymous Data Sharing"
        description="Help improve the app by sharing anonymized usage patterns (coming soon)"
        checked={shareAnonymousData}
        onChange={(val) => onUpdate({ shareAnonymousData: val })}
      />

      <div className="pt-2 flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] hover:text-[var(--color-text-primary)] disabled:opacity-40 transition-colors"
        >
          {exporting ? 'Exporting...' : 'Export My Data'}
        </button>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 rounded-lg border border-[var(--color-danger)]/30 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-danger)]">
              Are you sure? This cannot be undone.
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg bg-[var(--color-danger)] text-white text-xs font-medium hover:bg-[var(--color-danger)]/80 disabled:opacity-40 transition-colors"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="pt-2">
        <button
          onClick={onLogOut}
          className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Sign Out
        </button>
      </div>
    </SectionCard>
  );
}

// ============================================
// Shared Toggle Component
// ============================================

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </p>
        {description && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {description}
          </p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-[var(--color-accent-fill)]' : 'bg-[var(--color-border-accent)]'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform shadow-sm ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
