/**
 * Auth lifecycle triggers (firebase-functions v1: there is no non-blocking v2 auth trigger, and the
 * blocking ones need Identity Platform). Deploy names are the export names in ../index.ts.
 */
import * as functionsV1 from 'firebase-functions/v1';
import { NEO4J_SECRETS, withSession } from '../shared/neo4j';
import { deleteUserGraph } from '../userdata/exportDelete';

/**
 * A user deleted in the Firebase console (or by deleteUserData) leaves no graph data behind.
 * Idempotent: after deleteUserData it finds nothing to delete.
 */
export const onUserDeleted = functionsV1
  .runWith({ secrets: NEO4J_SECRETS })
  .auth.user()
  .onDelete(async (user) => {
    await withSession((session) => deleteUserGraph(session, user.uid));
  });

/**
 * A User node from sign-up (F4): before PR-C1 it only appeared at the first check-in save, so
 * profile updates, tool usage and DEAR MAN saves silently dropped writes for new users. The client
 * also calls ensureUserExists after sign-in, and every write MERGEs the user, so a missed trigger
 * costs nothing.
 */
export const onUserCreated = functionsV1
  .runWith({ secrets: NEO4J_SECRETS })
  .auth.user()
  .onCreate(async (user) => {
    await withSession((session) => session.run(
      `MERGE (u:User {id: $uid})
       ON CREATE SET u.email = $email, u.createdAt = datetime(), u.timeZone = null`,
      { uid: user.uid, email: user.email ?? null },
    ));
  });
