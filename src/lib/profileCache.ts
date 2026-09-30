/**
 * In-memory cache for profile slices (PR-P1). Never localStorage: profile-layer data (people, body
 * flags later) is sensitive, unlike the theme the settings cache paints from. Invalidated by a
 * higher User.profileVersion (any profile write returns it), by a different user (sign-out), and
 * when read after 10 minutes. Pure (a clock is passed in).
 */
export const PROFILE_CACHE_TTL_MS = 10 * 60_000;

interface Entry<T> { uid: string; version: number; at: number; value: T }

export class ProfileCache<T = unknown> {
  private entries = new Map<string, Entry<T>>();
  private uid: string | null = null;
  private minVersion = 0;

  /** Switch user: everything cached for another user is dropped. */
  setUser(uid: string | null): void {
    if (uid !== this.uid) {
      this.entries.clear();
      this.uid = uid;
      this.minVersion = 0;
    }
  }

  /** A profile write returned `version`: anything older is stale. */
  bump(version: number): void {
    if (version > this.minVersion) this.minVersion = version;
    for (const [k, e] of this.entries) if (e.version < this.minVersion) this.entries.delete(k);
  }

  get(key: string, now: number): T | null {
    const e = this.entries.get(key);
    if (!e || e.uid !== this.uid || e.version < this.minVersion || now - e.at > PROFILE_CACHE_TTL_MS) return null;
    return e.value;
  }

  set(key: string, version: number, value: T, now: number): void {
    if (!this.uid) return;
    this.entries.set(key, { uid: this.uid, version, at: now, value });
    if (version > this.minVersion) this.minVersion = version;
  }

  clear(): void {
    this.entries.clear();
    this.minVersion = 0;
  }
}

/** The app's one cache instance. */
export const profileCache = new ProfileCache();
