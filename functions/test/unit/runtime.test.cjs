'use strict';
/** The deploy runtime comes from package.json `engines`, not from the endpoint manifest (A1-8). */
const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../../package.json');

// Node 24 (Google: supported through Oct 2028; nodejs20 is decommissioned 2026-10-30). 2nd-gen only, so
// every deployed function must be a v2 function: no firebase-functions/v1 imports (see below).
test('functions deploy on the Node 24 runtime', () => {
  assert.equal(pkg.engines.node, '24');
});

test('no 1st-gen (firebase-functions/v1) functions: they cannot run on Node 24', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const offenders = walk(path.join(__dirname, '../../src')).filter((f) => f.endsWith('.ts') && /firebase-functions\/v1/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, []);
});

test('tests run on Node 22 or newer', () => {
  assert.ok(Number(process.versions.node.split('.')[0]) >= 22, process.versions.node);
});
