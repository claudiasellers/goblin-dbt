export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
    .join('');
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  );
}

export function bilinearInterpolate(
  row: number,
  col: number,
  maxRows: number,
  maxCols: number,
  corners: { tl: string; tr: string; bl: string; br: string },
): string {
  const x = maxCols > 1 ? col / (maxCols - 1) : 0.5;
  const y = maxRows > 1 ? row / (maxRows - 1) : 0.5;
  const top = lerpColor(corners.tl, corners.tr, x);
  const bottom = lerpColor(corners.bl, corners.br, x);
  return lerpColor(top, bottom, y);
}
