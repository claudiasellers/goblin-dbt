import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isAdmin, parseAdminUids, storageKey, toolLabel, type OfficialNames } from '../lib/officialNames';
import type { Tool } from '../data/tools';

const ADMINS = parseAdminUids(import.meta.env.VITE_ADMIN_UIDS);

// One store for the whole app, so flipping the switch on the Tools page relabels every mounted surface.
let on = false;
let onFor: string | null = null;
let names: OfficialNames | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

function read(key: string): boolean {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function write(key: string, value: boolean) {
  try { if (value) localStorage.setItem(key, '1'); else localStorage.removeItem(key); } catch { /* private window: this visit only */ }
}

/** The names file is its own chunk, fetched only once someone turns the switch on. */
function loadNames() {
  if (names || loading) return;
  loading = import('../data/content/tool-names.json')
    .then((m) => { names = (m.default as { content: { tools: OfficialNames } }).content.tools; emit(); })
    .catch(() => { loading = null; });
}

let snapshot: { on: boolean; names: OfficialNames | null } = { on, names };
const getSnapshot = () => {
  if (snapshot.on !== on || snapshot.names !== names) snapshot = { on, names };
  return snapshot;
};

export interface OfficialNamesState {
  /** Whether this person may see the switch at all (the admin allowlist, or a dev build). */
  allowed: boolean;
  /** The switch, as shown (always false for anyone not allowed). */
  on: boolean;
  setOn: (value: boolean) => void;
  /** The label a tool shows right now: the official name while on and loaded, else the friendly name. */
  label: (tool: Pick<Tool, 'id' | 'name' | 'module'>) => string;
  /** The official names while on and loaded (null otherwise). */
  names: OfficialNames | null;
}

/**
 * The signed-in uid, or null outside an AuthProvider (dev harnesses render shared cards without one).
 * useAuth reads its context before it throws, so the hook order is the same either way.
 */
function useUid(): string | null {
  try { return useAuth().user?.uid ?? null; } catch { return null; }
}

export function useOfficialNames(): OfficialNamesState {
  const uid = useUid();
  const allowed = isAdmin(uid, ADMINS, import.meta.env.DEV);
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const key = allowed ? storageKey(uid) : null;
    if (key === onFor) return;
    onFor = key;
    on = key ? read(key) : false;
    if (on) loadNames();
    emit();
  }, [allowed, uid]);

  const setOn = useCallback((value: boolean) => {
    if (!allowed) return;
    on = value;
    write(storageKey(uid), value);
    if (value) loadNames();
    emit();
  }, [allowed, uid]);

  const active = allowed && s.on ? s.names : null;
  const label = useCallback((tool: Pick<Tool, 'id' | 'name' | 'module'>) => toolLabel(tool, active), [active]);
  return { allowed, on: allowed && s.on, setOn, label, names: active };
}
