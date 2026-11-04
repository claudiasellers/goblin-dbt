'use strict';
/** getSkillContent (the skill runtime's content, docs/design/skill-runtime.md; public, no user data). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions, fakeDriver } = require('./fakeDriver.cjs');

const { fns, setDriver } = loadFunctions();
test.after(() => setDriver(null));

const when = { eq: ['$a.fits', 'fits'] };

test('getSkillContent: skills with their steps, jumps, offers, exits and options, plus parentOf and fitsWhen, read-only', async () => {
  const f = fakeDriver((q) => {
    if (/MATCH \(s:Skill\) RETURN/.test(q)) return [{
      id: 'check_the_facts', toolId: 'check-the-facts', version: 'cf-v1', contentVersion: 'skills-v1', start: 'feel', ownMax: 140,
      emotionFields: ['feel'], copy: JSON.stringify({ next: 'Next' }), tables: JSON.stringify({ storySetOf: { fear: 'fear' } }),
      derive: JSON.stringify([{ name: 'parent', from: '$a.feel', table: 'parentOf' }]),
    }];
    if (/HAS_STEP\]->\(st:SkillStep\)/.test(q)) return [
      { skillId: 'check_the_facts', id: 'feel', kind: 'ask', spec: JSON.stringify({ title: 'feel_title', fields: [] }), order: 0 },
      { skillId: 'check_the_facts', id: 'next', kind: 'handoff', spec: JSON.stringify({ done: 'done' }), order: 1 },
    ];
    if (/\[n:NEXT\]/.test(q)) return [{ skillId: 'check_the_facts', from: 'feel', to: 'next', order: 0, when: 'null' }];
    if (/\[o:OFFERS\]/.test(q)) return [
      { skillId: 'check_the_facts', from: 'next', exit: 'problem_solve', rows: JSON.stringify([{ order: 0, when }, { order: 3, when: { eq: ['$a.fits', 'partly'] } }]) },
      { skillId: 'check_the_facts', from: 'next', exit: 'opposite_action', rows: JSON.stringify([{ order: 2, when: { eq: ['$a.fits', 'partly'] } }]) },
    ];
    if (/HAS_EXIT/.test(q)) return [
      { skillId: 'check_the_facts', id: 'done', toolId: null, query: '{}', carry: [], done: true },
      { skillId: 'check_the_facts', id: 'wise_mind', toolId: 'wise-mind', query: JSON.stringify({ first: 'wm_q_next' }), carry: null, done: false },
    ];
    if (/HAS_OPTION/.test(q)) return [
      { skillId: 'check_the_facts', list: 'story', order: 0, value: 'sad_gone', label: "It's gone for good", props: JSON.stringify({ set: 'sadness', predicts: false }), forOwn: null, forStory: null },
      { skillId: 'check_the_facts', list: 'alt', order: 1, value: 'sad_gone_alt1', label: 'Some of it might come back', props: '{}', forOwn: null, forStory: 'sad_gone' },
      { skillId: 'check_the_facts', list: 'alt', order: 2, value: 'own_alt_unknown', label: "There's something I don't know yet", props: '{}', forOwn: true, forStory: null },
    ];
    if (/HAS_REGULATION_CONTENT/.test(q)) return [{ id: 'hurt', parent: 'sadness' }];
    if (/fitsTheFactsWhen/.test(q)) return [{ parent: 'sadness', label: 'Sadness', lines: ["I've lost something or someone."] }];
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getSkillContent.run({ data: {} });
  assert.equal(out.version, 'skills-v1');
  assert.deepEqual(out.parentOf, { hurt: 'sadness' });
  assert.deepEqual(out.fitsWhen, { sadness: { label: 'Sadness', lines: ["I've lost something or someone."] } });
  const [s] = out.skills;
  assert.deepEqual([s.id, s.toolId, s.start, s.ownMax], ['check_the_facts', 'check-the-facts', 'feel', 140]);
  assert.deepEqual(s.steps.map((x) => x.id), ['feel', 'next']);
  assert.deepEqual(s.steps[0].next, [{ to: 'next', when: null }]);
  assert.deepEqual(s.steps[1].offers.map((o) => o.exit), ['problem_solve', 'opposite_action', 'problem_solve'], 'rows in their order, an exit offered twice');
  assert.equal(s.steps[1].done, 'done');
  assert.deepEqual(s.exits[1], { id: 'wise_mind', toolId: 'wise-mind', query: { first: 'wm_q_next' }, carry: [], done: false });
  assert.deepEqual(s.options.alt.map((o) => o.for), ['sad_gone', '$own'], 'ALTERNATIVE_TO names the story; own-words alternatives are $own');
  assert.deepEqual(s.options.story[0], { value: 'sad_gone', label: "It's gone for good", set: 'sadness', predicts: false });
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
  assert.ok(f.allClosed());
});

test('getSkillContent fails with failed-precondition until schema/skills.cypher is loaded', async () => {
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.getSkillContent.run({ data: {} }), (e) => e.code === 'failed-precondition');
});
