/**
 * Cool Down: which details panel to show (Wave-0 harm patch A0-1).
 *
 * Cold water on the face is gated behind a one-tap self-check until DT-01's
 * medical screen (BodySafetyFlags profile slice) ships. The answer lives for
 * the page visit only and is never stored.
 *
 * - 'check'     the self-check card (no timer)
 * - 'cold'      cold water on the face (breath-hold optional)
 * - 'exhale'    long, slow breath out instead of cold
 * - 'technique' any other technique, unchanged
 */
export type ColdCheck = 'unasked' | 'clear' | 'skip';
export type CoolDownView = 'none' | 'check' | 'cold' | 'exhale' | 'technique';

export function coolDownView(selectedId: string | null, check: ColdCheck): CoolDownView {
  if (!selectedId) return 'none';
  if (selectedId !== 'cold-water') return 'technique';
  return check === 'unasked' ? 'check' : check === 'clear' ? 'cold' : 'exhale';
}

/** The timer can only start from a view that shows an instruction. */
export function coolDownTimerAllowed(view: CoolDownView): boolean {
  return view === 'cold' || view === 'exhale' || view === 'technique';
}
