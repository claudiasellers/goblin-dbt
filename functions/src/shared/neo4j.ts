import { defineSecret } from 'firebase-functions/params';
import neo4j, { Driver, ManagedTransaction, Session } from 'neo4j-driver';

// Define secrets - these are securely stored in Firebase and injected at runtime
export const neo4jUri = defineSecret('NEO4J_URI');
export const neo4jUser = defineSecret('NEO4J_USER');
export const neo4jPassword = defineSecret('NEO4J_PASSWORD');

/** The Neo4j secrets (callables declare them through shared/callOptions.ts CALL_OPTS). */
export const NEO4J_SECRETS = [neo4jUri, neo4jUser, neo4jPassword];

// Neo4j driver singleton
let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      neo4jUri.value(),
      neo4j.auth.basic(neo4jUser.value(), neo4jPassword.value())
    );
  }
  return driver;
}

/**
 * Test seam: inject a fake (unit tests) or local (emulator) driver; `null` resets to the lazy
 * singleton. Never re-exported from index.ts, so it can never become a deployed callable.
 */
export function setDriverForTesting(d: Driver | null): void {
  driver = d;
}

/** Run `fn` with a session that is always closed, even when `fn` throws. */
export async function withSession<T>(fn: (s: Session) => Promise<T>, mode: 'READ' | 'WRITE' = 'WRITE'): Promise<T> {
  const session = getDriver().session({
    defaultAccessMode: mode === 'READ' ? neo4j.session.READ : neo4j.session.WRITE,
  });
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}

/** A managed read transaction (retried by the driver on transient errors). */
export const readTx = <T>(fn: (tx: ManagedTransaction) => Promise<T>): Promise<T> =>
  withSession((s) => s.executeRead(fn), 'READ');

/** A managed write transaction (retried by the driver on transient errors). */
export const writeTx = <T>(fn: (tx: ManagedTransaction) => Promise<T>): Promise<T> =>
  withSession((s) => s.executeWrite(fn));
