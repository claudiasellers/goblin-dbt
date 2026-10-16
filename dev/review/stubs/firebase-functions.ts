/**
 * Review harness stub for firebase/functions (aliased in dev/vite.harness.config.ts): every callable is
 * answered by ../backend.ts, which logs the writes for the on-screen event list. No network.
 */
import { callStub } from '../backend';

export function getFunctions(...args: unknown[]): Record<string, never> {
  void args;
  return {};
}
export function httpsCallable<Req = unknown, Res = unknown>(_functions: unknown, name: string, ...rest: unknown[]) {
  void rest;
  return async (data?: Req): Promise<{ data: Res }> => {
    try {
      return { data: (await callStub(name, data ?? null)) as Res };
    } catch {
      throw Object.assign(new Error(`${name} failed (review stub)`), { code: 'functions/internal' });
    }
  };
}
