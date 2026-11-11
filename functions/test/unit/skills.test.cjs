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
      id: 'check_the_facts', toolId: 'check-the-facts', version: 'cf-v1', contentVersion: 'skills-v1', start: 'feel', accepts: ['situationId'], ownMax: 140,
      emotionFields: ['feel'], copy: JSON.stringify({ next: 'Next' }), tables: JSON.stringify({ storySetOf: { fear: 'fear' } }),
      derive: JSON.stringify([{ name: 'parent', from: '$a.feel', table: 'parentOf' }]),
      inline: JSON.stringify({ enterAt: ['feel'], returns: ['feel'] }),
      runtime: JSON.stringify({ quickExit: true, resumeAt: ['next'], persist: { after: 'feel', nothingWhen: when } }),
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
      { skillId: 'check_the_facts', id: 'done', toolId: null, query: '{}', carry: [], done: true, planned: false, safety: false },
      { skillId: 'check_the_facts', id: 'wise_mind', toolId: 'wise-mind', query: JSON.stringify({ first: 'wm_q_next' }), carry: null, done: false, planned: false, safety: false },
      { skillId: 'check_the_facts', id: 'let_it_be', toolId: 'let-it-be', query: '{}', carry: [], done: false, planned: true, safety: false },
      { skillId: 'check_the_facts', id: 'help', toolId: null, query: '{}', carry: [], done: false, planned: false, safety: true },
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
  assert.deepEqual(s.accepts, ['situationId']);
  assert.deepEqual(s.inline, { enterAt: ['feel'], returns: ['feel'] }, 'an inline skill says where it starts and what it returns');
  assert.deepEqual([s.quickExit, s.resumeAt, s.persist], [true, ['next'], { after: 'feel', nothingWhen: when }], 'the runtime switches (R15, IE-08) spread onto the skill');
  assert.deepEqual(s.steps.map((x) => x.id), ['feel', 'next']);
  assert.deepEqual(s.steps[0].next, [{ to: 'next', when: null }]);
  assert.deepEqual(s.steps[1].offers.map((o) => o.exit), ['problem_solve', 'opposite_action', 'problem_solve'], 'rows in their order, an exit offered twice');
  assert.equal(s.steps[1].done, 'done');
  assert.deepEqual(s.exits[1], { id: 'wise_mind', toolId: 'wise-mind', query: { first: 'wm_q_next' }, carry: [], done: false });
  assert.equal(s.exits[2].planned, true, 'a planned exit (tool not built) keeps its flag');
  assert.equal(s.exits[3].safety, true, 'safety.open keeps its flag');
  assert.deepEqual(s.options.alt.map((o) => o.for), ['sad_gone', '$own'], 'ALTERNATIVE_TO names the story; own-words alternatives are $own');
  assert.deepEqual(s.options.story[0], { value: 'sad_gone', label: "It's gone for good", set: 'sadness', predicts: false });
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
  assert.ok(f.allClosed());
});

test('getSkillContent fails with failed-precondition until schema/skills.cypher is loaded', async () => {
  setDriver(fakeDriver(() => []).driver);
  await assert.rejects(fns.getSkillContent.run({ data: {} }), (e) => e.code === 'failed-precondition');
});

test('getSkillContent: a skill that is not inline has no inline key', async () => {
  setDriver(fakeDriver((q) => {
    if (/MATCH \(s:Skill\) RETURN/.test(q)) return [{
      id: 'x', toolId: 'x', version: 'v', contentVersion: 'skills-v1', start: 'a', accepts: [], ownMax: 140, emotionFields: [],
      copy: '{}', tables: '{}', derive: '[]', inline: 'null', runtime: null,
    }];
    return [];
  }).driver);
  const out = await fns.getSkillContent.run({ data: {} });
  assert.equal('inline' in out.skills[0], false);
  assert.equal('persist' in out.skills[0] || 'quickExit' in out.skills[0] || 'resumeAt' in out.skills[0], false, 'no runtime switches: no keys');
});

test('getSkillRun: the caller\'s own run of that tool, within the window, own words decrypted; anything else is null', async () => {
  const run = { skillId: 'check_the_facts', versionId: 'cf-v1', path: ['feel'], answers: [{ fieldId: 'feel', optionIds: ['hurt'] }] };
  const f = fakeDriver((q, p) => {
    if (/RETURN ts\.ext AS ext/.test(q)) {
      assert.equal(p.key, 'u1:00000000-0000-4000-8000-000000000001', 'by key, never by id alone');
      assert.equal(p.toolId, 'check-the-facts');
      assert.equal(p.days, 14);
      return [{ ext: JSON.stringify({ run }) }];
    }
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getSkillRun.run({ auth: { uid: 'u1' }, data: { sessionId: '00000000-0000-4000-8000-000000000001', toolId: 'check-the-facts' } });
  assert.deepEqual(out.run, run);
  assert.equal(f.sessions[0].config.defaultAccessMode, 'READ');
  setDriver(fakeDriver(() => []).driver);
  const none = await fns.getSkillRun.run({ auth: { uid: 'u1' }, data: { sessionId: '00000000-0000-4000-8000-000000000001', toolId: 'check-the-facts' } });
  assert.equal(none.run, null);
  await assert.rejects(fns.getSkillRun.run({ auth: { uid: 'u1' }, data: { sessionId: 'nope', toolId: 'check-the-facts' } }), (e) => e.code === 'invalid-argument');
});

test('getSkillRun: Ending a relationship reopens a run up to 45 days back (its check-ins can be a month out, IE-08)', async () => {
  const f = fakeDriver((q, p) => {
    if (/RETURN ts\.ext AS ext/.test(q)) { assert.equal(p.days, 45); return []; }
    return [];
  });
  setDriver(f.driver);
  const out = await fns.getSkillRun.run({ auth: { uid: 'u1', token: {} }, data: { sessionId: '00000000-0000-4000-8000-000000000001', toolId: 'ending-relationships' } });
  assert.deepEqual(out, { run: null });
});
