# Firestore User Data Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all user data (check-ins, tool usage, DEAR MAN sessions, user profiles) from Neo4j to Firestore, so Neo4j becomes a read-only knowledge graph ("the textbook") and Firestore owns all per-user behavioral data.

**Architecture:** Cloud Functions become the join layer — they read user data from Firestore (time-series queries, aggregations) and enrich with Neo4j lookups (pattern details, escalation paths, somatic narratives). The frontend service layer (`src/services/neo4j.ts`) stays unchanged — same function signatures, same return types. All changes are backend-only.

**Tech Stack:** Firebase Admin SDK (Firestore), existing Neo4j driver (read-only for knowledge graph), Firebase Cloud Functions v2.

---

## Guiding Principles

1. **Zero frontend changes.** Cloud Function signatures and return types stay identical. The frontend never knows the backend moved.
2. **Dual-write first, cut over later.** Phase 1 writes to both stores. Phase 2 reads from Firestore. Phase 3 stops writing to Neo4j. This makes every step independently reversible.
3. **Neo4j becomes read-only for knowledge.** After migration, Neo4j has zero user nodes. It only serves domain queries (`getStateAndTools`, `getOppositeActionContent`, `getDiscriminatingQuestions`, etc.).
4. **Body sensations are arrays on check-in docs**, not subcollections. A check-in has 0-3 sensations — subcollection overhead isn't justified.
5. **All timestamps stored as Firestore Timestamps**, not ISO strings. This ensures consistent time-range queries across all collections and avoids string comparison edge cases.
6. **Batch deletes chunked at 500.** Firestore batches are limited to 500 operations — all delete loops must chunk accordingly.

## Firestore Collection Structure

```
users/{userId}                          # Document: profile fields
users/{userId}/checkIns/{checkInId}     # Document: emotion, quadrant, intensity, body, pattern
users/{userId}/toolUsages/{usageId}     # Document: toolId, timestamp, outcome, linkedCheckInId
users/{userId}/dearManSessions/{id}     # Document: all session fields
```

## What Stays in Neo4j (unchanged)

All knowledge graph query functions are **not touched** by this migration:
- `getStateAndTools` — pattern matching + tool recommendations
- `getDiscriminatingQuestions` — branching questions
- `getRelatedEmotions` — neural substrate similarity
- `getQuickTools` — fallback tool recommendations
- `getOppositeActionContent` — OA protocol + action urges
- `getProblemSolveContent` — problem-solve protocol
- `getDearManContent` — DEAR MAN curated options
- `getDearManDebriefContent` — debrief reflection options
- `getDearManReflection` — personalized reflection + cope-ahead
- `initializeSchema` — graph schema setup

## What Moves to Firestore

| Cloud Function | Currently | After Migration |
|---|---|---|
| `ensureUserExists` | Creates User node in Neo4j | Creates doc at `users/{userId}` in Firestore |
| `saveCheckIn` | Creates CheckIn + BodySensation nodes in Neo4j | Writes doc to `users/{userId}/checkIns/{id}` |
| `getCheckInsByUser` | Cypher query on User→CheckIn→BodySensation | Firestore query on subcollection, ordered by timestamp |
| `trackToolUsage` | Creates ToolUsage node + FOLLOWED_CHECKIN edge | Writes doc to `users/{userId}/toolUsages/{id}` |
| `recordToolOutcome` | Updates ToolUsage node in Neo4j | Updates most recent unrated doc in Firestore |
| `getWeeklyToolUsageCount` | Cypher count query | Firestore query with timestamp filter |
| `getInsightsData` | 3 parallel Neo4j queries + sequential graph lookups | Firestore for user data + Neo4j for pattern/narrative enrichment |
| `getUserProfile` | Reads User node properties | Reads `users/{userId}` doc |
| `updateUserProfile` | Updates User node properties | Updates `users/{userId}` doc |
| `deleteUserData` | DETACH DELETE on User + CheckIn + BodySensation | Recursive delete on `users/{userId}` subcollections |
| `exportUserData` | Cypher query returning all user nodes | Firestore reads across subcollections |
| `saveDearManSession` | Creates DearManSession node | Writes doc to `users/{userId}/dearManSessions/{id}` |
| `getDearManSessions` | Cypher query on User→DearManSession | Firestore query on subcollection |

## File Structure

All changes are in **one file**: `functions/src/index.ts`. This is the existing monolith — we follow the established pattern rather than restructuring.

**Modified:**
- `functions/src/index.ts` — Rewrite 13 Cloud Functions from Neo4j to Firestore (knowledge graph functions untouched)

**No new files.** `firebase-admin` is already a dependency and includes Firestore. No additional packages needed.

---

## Phase 1: Dual-Write Foundation

The goal of Phase 1 is to start writing user data to Firestore alongside Neo4j, with zero impact on reads. Every existing code path continues to work. At the end of Phase 1, Firestore has a copy of all new user data.

### Task 1: Add Firestore instance + helper

**Files:**
- Modify: `functions/src/index.ts:1-28` (top of file, after admin init)

- [ ] **Step 1: Add Firestore db reference after the admin.initializeApp() block**

After line 9 (`admin.initializeApp()`), add:

```typescript
const db = admin.firestore();
```

That's it. `firebase-admin` is already imported and initialized. Firestore is included — no new dependencies.

- [ ] **Step 2: Verify the functions build**

