'use strict';
/**
 * Deploy surface pin. The export names of functions/lib/index.js are the deployed Cloud Function
 * names, and each export's `__endpoint` is what `firebase deploy` builds its manifest from.
 * Adding, removing or reconfiguring a callable means editing test/fixtures/endpoints.json on
 * purpose, in the same commit.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions } = require('./fakeDriver.cjs');
const endpoints = require('../fixtures/endpoints.json');

const { fns } = loadFunctions();

test('exported callables are exactly the pinned set', () => {
  assert.deepEqual(Object.keys(fns).sort(), Object.keys(endpoints).sort());
});

test('every export is a function whose deploy manifest matches the fixture', () => {
  for (const [name, expected] of Object.entries(endpoints)) {
    assert.equal(typeof fns[name]?.run, 'function', `${name} is not a deployable function`);
    assert.deepEqual(JSON.parse(JSON.stringify(fns[name].__endpoint)), expected, name);
  }
});

test('the only declared params are the three Neo4j secrets', () => {
  const { declaredParams } = require('firebase-functions/params');
  assert.deepEqual(
    declaredParams.map((p) => p.name).sort(),
    ['NEO4J_PASSWORD', 'NEO4J_URI', 'NEO4J_USER'],
  );
});
