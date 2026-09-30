/** Helper to convert Neo4j Integer to JS number */
export function toNumber(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null && 'toNumber' in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val) || null;
}

/** Neo4j Integer | number -> number (0 stays 0, unlike toNumber()). */
export function int(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && 'toNumber' in v) return (v as { toNumber: () => number }).toNumber();
  return Number.NaN;
}
