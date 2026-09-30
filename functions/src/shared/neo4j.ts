import { defineSecret } from 'firebase-functions/params';
import neo4j, { Driver } from 'neo4j-driver';

// Define secrets - these are securely stored in Firebase and injected at runtime
export const neo4jUri = defineSecret('NEO4J_URI');
export const neo4jUser = defineSecret('NEO4J_USER');
export const neo4jPassword = defineSecret('NEO4J_PASSWORD');

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
