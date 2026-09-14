/**
 * Color palettes the user can choose in Profile > Appearance.
 *
 * Presentation metadata only. The actual token values live in
 * src/index.css under `:root[data-palette="<id>"]`; the swatches here are
 * the light-theme page, ink, action, high-unpleasant and low-pleasant
 * colors, copied so the picker can preview every palette without
 * switching the page. Keep them in sync with index.css.
 *
 * See docs/design/2026-09-14-palette-picker.md and docs/design/branding-kit.md.
 */

export type PaletteId = 'cool-steel' | 'slate-spruce' | 'signal' | 'giverny' | 'clouds';

export interface Palette {
  id: PaletteId;
  name: string;
  /** One line, shown under the name in the picker. */
  tagline: string;
  /** Light-theme preview colors: page, ink, action, high-unpleasant, low-pleasant. */
  swatch: [string, string, string, string, string];
}

export const DEFAULT_PALETTE: PaletteId = 'cool-steel';

export const palettes: Palette[] = [
  {
    id: 'cool-steel',
    name: 'Cool Steel',
    tagline: 'Fog grey and teal. The original.',
    swatch: ['#F6F7FA', '#1A1D27', '#127A5E', '#C4707A', '#6BA89A'],
  },
  {
    id: 'slate-spruce',
    name: 'Slate & Spruce',
    tagline: 'Steel neutrals, spruce green, coral and sage.',
    swatch: ['#F5F7F9', '#161B22', '#1F6B52', '#D9805F', '#6FAE98'],
  },
  {
    id: 'signal',
    name: 'Signal',
    tagline: 'Near-black ink, vivid corners, an ink button.',
    swatch: ['#F8F8F6', '#101014', '#16161C', '#E8663A', '#2FA36B'],
  },
  {
    id: 'giverny',
    name: 'Giverny',
    tagline: 'Water-lily blues and greens, pine ink, a mauve hairline.',
    swatch: ['#ECF6F5', '#132923', '#1B594D', '#EA7A5E', '#5EB663'],
  },
  {
    id: 'clouds',
    name: 'Water Lilies in the Clouds',
    tagline: 'Pale sky, navy ink, pink and peach, steel blue and mint.',
    swatch: ['#EEF3F5', '#232D37', '#303C4A', '#EFB3B2', '#AFD6C4'],
  },
];

export const PALETTE_IDS = palettes.map((p) => p.id);

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && (PALETTE_IDS as string[]).includes(value);
}

export function getPaletteById(id: string): Palette | undefined {
  return palettes.find((p) => p.id === id);
}
