/**
 * Rooms: the look the user picks in Profile > Appearance.
 *
 * A room is a complete, contrast-checked colour set. Each room owns its
 * light/dark mode (Velvet and Dusk are dark rooms; the rest are light), so
 * applying a room sets both `data-palette` and `data-theme` on <html>. The
 * saved `theme` field on the profile is kept for compatibility but no longer
 * drives the page.
 *
 * Presentation metadata only. Token values live in src/index.css under
 * `:root[data-palette="<id>"]`; the swatches here are copied from those blocks
 * (page, ink, action, high-unpleasant, low-pleasant) so the picker can preview
 * every room without switching the page. Keep them in sync with index.css,
 * with ROOM_MODES in index.html, and with the allow-list in
 * functions/src/index.ts (updateUserProfile).
 *
 * Design source: the "Goblin UI directions" canvas (The Den and its rooms).
 */

export type PaletteId = 'velvet' | 'dusk' | 'tinted' | 'pastel' | 'pastel-mix' | 'daylight';

export type RoomMode = 'light' | 'dark';

export interface Palette {
  id: PaletteId;
  name: string;
  /** One line, shown under the name in the picker. */
  tagline: string;
  mode: RoomMode;
  /** Preview colors: page, ink, action, high-unpleasant, low-pleasant. */
  swatch: [string, string, string, string, string];
}

export const DEFAULT_PALETTE: PaletteId = 'velvet';

export const palettes: Palette[] = [
  {
    id: 'velvet',
    name: 'Velvet',
    tagline: 'Deep plum walls and warm lamp light.',
    mode: 'dark',
    swatch: ['#231827', '#F5EBDF', '#E8B56E', '#EE6A55', '#3FBF8E'],
  },
  {
    id: 'dusk',
    name: 'Dusk',
    tagline: 'Cool slate, soft colour, one brass light.',
    mode: 'dark',
    swatch: ['#2E3542', '#EEF2F5', '#D8B48C', '#C98C7C', '#8DB5A2'],
  },
  {
    id: 'tinted',
    name: 'Tinted',
    tagline: 'Warm plaster with colour at the edges.',
    mode: 'light',
    swatch: ['#E8DFD1', '#2A241D', '#7A5B2E', '#C4705A', '#7CA886'],
  },
  {
    id: 'pastel',
    name: 'Pastel',
    tagline: 'Blush into sky, candy corners.',
    mode: 'light',
    swatch: ['#F6E6F0', '#2A2742', '#FFA898', '#FFA898', '#A2E3C0'],
  },
  {
    id: 'pastel-mix',
    name: 'Pastel mix',
    tagline: 'Warm and cool pastels together.',
    mode: 'light',
    swatch: ['#F6EEF0', '#2A2742', '#B3C1FF', '#FFA898', '#A2E3C0'],
  },
  {
    id: 'daylight',
    name: 'Daylight',
    tagline: 'Bright and clear, full-strength colour.',
    mode: 'light',
    swatch: ['#E6ECFD', '#191C35', '#2F3FA8', '#EE6A55', '#3FBF8E'],
  },
];

export const PALETTE_IDS = palettes.map((p) => p.id);

/** Palettes from before rooms, mapped to the nearest room so saved choices still land somewhere sensible. */
const LEGACY_PALETTES: Record<string, PaletteId> = {
  'cool-steel': 'tinted',
  'slate-spruce': 'dusk',
  signal: 'daylight',
  giverny: 'pastel-mix',
  clouds: 'pastel',
};

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && (PALETTE_IDS as string[]).includes(value);
}

/** Any stored value (current id, legacy id, missing) to a room id. */
export function resolvePalette(value: unknown): PaletteId {
  if (isPaletteId(value)) return value;
  if (typeof value === 'string' && value in LEGACY_PALETTES) return LEGACY_PALETTES[value];
  return DEFAULT_PALETTE;
}

export function getPaletteById(id: string): Palette | undefined {
  return palettes.find((p) => p.id === id);
}

/** Put a room on the page: sets data-palette and the room's own light/dark mode. */
export function applyRoom(value: unknown): PaletteId {
  const id = resolvePalette(value);
  const room = getPaletteById(id);
  const root = document.documentElement;
  root.dataset.palette = id;
  root.dataset.theme = room?.mode ?? 'dark';
  return id;
}