Run: `cd functions && npm run build`
Expected: Clean compile, no errors.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: add Firestore db instance for user data migration"
```

---

### Task 2: Dual-write `ensureUserExists`

**Files:**
- Modify: `functions/src/index.ts:213-242` (`ensureUserExists` function)

- [ ] **Step 1: Add Firestore write after the Neo4j MERGE**

Replace the current `ensureUserExists` function body (inside the try block, after the Neo4j `session.run`) with a version that also writes to Firestore. The Neo4j write stays — we're dual-writing.

After the existing `await session.run(...)` block (line 226-232), add before `return { success: true }`:

```typescript
      // Dual-write: also create/update Firestore user doc
      await db.doc(`users/${userId}`).set(
        { email, createdAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
```

- [ ] **Step 2: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: dual-write ensureUserExists to Firestore"
```

---

### Task 3: Dual-write `saveCheckIn`

**Files:**
- Modify: `functions/src/index.ts:62-137` (`saveCheckIn` function)

- [ ] **Step 1: Add Firestore write after the Neo4j CREATE**

After the existing Neo4j `session.run(...)` call and before `return { id }`, add a Firestore write using the same ID that Neo4j generated:

```typescript
      const id = result.records[0]?.get('id') || '';

      // Dual-write: save to Firestore
      if (id) {
        await db.doc(`users/${userId}/checkIns/${id}`).set({
          emotion: checkIn.emotion,
          quadrant: checkIn.quadrant,
          intensityX: checkIn.intensity?.x ?? 0,
          intensityY: checkIn.intensity?.y ?? 0,
          note: checkIn.note || '',
          bodySensations: (checkIn.bodySensations || []).map(s => ({
            x: s.x,
            y: s.y,
            region: s.region,
            intensityX: s.intensity.x,
            intensityY: s.intensity.y,
            tags: s.tags,
          })),
          activationPatternId: checkIn.activationPatternId || null,
          confidence: checkIn.confidence ?? null,
          timestamp: admin.firestore.Timestamp.fromDate(
            new Date(checkIn.timestamp || new Date().toISOString())
          ),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { id };
```

Note: remove the existing `const id = ...` and `return { id }` lines and replace with the block above.

- [ ] **Step 2: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: dual-write saveCheckIn to Firestore"
```

---

### Task 4: Dual-write `trackToolUsage`

**Files:**
- Modify: `functions/src/index.ts:570-614` (`trackToolUsage` function)

- [ ] **Step 1: Add Firestore write after the Neo4j CREATE**

After the existing `session.run(...)` and before `return { success: true }`, add:

```typescript
      // Dual-write: save to Firestore
      // Find the most recent check-in to link
      const recentCheckIn = await db
        .collection(`users/${userId}/checkIns`)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      const linkedCheckInId = recentCheckIn.docs[0]?.id || null;

      await db.collection(`users/${userId}/toolUsages`).add({
        toolId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        outcome: null,
        outcomeTimestamp: null,
        linkedCheckInId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
```

- [ ] **Step 2: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: dual-write trackToolUsage to Firestore"
```

---

### Task 5: Dual-write `recordToolOutcome`

**Files:**
- Modify: `functions/src/index.ts:658-700` (`recordToolOutcome` function)

- [ ] **Step 1: Add Firestore update after the Neo4j SET**

After the existing `session.run(...)` and before `return { success: true }`, add:

```typescript
      // Dual-write: update most recent unrated tool usage in Firestore
      const unratedSnap = await db
        .collection(`users/${userId}/toolUsages`)
        .where('outcome', '==', null)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!unratedSnap.empty) {
        await unratedSnap.docs[0].ref.update({
          outcome,
          outcomeTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
```

- [ ] **Step 2: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: dual-write recordToolOutcome to Firestore"
```

---

### Task 6: Dual-write `saveDearManSession`

**Files:**
- Modify: `functions/src/index.ts:2294-2383` (`saveDearManSession` function)

- [ ] **Step 1: Add Firestore write after the Neo4j CREATE**

After the existing `session.run(...)` and before `return { success: true }`, add:

```typescript
      // Dual-write: save to Firestore
      await db.collection(`users/${userId}/dearManSessions`).add({
        type: data.type,
        relationshipType: data.relationshipType || '',
        situationType: data.situationType || '',
        priorities: data.priorities || [],
        barriers: data.barriers || [],
        describeId: data.describeId || null,
        describeCustom: data.describeCustom || '',
        feelings: data.feelings || [],
        assertId: data.assertId || null,
        assertCustom: data.assertCustom || '',
        reinforceIds: data.reinforceIds || [],
        anchorPhrase: data.anchorPhrase || '',
        middleGroundId: data.middleGroundId || null,
        middleGroundCustom: data.middleGroundCustom || '',
        walkAwayId: data.walkAwayId || null,
        walkAwayCustom: data.walkAwayCustom || '',
        debriefOverall: data.debriefOverall || null,
        debriefWentWell: data.debriefWentWell || [],
        debriefToChange: data.debriefToChange || [],
        debriefCurrentFeelings: data.debriefCurrentFeelings || [],
        turningPointIds: data.turningPointIds || [],
        momentResponseIds: data.momentResponseIds || [],
        bodySignalIds: data.bodySignalIds || [],
        thoughtPatternIds: data.thoughtPatternIds || [],
        underneathIds: data.underneathIds || [],
        copeAheadId: data.copeAheadId || null,
        reflectionLanded: data.reflectionLanded || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
```

- [ ] **Step 2: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: dual-write saveDearManSession to Firestore"
```

---

### Task 7: Dual-write `updateUserProfile`

**Files:**
- Modify: `functions/src/index.ts:385-453` (`updateUserProfile` function)

- [ ] **Step 1: Add Firestore update after the Neo4j SET**

After the existing Neo4j `session.run(...)` call (the one that does `SET ${setClauses}`) and before the Firebase Auth sync block, add:

```typescript
      // Dual-write: update Firestore user doc
      await db.doc(`users/${userId}`).set(
        { ...cleanUpdates, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
```

- [ ] **Step 2: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: dual-write updateUserProfile to Firestore"
```

---

### Task 8: Deploy Phase 1 and verify dual-writes

- [ ] **Step 1: Deploy Cloud Functions**

Run: `firebase deploy --only functions`
Expected: All functions deploy successfully.

- [ ] **Step 2: Manually test by doing a check-in in the app**

Do a full check-in flow. Then verify data exists in both stores:
- Check Neo4j via existing history page (should work as before)
- Check Firestore via Firebase Console → Firestore → `users/{yourUid}/checkIns`

- [ ] **Step 3: Commit any fixes if needed**

---

### Task 9: Update `firebase.json` with Firestore config

**Files:**
- Modify: `firebase.json`

- [ ] **Step 1: Add Firestore section to firebase.json**

The current `firebase.json` has no `firestore` key. Add it so Firestore rules and indexes can be deployed:

```json
{
  "functions": { ... },
  "hosting": { ... },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

- [ ] **Step 2: Create minimal `firestore.rules`**

All access is through Cloud Functions using Admin SDK (which bypasses rules). Lock down direct client access:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 3: Create empty `firestore.indexes.json`**

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

We'll add composite indexes later when needed.

- [ ] **Step 4: Commit**

```bash
git add firebase.json firestore.rules firestore.indexes.json
git commit -m "feat: add Firestore config, rules, and indexes files"
```

---

### Task 10: Migrate existing historical data from Neo4j to Firestore

This is a **one-time migration** that copies all existing user data from Neo4j to Firestore. Without this, users would lose their history when reads switch to Firestore.

**Files:**
- Create: `scripts/migrate-neo4j-to-firestore.ts`

- [ ] **Step 1: Write the migration script**

Create `scripts/migrate-neo4j-to-firestore.ts`. This is a standalone script run once via `npx ts-node` (or compiled and run with node). It needs Firebase Admin + Neo4j driver.

The script should:
1. Initialize Firebase Admin with service account credentials
2. Connect to Neo4j
3. Query all User nodes → create `users/{userId}` docs
4. For each user, query CheckIn nodes + BodySensation nodes → write to `users/{userId}/checkIns/{id}` with bodySensations as arrays, timestamp as Firestore Timestamp
5. For each user, query ToolUsage nodes → write to `users/{userId}/toolUsages/{id}`
6. For each user, query DearManSession nodes → write to `users/{userId}/dearManSessions/{id}`
7. Use batched writes (max 500 per batch) for efficiency
8. Log progress: "Migrated user X: N check-ins, M tool usages, K sessions"

Key details:
- Convert Neo4j `datetime()` values to Firestore Timestamps
- Map Neo4j's `FOLLOWED_CHECKIN` relationship to `linkedCheckInId` on tool usage docs
- Handle the `MATCHED_PATTERN` relationship by reading `activationPatternId` from CheckIn node properties (already denormalized)

- [ ] **Step 2: Run the migration script against your Neo4j Aura instance**

This is a read-only operation against Neo4j (it only creates data in Firestore). Safe to run.

- [ ] **Step 3: Verify migration by spot-checking a few users in Firebase Console**

Compare check-in counts, oldest/newest timestamps, etc.

- [ ] **Step 4: Commit the script (for documentation)**

```bash
git add scripts/migrate-neo4j-to-firestore.ts
git commit -m "feat: add one-time Neo4j to Firestore migration script"
```

---

## Phase 2: Switch Reads to Firestore

The goal of Phase 2 is to redirect all read operations from Neo4j to Firestore. After this phase, Neo4j is only queried for knowledge graph lookups (patterns, narratives, escalation paths). Every read function returns the same shape — the frontend sees no change.

**Prerequisites:** Task 10 (historical data migration) must be complete before deploying Phase 2. Otherwise users lose their history.

### Task 11: Rewrite `getCheckInsByUser` to read from Firestore

**Files:**
- Modify: `functions/src/index.ts:142-208` (`getCheckInsByUser` function)

- [ ] **Step 1: Replace the Neo4j query with a Firestore query**

Replace the entire try block contents with:

```typescript
      const snap = await db
        .collection(`users/${userId}/checkIns`)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const checkIns = snap.docs.map(doc => {
        const d = doc.data();
        // Convert Firestore Timestamp to ISO string for frontend
        const ts = d.timestamp?.toDate?.() || new Date(d.timestamp);
        return {
          id: doc.id,
          userId,
          emotion: d.emotion,
          quadrant: d.quadrant,
          intensity: { x: d.intensityX ?? 0, y: d.intensityY ?? 0 },
          bodySensations: (d.bodySensations || []).map((s: Record<string, unknown>) => ({
            x: s.x,
            y: s.y,
            region: s.region,
            tags: s.tags || [],
            intensity: { x: s.intensityX ?? 0, y: s.intensityY ?? 0 },
          })),
          note: d.note || '',
          timestamp: ts.toISOString(),
          activationPatternId: d.activationPatternId || null,
          confidence: d.confidence ?? null,
        };
      });

      return { checkIns };
```

This function no longer needs a Neo4j session. Remove the `const session = getDriver().session()` and the `finally { await session.close() }` block. **However**, keep `secrets: [neo4jUri, neo4jUser, neo4jPassword]` in the onCall config for now — removing secrets from a function that previously had them can cause cold-start issues during rollout. We'll clean that up in Phase 3.

- [ ] **Step 2: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: read getCheckInsByUser from Firestore"
```

---

### Task 12: Rewrite `getUserProfile` to read from Firestore

**Files:**
- Modify: `functions/src/index.ts:311-380` (`getUserProfile` function)

- [ ] **Step 1: Replace Neo4j read with Firestore read**

Replace the try block contents with:

```typescript
      const userDoc = await db.doc(`users/${userId}`).get();
      const userData = userDoc.data() || {};

      const profile = {
        ...PROFILE_DEFAULTS,
        email,
        ...userData,
        // Ensure correct types for numeric fields
        dailyCheckInGoal: Number(userData.dailyCheckInGoal) || PROFILE_DEFAULTS.dailyCheckInGoal,
        weeklyToolGoal: Number(userData.weeklyToolGoal) || PROFILE_DEFAULTS.weeklyToolGoal,
        dataRetentionDays: userData.dataRetentionDays != null ? Number(userData.dataRetentionDays) : null,
        reminderDays: userData.reminderDays ?? PROFILE_DEFAULTS.reminderDays,
        focusCategories: userData.focusCategories ?? PROFILE_DEFAULTS.focusCategories,
      };

      // Remove internal fields
      delete (profile as Record<string, unknown>).createdAt;
      delete (profile as Record<string, unknown>).updatedAt;

      // Enforce data retention: delete check-ins older than dataRetentionDays
      const retentionDays = profile.dataRetentionDays;

      if (retentionDays != null && retentionDays > 0) {
        try {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - retentionDays);
          const oldCheckIns = await db
            .collection(`users/${userId}/checkIns`)
            .where('timestamp', '<', cutoff)
            .get();

          // Chunk deletes at 500 (Firestore batch limit)
          for (let i = 0; i < oldCheckIns.docs.length; i += 500) {
            const batch = db.batch();
            oldCheckIns.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          }
        } catch (cleanupErr) {
          console.warn('Data retention cleanup failed:', cleanupErr);
        }
      }

      return { profile };
```

Remove the Neo4j session and finally block. Keep the secrets config for now.

- [ ] **Step 2: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: read getUserProfile from Firestore"
```

---

### Task 13: Rewrite `getWeeklyToolUsageCount` to read from Firestore

**Files:**
- Modify: `functions/src/index.ts:619-648` (`getWeeklyToolUsageCount` function)

- [ ] **Step 1: Replace Neo4j count query with Firestore query**

Replace the try block contents with:

```typescript
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const snap = await db
        .collection(`users/${userId}/toolUsages`)
        .where('createdAt', '>=', sevenDaysAgo)
        .get();

      return { count: snap.size };
```

Remove Neo4j session + finally block. Keep secrets config.

- [ ] **Step 2: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: read getWeeklyToolUsageCount from Firestore"
```

---

### Task 14: Rewrite `getDearManSessions` to read from Firestore

**Files:**
- Modify: `functions/src/index.ts:2631-2707` (`getDearManSessions` function)

- [ ] **Step 1: Replace Neo4j query with Firestore query**

Replace the try block contents with:

```typescript
      const snap = await db
        .collection(`users/${userId}/dearManSessions`)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const sessions = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          type: d.type,
          relationshipType: d.relationshipType || '',
          situationType: d.situationType || '',
          priorities: d.priorities || [],
          barriers: d.barriers || [],
          describeId: d.describeId || null,
          describeCustom: d.describeCustom || '',
          feelings: d.feelings || [],
          assertId: d.assertId || null,
          assertCustom: d.assertCustom || '',
          reinforceIds: d.reinforceIds || [],
          anchorPhrase: d.anchorPhrase || '',
          middleGroundId: d.middleGroundId || null,
          middleGroundCustom: d.middleGroundCustom || '',
          walkAwayId: d.walkAwayId || null,
          walkAwayCustom: d.walkAwayCustom || '',
          debriefOverall: d.debriefOverall || null,
          debriefWentWell: d.debriefWentWell || [],
          debriefToChange: d.debriefToChange || [],
          debriefCurrentFeelings: d.debriefCurrentFeelings || [],
          createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      });

      return { sessions };
```

Remove Neo4j session + finally block. Keep secrets config.

- [ ] **Step 2: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: read getDearManSessions from Firestore"
```

---

### Task 15: Rewrite `exportUserData` to read from Firestore

**Note:** This is an intentional enhancement — the Firestore version exports tool usages and DEAR MAN sessions in addition to check-ins. The current Neo4j version only exports check-ins. The frontend types this as `Record<string, unknown>` so the added fields won't break anything.

**Files:**
- Modify: `functions/src/index.ts:501-551` (`exportUserData` function)

- [ ] **Step 1: Replace Neo4j queries with Firestore reads**

Replace the try block contents with:

```typescript
      // Get user profile
      const userDoc = await db.doc(`users/${userId}`).get();
      const userProfile = userDoc.data() || {};

      // Get all check-ins
      const checkInsSnap = await db
        .collection(`users/${userId}/checkIns`)
        .orderBy('timestamp', 'desc')
        .get();

      const checkIns = checkInsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get all tool usages
      const toolSnap = await db
        .collection(`users/${userId}/toolUsages`)
        .orderBy('createdAt', 'desc')
        .get();

      const toolUsages = toolSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get all DEAR MAN sessions
      const dearManSnap = await db
        .collection(`users/${userId}/dearManSessions`)
        .orderBy('createdAt', 'desc')
        .get();

      const dearManSessions = dearManSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        data: {
          exportedAt: new Date().toISOString(),
          profile: userProfile,
          checkIns,
          toolUsages,
          dearManSessions,
          totalCheckIns: checkIns.length,
        },
      };
```

Remove Neo4j session + finally block. Keep secrets config.

- [ ] **Step 2: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: read exportUserData from Firestore"
```

---

### Task 16: Rewrite `deleteUserData` to delete from Firestore

**Files:**
- Modify: `functions/src/index.ts:458-496` (`deleteUserData` function)

- [ ] **Step 1: Replace Neo4j DETACH DELETE with Firestore recursive delete**

Replace the try block contents with:

```typescript
      // Delete all subcollections (chunked at 500 — Firestore batch limit)
      const subcollections = ['checkIns', 'toolUsages', 'dearManSessions'];
      for (const sub of subcollections) {
        const snap = await db.collection(`users/${userId}/${sub}`).get();
        const chunks = [];
        for (let i = 0; i < snap.docs.length; i += 500) {
          chunks.push(snap.docs.slice(i, i + 500));
        }
        for (const chunk of chunks) {
          const batch = db.batch();
          chunk.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        }
      }

      // Delete the user document itself
      await db.doc(`users/${userId}`).delete();

      // Also clean up Neo4j (for any historical data still there)
      const session = getDriver().session();
      try {
        await session.run(
          `
          MATCH (u:User {id: $userId})-[:LOGGED]->(c:CheckIn)
          OPTIONAL MATCH (c)-[:SENSED]->(s:BodySensation)
          DETACH DELETE s, c
          `,
          { userId }
        );
        await session.run(
          `
          MATCH (u:User {id: $userId})-[:USED_TOOL]->(tu:ToolUsage)
          DETACH DELETE tu
          `,
          { userId }
        );
        await session.run(
          `
          MATCH (u:User {id: $userId})-[:COMPLETED_SESSION]->(s:DearManSession)
          DETACH DELETE s
          `,
          { userId }
        );
        await session.run(
          `MATCH (u:User {id: $userId}) DETACH DELETE u`,
          { userId }
        );
      } finally {
        await session.close();
      }

      return { success: true };
```

Note: We delete from BOTH stores here. Neo4j cleanup handles any historical data that was written before Phase 1. This is important for GDPR compliance.

- [ ] **Step 2: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: deleteUserData from both Firestore and Neo4j"
```

---

### Task 17: Rewrite `getInsightsData` to use Firestore + Neo4j

This is the most complex function. It currently runs 3 parallel Neo4j queries for user data, then sequential Neo4j queries for knowledge enrichment. The new version fetches user data from Firestore, computes aggregates in JS (same logic), then queries Neo4j only for pattern/narrative enrichment.

**Files:**
- Modify: `functions/src/index.ts:711-1279` (`getInsightsData` function)

- [ ] **Step 1: Replace the 3 parallel Neo4j queries with Firestore queries**

Replace the parallel query block (lines 739-789) with:

```typescript
      // Build time filter
      const timeFilterDays = timeRange === '7d' ? 7 : timeRange === 'all' ? null : 30;
      const checkInsRef = db.collection(`users/${userId}/checkIns`);
      const toolUsagesRef = db.collection(`users/${userId}/toolUsages`);

      let checkInsQuery: FirebaseFirestore.Query;
      let toolUsagesQuery: FirebaseFirestore.Query;

      if (timeFilterDays !== null) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - timeFilterDays);
        // where() BEFORE orderBy() — Firestore requirement
        checkInsQuery = checkInsRef.where('timestamp', '>=', cutoff).orderBy('timestamp', 'desc');
        toolUsagesQuery = toolUsagesRef.where('createdAt', '>=', cutoff).orderBy('createdAt', 'desc');
      } else {
        checkInsQuery = checkInsRef.orderBy('timestamp', 'desc');
        toolUsagesQuery = toolUsagesRef.orderBy('createdAt', 'desc');
      }

      const [checkInsSnap, toolUsagesSnap] = await Promise.all([
        checkInsQuery.get(),
        toolUsagesQuery.get(),
      ]);
```

- [ ] **Step 2: Replace the record parsing block with Firestore doc parsing**

Replace the checkIns parsing (lines 792-803) with:

```typescript
      const checkIns = checkInsSnap.docs.map(doc => {
        const d = doc.data();
        const bodyRegions = (d.bodySensations || [])
          .map((s: Record<string, unknown>) => s.region as string)
          .filter(Boolean);
        const sensationTags = (d.bodySensations || [])
          .flatMap((s: Record<string, unknown>) => (s.tags as string[]) || [])
          .filter(Boolean);

        return {
          id: doc.id,
          timestamp: d.timestamp,
          emotion: d.emotion,
          quadrant: d.quadrant,
          intensityX: d.intensityX ?? 0,
          intensityY: d.intensityY ?? 0,
          activationPatternId: d.activationPatternId || null,
          bodyRegions,
          sensationTags,
          dbtParent: null as string | null, // We'll enrich from Neo4j if needed
        };
      });
```

Replace the toolUsages parsing (lines 806-812) with:

```typescript
      const toolUsages = toolUsagesSnap.docs.map(doc => {
        const d = doc.data();
        return {
          toolId: d.toolId,
          outcome: d.outcome || null,
          timestamp: d.createdAt?.toDate?.()?.toISOString() || d.timestamp || '',
          patternId: null as string | null, // Will be derived from linked check-in
          checkInId: d.linkedCheckInId || null,
        };
      });
```

- [ ] **Step 3: Replace the continuity prompt query**

Replace the continuity prompt parsing (lines 815-821) with:

```typescript
      // Continuity prompt: most recent unrated tool usage with a linked check-in
      let continuityPrompt = null;
      const unratedSnap = await db
        .collection(`users/${userId}/toolUsages`)
        .where('outcome', '==', null)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!unratedSnap.empty) {
        const tuDoc = unratedSnap.docs[0].data();
        if (tuDoc.linkedCheckInId) {
          const ciDoc = await db.doc(`users/${userId}/checkIns/${tuDoc.linkedCheckInId}`).get();
          if (ciDoc.exists) {
            const ci = ciDoc.data()!;
            continuityPrompt = {
              toolId: tuDoc.toolId,
              toolTimestamp: tuDoc.createdAt?.toDate?.()?.toISOString() || '',
              checkInEmotion: ci.emotion,
              checkInTimestamp: ci.timestamp,
            };
          }
        }
      }
```

- [ ] **Step 4: Remove the parallel Neo4j session cleanup and replace with a single session for knowledge queries**

Replace lines 823-826 with:

```typescript
      // Open a single Neo4j session for knowledge graph enrichment
      const session = getDriver().session();
```

- [ ] **Step 5: Enrich tool usages with pattern IDs from linked check-ins**

After the `continuityPrompt` block, before the thresholds section, add:

```typescript
      // Enrich tool usages with patternId from their linked check-in
      const checkInMap = new Map(checkIns.map(ci => [ci.id, ci]));
      for (const tu of toolUsages) {
        if (tu.checkInId && checkInMap.has(tu.checkInId)) {
          tu.patternId = checkInMap.get(tu.checkInId)!.activationPatternId;
        }
      }
```

- [ ] **Step 6: Keep ALL existing aggregation logic unchanged**

The entire block from the thresholds section (line 829) through the `return` statement (line 1266) stays exactly the same. It already operates on the `checkIns` and `toolUsages` arrays — it doesn't care where they came from.

The only Neo4j queries that remain are the knowledge graph lookups:
- Co-occurrence formulation: `MATCH (p1:ActivationPattern)...CO_OCCURS_WITH...`
- Single pattern formulation: `MATCH (p:ActivationPattern {id: $patternId})...`
- Escalation path: `MATCH (p1:ActivationPattern)...CAN_ESCALATE_TO...`
- Somatic narrative: `MATCH (ap:ActivationPattern)...somatic_narrative...`

These stay because they query the knowledge graph, not user data.

- [ ] **Step 7: Update the finally block**

Replace the multi-session cleanup with:

```typescript
    } catch (error) {
      console.error('Error getting insights data:', error);
      throw new HttpsError('internal', 'Failed to get insights data');
    } finally {
      if (session) await session.close().catch(() => {});
    }
```

Note: `session` here refers to the single Neo4j session opened in Step 4 for knowledge queries. The variable name `seqSession` is no longer needed.

- [ ] **Step 8: Handle dbtParent enrichment**

The current code gets `dbtParent` from Neo4j in the check-ins query (`OPTIONAL MATCH (e:Emotion {id: c.emotion})`). We need this for the emotion family breadth growth insight. Add a batch lookup after enriching tool usages:

```typescript
      // Enrich check-ins with dbtParent from Neo4j
      const uniqueEmotions = [...new Set(checkIns.map(ci => ci.emotion).filter(Boolean))];
      if (uniqueEmotions.length > 0) {
        const emotionResult = await session.run(
          `UNWIND $emotionIds AS eid
           MATCH (e:Emotion {id: eid})
           RETURN e.id AS id, e.dbtParent AS dbtParent`,
          { emotionIds: uniqueEmotions }
        );
        const dbtParentMap = new Map<string, string>();
        for (const rec of emotionResult.records) {
          const parent = rec.get('dbtParent');
          if (parent) dbtParentMap.set(rec.get('id'), parent);
        }
        for (const ci of checkIns) {
          ci.dbtParent = dbtParentMap.get(ci.emotion) || null;
        }
      }
```

Place this right after the `checkInMap` / toolUsage enrichment block, before the thresholds.

- [ ] **Step 9: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 10: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: rewrite getInsightsData to read user data from Firestore"
```

---

### Task 18: Deploy Phase 2 and verify reads

- [ ] **Step 1: Deploy**

Run: `firebase deploy --only functions`
Expected: All functions deploy successfully.

- [ ] **Step 2: Test the full flow**

1. Do a check-in — should save and show result (tests `saveCheckIn` dual-write + `getStateAndTools` unchanged)
2. Check history page — should show past check-ins (tests `getCheckInsByUser` Firestore read)
3. Check insights page — should show formulation, growth, etc. (tests `getInsightsData` hybrid query)
4. Open a tool — should track usage (tests `trackToolUsage` dual-write)
5. Rate a tool — should record outcome (tests `recordToolOutcome` dual-write)
6. Check profile page — should load settings (tests `getUserProfile` Firestore read)

- [ ] **Step 3: Commit any fixes**

---

## Phase 3: Stop Writing to Neo4j + Cleanup

The goal of Phase 3 is to remove all Neo4j writes for user data. After this phase, Neo4j is a pure read-only knowledge graph.

### Task 19: Remove Neo4j writes from all user data functions

**Files:**
- Modify: `functions/src/index.ts` — six functions

- [ ] **Step 1: Rewrite `ensureUserExists` — Firestore only**

Remove the Neo4j session entirely. The function becomes:

```typescript
export const ensureUserExists = onCall(
  {},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const email = request.auth.token.email || '';

    await db.doc(`users/${userId}`).set(
      { email, createdAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    return { success: true };
  }
);
```

Note: No more `secrets` config needed — this function doesn't touch Neo4j.

- [ ] **Step 2: Rewrite `saveCheckIn` — Firestore only**

Remove the Neo4j session. The function becomes:

```typescript
export const saveCheckIn = onCall(
  {},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const checkIn = request.data as CheckInData;

    if (!checkIn.emotion || !checkIn.quadrant) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
      const docRef = db.collection(`users/${userId}/checkIns`).doc();
      await docRef.set({
        emotion: checkIn.emotion,
        quadrant: checkIn.quadrant,
        intensityX: checkIn.intensity?.x ?? 0,
        intensityY: checkIn.intensity?.y ?? 0,
        note: checkIn.note || '',
        bodySensations: (checkIn.bodySensations || []).map(s => ({
          x: s.x,
          y: s.y,
          region: s.region,
          intensityX: s.intensity.x,
          intensityY: s.intensity.y,
          tags: s.tags,
        })),
        activationPatternId: checkIn.activationPatternId || null,
        confidence: checkIn.confidence ?? null,
        timestamp: admin.firestore.Timestamp.fromDate(
          new Date(checkIn.timestamp || new Date().toISOString())
        ),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { id: docRef.id };
    } catch (error) {
      console.error('Error saving check-in:', error);
      throw new HttpsError('internal', 'Failed to save check-in');
    }
  }
);
```

- [ ] **Step 3: Rewrite `trackToolUsage` — Firestore only**

```typescript
export const trackToolUsage = onCall(
  {},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const { toolId } = request.data as { toolId: string };

    if (!toolId) {
      throw new HttpsError('invalid-argument', 'toolId is required');
    }

    try {
      const recentCheckIn = await db
        .collection(`users/${userId}/checkIns`)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      const linkedCheckInId = recentCheckIn.docs[0]?.id || null;

      await db.collection(`users/${userId}/toolUsages`).add({
        toolId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        outcome: null,
        outcomeTimestamp: null,
        linkedCheckInId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error tracking tool usage:', error);
      throw new HttpsError('internal', 'Failed to track tool usage');
    }
  }
);
```

- [ ] **Step 4: Rewrite `recordToolOutcome` — Firestore only**

```typescript
export const recordToolOutcome = onCall(
  {},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const { outcome } = request.data as { outcome: 'helped' | 'somewhat' | 'not_really' };

    if (!outcome || !['helped', 'somewhat', 'not_really'].includes(outcome)) {
      throw new HttpsError('invalid-argument', 'outcome must be helped, somewhat, or not_really');
    }

    try {
      const unratedSnap = await db
        .collection(`users/${userId}/toolUsages`)
        .where('outcome', '==', null)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!unratedSnap.empty) {
        await unratedSnap.docs[0].ref.update({
          outcome,
          outcomeTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error recording tool outcome:', error);
      throw new HttpsError('internal', 'Failed to record tool outcome');
    }
  }
);
```

- [ ] **Step 5: Rewrite `updateUserProfile` — Firestore only (keep Firebase Auth sync)**

```typescript
export const updateUserProfile = onCall(
  {},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const updates = request.data as Record<string, unknown>;

    if (!updates || typeof updates !== 'object') {
      throw new HttpsError('invalid-argument', 'Updates must be an object');
    }

    const allowedFields = [
      'displayName', 'photoURL', 'theme',
      'checkInReminder', 'reminderTime', 'reminderDays', 'weeklyDigest',
      'dailyCheckInGoal', 'weeklyToolGoal', 'focusCategories',
      'dataRetentionDays', 'shareAnonymousData',
    ];

    const cleanUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        cleanUpdates[key] = updates[key];
      }
    }

    if (Object.keys(cleanUpdates).length === 0) {
      return { success: true };
    }

    try {
      await db.doc(`users/${userId}`).set(
        { ...cleanUpdates, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );

      // Sync displayName/photoURL to Firebase Auth
      const authUpdate: admin.auth.UpdateRequest = {};
      if ('displayName' in cleanUpdates) {
        authUpdate.displayName = cleanUpdates.displayName as string || undefined;
      }
      if ('photoURL' in cleanUpdates) {
        authUpdate.photoURL = cleanUpdates.photoURL as string || undefined;
      }
      if (Object.keys(authUpdate).length > 0) {
        await admin.auth().updateUser(userId, authUpdate);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new HttpsError('internal', 'Failed to update profile');
    }
  }
);
```

- [ ] **Step 6: Rewrite `saveDearManSession` — Firestore only**

```typescript
export const saveDearManSession = onCall(
  {},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const data = request.data as DearManSessionData;

    try {
      await db.collection(`users/${userId}/dearManSessions`).add({
        type: data.type,
        relationshipType: data.relationshipType || '',
        situationType: data.situationType || '',
        priorities: data.priorities || [],
        barriers: data.barriers || [],
        describeId: data.describeId || null,
        describeCustom: data.describeCustom || '',
        feelings: data.feelings || [],
        assertId: data.assertId || null,
        assertCustom: data.assertCustom || '',
        reinforceIds: data.reinforceIds || [],
        anchorPhrase: data.anchorPhrase || '',
        middleGroundId: data.middleGroundId || null,
        middleGroundCustom: data.middleGroundCustom || '',
        walkAwayId: data.walkAwayId || null,
        walkAwayCustom: data.walkAwayCustom || '',
        debriefOverall: data.debriefOverall || null,
        debriefWentWell: data.debriefWentWell || [],
        debriefToChange: data.debriefToChange || [],
        debriefCurrentFeelings: data.debriefCurrentFeelings || [],
        turningPointIds: data.turningPointIds || [],
        momentResponseIds: data.momentResponseIds || [],
        bodySignalIds: data.bodySignalIds || [],
        thoughtPatternIds: data.thoughtPatternIds || [],
        underneathIds: data.underneathIds || [],
        copeAheadId: data.copeAheadId || null,
        reflectionLanded: data.reflectionLanded || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error saving DEAR MAN session:', error);
      throw new HttpsError('internal', 'Failed to save session');
    }
  }
);
```

- [ ] **Step 7: Simplify `deleteUserData` — remove Neo4j cleanup**

Remove the Neo4j cleanup from Task 14. The function becomes Firestore-only:

```typescript
export const deleteUserData = onCall(
  {},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;

    try {
      // Chunked delete (Firestore batch limit is 500)
      const subcollections = ['checkIns', 'toolUsages', 'dearManSessions'];
      for (const sub of subcollections) {
        const snap = await db.collection(`users/${userId}/${sub}`).get();
        const chunks = [];
        for (let i = 0; i < snap.docs.length; i += 500) {
          chunks.push(snap.docs.slice(i, i + 500));
        }
        for (const chunk of chunks) {
          const batch = db.batch();
          chunk.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        }
      }

      await db.doc(`users/${userId}`).delete();

      return { success: true };
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw new HttpsError('internal', 'Failed to delete user data');
    }
  }
);
```

- [ ] **Step 8: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 9: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: remove all Neo4j user data writes, Firestore is now sole user data store"
```

---

### Task 20: Clean up Neo4j driver usage

Now that several functions no longer need Neo4j, check that the driver singleton and secrets are only loaded by functions that still need them (the knowledge graph query functions).

**Files:**
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Verify which functions still need Neo4j secrets**

Functions that still query the knowledge graph and need `secrets: [neo4jUri, neo4jUser, neo4jPassword]`:
- `getStateAndTools`
- `getDiscriminatingQuestions`
- `getRelatedEmotions`
- `getQuickTools`
- `getOppositeActionContent`
- `getProblemSolveContent`
- `getDearManContent`
- `getDearManDebriefContent`
- `getDearManReflection`
- `getInsightsData` (still does knowledge graph lookups for formulation/narrative enrichment)
- `initializeSchema`

Functions that should now have empty config `{}`:
- `ensureUserExists`
- `saveCheckIn`
- `getCheckInsByUser`
- `getUserProfile`
- `updateUserProfile`
- `deleteUserData`
- `exportUserData`
- `trackToolUsage`
- `recordToolOutcome`
- `getWeeklyToolUsageCount`
- `getDearManSessions`
- `saveDearManSession`

- [ ] **Step 2: Verify all Firestore-only functions have `{}` config, not `{ secrets: [...] }`**

Scan through the file and confirm each function listed above has `onCall({}, ...)` instead of `onCall({ secrets: [...] }, ...)`.

- [ ] **Step 3: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile.

- [ ] **Step 4: Deploy and full test**

Run: `firebase deploy --only functions`
Test the full flow again:
1. Sign up / log in (ensureUserExists)
2. Check-in flow (saveCheckIn + getStateAndTools)
3. History page (getCheckInsByUser)
4. Insights page (getInsightsData)
5. Tool usage + rating (trackToolUsage + recordToolOutcome)
6. Profile settings (getUserProfile + updateUserProfile)
7. DEAR MAN session (saveDearManSession + getDearManSessions)

- [ ] **Step 5: Commit**

```bash
git add functions/src/index.ts
git commit -m "chore: clean up Neo4j secrets from Firestore-only functions"
```

---

### Task 21: Add Firestore composite indexes

**Files:**
- Modify: `firestore.indexes.json` (created in Task 9)

- [ ] **Step 1: Add composite index for `recordToolOutcome` query**

Update `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "toolUsages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "outcome", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

The `checkIns` collection queries on `timestamp` DESC (single-field, auto-indexed). The `dearManSessions` queries on `createdAt` DESC (single-field, auto-indexed). The only composite index needed is for `recordToolOutcome` which queries `outcome == null` + `createdAt DESC`.

- [ ] **Step 2: Deploy indexes**

Run: `firebase deploy --only firestore:indexes`
Expected: Index builds start (may take a few minutes).

- [ ] **Step 3: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat: add Firestore composite index for tool outcome queries"
```

---

### Task 22: Remove User/CheckIn/ToolUsage/DearManSession data from Neo4j

This is the final cleanup. Run once after confirming everything works on Firestore.

- [ ] **Step 1: Write a one-time cleanup Cypher script**

Create `schema/cleanup-user-data.cypher`:

```cypher
// ONE-TIME: Remove all user data nodes from Neo4j
// Run this AFTER confirming all reads/writes use Firestore
// This does NOT touch knowledge graph nodes (ActivationPattern, Emotion, etc.)

// Delete BodySensation nodes (orphaned after CheckIn deletion)
MATCH (s:BodySensation)
DETACH DELETE s;

// Delete CheckIn nodes
MATCH (c:CheckIn)
DETACH DELETE c;

// Delete ToolUsage nodes
MATCH (tu:ToolUsage)
DETACH DELETE tu;

// Delete DearManSession nodes
MATCH (s:DearManSession)
DETACH DELETE s;

// Delete User nodes
MATCH (u:User)
DETACH DELETE u;

// Drop user-data indexes and constraints
DROP CONSTRAINT user_id IF EXISTS;
DROP CONSTRAINT checkin_id IF EXISTS;
DROP INDEX checkin_timestamp IF EXISTS;
```

- [ ] **Step 2: Run the cleanup script against Neo4j Aura**

This is a destructive operation. Verify Firestore has all data before running.

Run via Neo4j Browser or `cypher-shell`, **not** via the app.

- [ ] **Step 3: Commit the cleanup script (for documentation)**

```bash
git add schema/cleanup-user-data.cypher
git commit -m "chore: add one-time Neo4j user data cleanup script"
```

---

### Task 23: Update CLAUDE.md to reflect new architecture

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the Architecture section**

Update to reflect the two-store architecture:
- Neo4j: read-only knowledge graph (emotions, patterns, tools, brain structures)
- Firestore: all user data (check-ins, tool usage, profiles, sessions)
- Cloud Functions: join layer

- [ ] **Step 2: Update the Data Layer Principles section**

Add Firestore to the "What Goes Where" section. Update the test:
- "Does this data describe *how to display something*?" → `src/data/`
- "Does this data describe *what an emotion IS* or *what to DO about it*?" → Neo4j
- "Does this data belong to *a specific user*?" → Firestore

- [ ] **Step 3: Update Key Files table**

Remove references to User/CheckIn nodes in Neo4j. Add note about Firestore collections.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Firestore user data architecture"
```
