import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  getUserProfile,
  updateUserProfile as updateProfileApi,
  DEFAULT_PROFILE,
  type UserProfile,
} from '../services/neo4j';
import { DEFAULT_PALETTE } from '../data/palettes';

const PROFILE_CACHE_KEY = 'goblin-dbt-profile-cache';

function loadCachedProfile(userId: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(`${PROFILE_CACHE_KEY}-${userId}`);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function saveCachedProfile(userId: string, profile: UserProfile) {
  try {
    localStorage.setItem(`${PROFILE_CACHE_KEY}-${userId}`, JSON.stringify(profile));
  } catch { /* ignore */ }
}

interface UserProfileContextType {
  profile: UserProfile;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}

interface UserProfileProviderProps {
  children: ReactNode;
}

export function UserProfileProvider({ children }: UserProfileProviderProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reminderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(DEFAULT_PROFILE);
      return;
    }

    // Seed from cache immediately to avoid loading flash
    const cached = loadCachedProfile(user.uid);
    if (cached) {
      setProfile(cached);
      document.documentElement.dataset.theme = cached.theme;
      document.documentElement.dataset.palette = cached.palette ?? DEFAULT_PALETTE;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedProfile = await getUserProfile();
      setProfile(fetchedProfile);
      saveCachedProfile(user.uid, fetchedProfile);
    } catch (err) {
      // If the cloud function doesn't exist yet, fall back to defaults
      console.warn('Could not load profile, using defaults:', err);
      if (!cached) {
        setProfile({
          ...DEFAULT_PROFILE,
          displayName: user.displayName || null,
          email: user.email || '',
          photoURL: user.photoURL || null,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshProfile();
    } else {
      setProfile(DEFAULT_PROFILE);
    }
  }, [user, refreshProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      setError(null);
      try {
        await updateProfileApi(updates);
        setProfile((prev) => {
          const next = { ...prev, ...updates };
          if (user) saveCachedProfile(user.uid, next);
          return next;
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update profile';
        setError(message);
        throw err;
      }
    },
    [user]
  );

  // ============================================
  // Theme switching effect
  // ============================================
  useEffect(() => {
    document.documentElement.dataset.theme = profile.theme;
  }, [profile.theme]);

  // ============================================
  // Palette switching effect (see docs/design/2026-09-14-palette-picker.md)
  // ============================================
  useEffect(() => {
    document.documentElement.dataset.palette = profile.palette ?? DEFAULT_PALETTE;
  }, [profile.palette]);

  // ============================================
  // Check-in reminder effect (browser notifications)
  // ============================================
  useEffect(() => {
    // Clear any existing interval
    if (reminderIntervalRef.current) {
      clearInterval(reminderIntervalRef.current);
      reminderIntervalRef.current = null;
    }

    if (!profile.checkInReminder || !user) {
      return;
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Check every 60 seconds if it's time to send a reminder
    reminderIntervalRef.current = setInterval(() => {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
      }

      const now = new Date();
      const currentDay = now.getDay(); // 0=Sun, 6=Sat

      // Check if today is a reminder day
      if (!profile.reminderDays.includes(currentDay)) {
        return;
      }

      // Check if it's the right time (within the current minute)
      const [targetHour, targetMinute] = profile.reminderTime.split(':').map(Number);
      if (now.getHours() !== targetHour || now.getMinutes() !== targetMinute) {
        return;
      }

      // Prevent duplicate notifications using localStorage
      const lastNotifiedKey = 'goblin-dbt-last-reminder';
      const lastNotified = localStorage.getItem(lastNotifiedKey);
      const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      if (lastNotified === todayKey) {
        return;
      }

      localStorage.setItem(lastNotifiedKey, todayKey);

      new Notification('Time to check in', {
        body: 'How are you feeling right now? Take a moment to check in with yourself.',
        icon: '/favicon.ico',
        tag: 'checkin-reminder',
      });
    }, 60_000);

    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
        reminderIntervalRef.current = null;
      }
    };
  }, [profile.checkInReminder, profile.reminderTime, profile.reminderDays, user]);

  const value: UserProfileContextType = {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}
