// ============================================================
// BODY REGIONS TO THE SHARED PLACE IDS — body map step 2 (docs/design/body-map.md).
// Run AFTER deploying step 2's functions (the new saveCheckIn writes `side` and `sensationIds`):
//   node scripts/load-graph.mjs --file schema/migrations/2026-10-body-regions.cypher
//
// Older BodySensation records store the old figure's Title Case names ("Left Shoulder", "Chest").
// They become the place ids in src/data/bodyFigure.ts and the graph (`shoulders` + side `left`,
// `chest`), so History and Insights count one place, not two spellings. The Insights query
// collects DISTINCT regions per check-in, so a check-in that had both shoulders counts once.
// Thigh / knee / calf all become `legs`; Hips becomes `lower_back` (the nearest place).
// saveCheckIn applies the same table on every save (LEGACY_REGIONS in functions/src/checkin/validation.ts;
// a test keeps them identical), so an old client still open in a tab can't add old names afterwards.
// Idempotent: a second run matches nothing. Not in LOAD_ORDER (it touches user data).
// ============================================================

WITH {
  `Head`: ['head', null], `Face`: ['face', null], `Neck`: ['neck', null], `Chest`: ['chest', null],
  `Stomach`: ['stomach', null], `Hips`: ['lower_back', null],
  `Left Shoulder`: ['shoulders', 'left'], `Right Shoulder`: ['shoulders', 'right'],
  `Left Arm`: ['arms', 'left'], `Right Arm`: ['arms', 'right'],
  `Left Hand`: ['hands', 'left'], `Right Hand`: ['hands', 'right'],
  `Left Thigh`: ['legs', 'left'], `Right Thigh`: ['legs', 'right'],
  `Left Knee`: ['legs', 'left'], `Right Knee`: ['legs', 'right'],
  `Left Calf`: ['legs', 'left'], `Right Calf`: ['legs', 'right'],
  `Left Foot`: ['feet', 'left'], `Right Foot`: ['feet', 'right']
} AS m
MATCH (s:BodySensation)
WHERE s.region IN keys(m)
WITH s, m[s.region] AS to
SET s.side = coalesce(to[1], 'both'), s.legacyRegion = s.region, s.region = to[0]
RETURN count(s) AS sensationsMigrated;
