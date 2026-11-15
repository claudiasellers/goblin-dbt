'use strict';
// Mindfulness skills' reopened visits (functions/src/skills/projections.ts OFF_PHONE_SKILLS): a card's visit logs a rep
// only for what the PRD counts as one.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const LIB = path.join(__dirname, '..', '..', 'lib');
const S = require(path.join(LIB, 'skills/projections.js'));

const ans = (fieldId, ...optionIds) => ({ fieldId, optionIds });
const ext = (skillId, answers) => JSON.stringify({ run: { skillId, versionId: 'v', path: ['start'], answers, ctx: {} } });

test('What works here: the move done (helped or not) is the rep; not yet logs none; the first visit keeps its own', () => {
  const FIRST = [ans('goal', 'respect'), ans('pull', 'works'), ans('move', 'resp_proud')];
  assert.deepEqual(S.runRep(ext('effectively', [...FIRST, ans('back', 'helped')]), 'effectiveness'), { repSource: 'followup_offphone' });
  assert.deepEqual(S.runRep(ext('effectively', [...FIRST, ans('back', 'didnt')]), 'effectiveness'), { repSource: 'followup_offphone' });
  assert.deepEqual(S.runRep(ext('effectively', [...FIRST, ans('back', 'not_yet')]), 'effectiveness'), { noRep: true });
  assert.deepEqual(S.runRep(ext('effectively', [...FIRST, ans('back', 'unsafe')]), 'effectiveness'), { noRep: true });
  assert.equal(S.runRep(ext('effectively', FIRST), 'effectiveness'), null);
});

test('Wise mind check: the look-back logs no rep whatever was done; the check itself keeps its own', () => {
  const FIRST = [ans('decision', 'send'), ans('cues', 'now'), ans('answer', 'no'), ans('look', 'tomorrow')];
  for (const did of ['waited', 'went', 'not', 'undecided']) {
    assert.deepEqual(S.runRep(ext('wise_mind_check', [...FIRST, ans('did', did), ans('came', 'yes')]), 'wise-mind'), { noRep: true }, did);
  }
  assert.equal(S.runRep(ext('wise_mind_check', FIRST), 'wise-mind'), null);
});
