/**
 * Admin-only "Official DBT names": relabels every tool with its official skill name and module
 * ("Urge Surfing (DT)") so the friendly names can be checked against the curriculum.
 *
 * The names come from the graph (`TherapyConcept.name` by `appToolId`, shipped as
 * `src/data/content/tool-names.json` by scripts/content-snapshot/build.mjs), so a new tool whose concept
 * carries an appToolId is covered by the next graph load with no change here. The module code comes
 * from the tool's own `module` (the PRD codes: DT, ER, IE, MF). Pure: no React, no storage.
 */
import type { ModuleId } from '../data/modules';

export const MODULE_CODES: Record<ModuleId, string> = {
  'distress-tolerance': 'DT',
  'emotion-regulation': 'ER',
  'interpersonal-effectiveness': 'IE',
  mindfulness: 'MF',
};

/** appToolId → official skill name (tool-names.json's `content.tools`). */
export type OfficialNames = Readonly<Record<string, string>>;

interface Labelled { id: string; name: string; module: ModuleId }

/**
 * The label a tool shows. Off, or no official name for it yet (Meet a part, Two pulls: no graph
 * concept), is the friendly name unchanged.
 */
export function toolLabel(tool: Labelled, names: OfficialNames | null): string {
  const official = names?.[tool.id];
  if (!official) return tool.name;
  return `${official} (${MODULE_CODES[tool.module]})`;
}

/** Whether the label differs from the friendly name (the Tools page then shows the friendly one under it). */
export function hasOfficialName(tool: Labelled, names: OfficialNames | null): boolean {
  return Boolean(names?.[tool.id]);
}

/**
 * The admin allowlist: `VITE_ADMIN_UIDS`, comma- or space-separated Firebase uids, baked into the build
 * (a repository variable for the deploy, `.env` locally). Nothing here is a security boundary: the
 * switch changes labels only, so the gate just keeps it out of everyone else's way.
 */
export function parseAdminUids(raw: string | undefined | null): string[] {
  return (raw ?? '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
}

export function isAdmin(uid: string | null | undefined, admins: readonly string[], dev = false): boolean {
  if (dev) return true;
  return Boolean(uid) && admins.includes(uid as string);
}

/** Per device and per person: the switch is a viewing convenience, never profile data. */
export const OFFICIAL_NAMES_KEY = 'goblin.officialNames.v1';
export const storageKey = (uid: string | null | undefined): string => `${OFFICIAL_NAMES_KEY}:${uid ?? 'dev'}`;
