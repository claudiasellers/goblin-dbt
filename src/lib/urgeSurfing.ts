/**
 * Urge Surfing wave state (A0-2 peak fix; DT PRD §3.5 item 4).
 *
 * The peak used to start at a fixed 7 whatever the user entered, so a surf
 * that started at 3 could report a peak lower than its final reading, or a
 * peak nobody felt. The peak now starts at the reading the user starts with
 * and only ever rises. The slider itself stays until DT-05 rebuilds the tool.
 */
export interface UrgeWave {
  current: number;
  peak: number;
}

export function startWave(initial: number): UrgeWave {
  return { current: initial, peak: initial };
}

export function updateWave(wave: UrgeWave, reading: number): UrgeWave {
  return { current: reading, peak: Math.max(wave.peak, reading) };
}
