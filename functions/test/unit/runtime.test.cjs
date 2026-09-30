'use strict';
/** The deploy runtime comes from package.json `engines`, not from the endpoint manifest (A1-8). */
const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../../package.json');

test('functions deploy on the Node 22 runtime', () => {
  assert.equal(pkg.engines.node, '22');
});

test('tests run on Node 22 or newer', () => {
  assert.ok(Number(process.versions.node.split('.')[0]) >= 22, process.versions.node);
});
