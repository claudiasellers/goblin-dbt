/**
 * Build-time pieces of the skills review page (dev/skills-review.html; dev/vite.harness.config.ts):
 * - the app's src/data/content/skills.json, with the review-only embeds skill (./embeds-skill.json) added, so the
 *   page can show each shared embed (holdRing's three variants, witness) on the real player;
 * - `virtual:review-witness-lines`: the witness corpus's check-in lines (scripts/witness/content.py), as the
 *   server would serve them, for the witness embed's stubbed getWitnessLines: read, never retyped.
 * Harness builds only.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const ROOT = resolve(__dirname, '../..');
const SKILLS = '\0review-skills-content';
const WITNESS = '\0review-witness-lines';

export function reviewSkillsContent(): Plugin {
  return {
    name: 'review-skills-content',
    enforce: 'pre',
    resolveId(source) {
      if (source === 'virtual:review-witness-lines') return WITNESS;
      return /(^|\/)data\/content\/skills\.json$/.test(source) ? SKILLS : null;
    },
    load(id) {
      if (id === SKILLS) {
        const shipped = JSON.parse(readFileSync(resolve(ROOT, 'src/data/content/skills.json'), 'utf8'));
        const { _note: _n, ...probe } = JSON.parse(readFileSync(resolve(__dirname, 'embeds-skill.json'), 'utf8'));
        void _n;
        shipped.content.skills = [...shipped.content.skills, probe];
        return `export default ${JSON.stringify(shipped)};`;
      }
      if (id === WITNESS) {
        const py = [
          'import sys, json', "sys.path.insert(0, 'scripts/witness')", 'import content as c',
          "L = [l for l in c.LINES if 'checkin_result' in l['moments'] and l['kind'] == 'receive' and l['level'] in (4, 5)][:6]",
          "print(json.dumps([{'id': l['id'], 'source': 'graph', 'text': l['text'], 'level': l['level'], 'kind': l['kind'], 'voice': l['voice'], 'tentative': l['tentative']} for l in L]))",
        ].join('\n');
        const lines = execFileSync('python3', ['-c', py], { cwd: ROOT, encoding: 'utf8' });
        return `export default ${lines.trim()};`;
      }
      return null;
    },
  };
}
