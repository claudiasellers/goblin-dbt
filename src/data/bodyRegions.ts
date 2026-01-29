export interface BodyRegion {
  id: string;
  name: string;
  // Bounding box as percentages (0-1) of the body SVG
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export const bodyRegions: BodyRegion[] = [
  {
    id: 'head',
    name: 'Head',
    bounds: { minX: 0.35, maxX: 0.65, minY: 0, maxY: 0.12 },
  },
  {
    id: 'face',
    name: 'Face',
    bounds: { minX: 0.38, maxX: 0.62, minY: 0.04, maxY: 0.11 },
  },
  {
    id: 'neck',
    name: 'Neck',
    bounds: { minX: 0.4, maxX: 0.6, minY: 0.11, maxY: 0.15 },
  },
  {
    id: 'left-shoulder',
    name: 'Left Shoulder',
    bounds: { minX: 0.15, maxX: 0.35, minY: 0.14, maxY: 0.2 },
  },
  {
    id: 'right-shoulder',
    name: 'Right Shoulder',
    bounds: { minX: 0.65, maxX: 0.85, minY: 0.14, maxY: 0.2 },
  },
  {
    id: 'chest',
    name: 'Chest',
    bounds: { minX: 0.3, maxX: 0.7, minY: 0.15, maxY: 0.3 },
  },
  {
    id: 'left-arm',
    name: 'Left Arm',
    bounds: { minX: 0.05, maxX: 0.25, minY: 0.2, maxY: 0.45 },
  },
  {
    id: 'right-arm',
    name: 'Right Arm',
    bounds: { minX: 0.75, maxX: 0.95, minY: 0.2, maxY: 0.45 },
  },
  {
    id: 'stomach',
    name: 'Stomach',
    bounds: { minX: 0.32, maxX: 0.68, minY: 0.3, maxY: 0.42 },
  },
  {
    id: 'left-hand',
    name: 'Left Hand',
    bounds: { minX: 0, maxX: 0.15, minY: 0.42, maxY: 0.52 },
  },
  {
    id: 'right-hand',
    name: 'Right Hand',
    bounds: { minX: 0.85, maxX: 1, minY: 0.42, maxY: 0.52 },
  },
  {
    id: 'hips',
    name: 'Hips',
    bounds: { minX: 0.28, maxX: 0.72, minY: 0.42, maxY: 0.5 },
  },
  {
    id: 'left-thigh',
    name: 'Left Thigh',
    bounds: { minX: 0.28, maxX: 0.48, minY: 0.5, maxY: 0.68 },
  },
  {
    id: 'right-thigh',
    name: 'Right Thigh',
    bounds: { minX: 0.52, maxX: 0.72, minY: 0.5, maxY: 0.68 },
  },
  {
    id: 'left-knee',
    name: 'Left Knee',
    bounds: { minX: 0.3, maxX: 0.46, minY: 0.66, maxY: 0.72 },
  },
  {
    id: 'right-knee',
    name: 'Right Knee',
    bounds: { minX: 0.54, maxX: 0.7, minY: 0.66, maxY: 0.72 },
  },
  {
    id: 'left-calf',
    name: 'Left Calf',
    bounds: { minX: 0.3, maxX: 0.46, minY: 0.72, maxY: 0.88 },
  },
  {
    id: 'right-calf',
    name: 'Right Calf',
    bounds: { minX: 0.54, maxX: 0.7, minY: 0.72, maxY: 0.88 },
  },
  {
    id: 'left-foot',
    name: 'Left Foot',
    bounds: { minX: 0.28, maxX: 0.45, minY: 0.88, maxY: 1 },
  },
  {
    id: 'right-foot',
    name: 'Right Foot',
    bounds: { minX: 0.55, maxX: 0.72, minY: 0.88, maxY: 1 },
  },
];

export function getRegionFromPosition(x: number, y: number): BodyRegion | null {
  // Find the most specific region that contains this point
  // Sort by area (smallest first) to get the most specific match
  const matches = bodyRegions.filter(region => {
    const { minX, maxX, minY, maxY } = region.bounds;
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  });

  if (matches.length === 0) return null;

  // Return the smallest (most specific) region
  matches.sort((a, b) => {
    const areaA = (a.bounds.maxX - a.bounds.minX) * (a.bounds.maxY - a.bounds.minY);
    const areaB = (b.bounds.maxX - b.bounds.minX) * (b.bounds.maxY - b.bounds.minY);
    return areaA - areaB;
  });

  return matches[0];
}

export const sensationTags = [
  'Tension',
  'Warmth',
  'Tightness',
  'Pressure',
  'Tingling',
  'Heaviness',
  'Lightness',
  'Numbness',
  'Pain',
  'Pulsing',
  'Fluttering',
  'Clenching',
  'Relaxed',
  'Expanding',
  'Constricting',
  'Burning',
  'Cold',
  'Buzzing',
  'Ease',
  'Discomfort',
];
