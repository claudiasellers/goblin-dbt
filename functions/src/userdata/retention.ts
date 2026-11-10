/**
 * Retention as a daily job (docs/design/user-profile.md §8 #1). Before this, retention ran only when
 * the app loaded the settings profile, so someone who stopped opening the app kept their history past
 * their own setting. Log records older than `User.dataRetentionDays` are deleted (applyRetention);
 * profile items never expire (D-10).
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { NEO4J_SECRETS, withSession } from '../shared/neo4j';
import { errorTag } from '../shared/errors';
import { int } from '../shared/values';
import { applyRetention } from './exportDelete';

export const RETENTION_USERS_QUERY = `MATCH (u:User) WHERE u.dataRetentionDays > 0
  RETURN u.id AS uid, u.dataRetentionDays AS days`;

export interface RetentionDeps {
  users(): Promise<Array<{ uid: string; days: number }>>;
  apply(uid: string, days: number): Promise<void>;
}

/** One pass: every user with a window, one at a time; a failure for one person never stops the rest. */
export async function runRetention(deps: RetentionDeps): Promise<{ users: number; failed: number }> {
  const users = await deps.users();
  let failed = 0;
  for (const { uid, days } of users) {
    if (!uid || !Number.isInteger(days) || days <= 0) continue;
    try {
      await deps.apply(uid, days);
    } catch (e) {
      failed++;
      console.warn('retention failed for one user', errorTag(e));
    }
  }
  return { users: users.length, failed };
}

export const applyRetentionDaily = onSchedule(
  { schedule: 'every day 03:30', timeZone: 'Etc/UTC', secrets: NEO4J_SECRETS, retryCount: 0 },
  async () => {
    const res = await runRetention({
      users: () => withSession(async (s) => (await s.run(RETENTION_USERS_QUERY)).records
        .map((r) => ({ uid: r.get('uid') as string, days: int(r.get('days')) })), 'READ'),
      apply: (uid, days) => withSession((s) => applyRetention(s, uid, days)),
    });
    console.log('retention done', JSON.stringify(res));
  },
);
