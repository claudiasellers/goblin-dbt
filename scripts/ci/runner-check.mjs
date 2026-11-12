#!/usr/bin/env node
/**
 * First step of CI on the self-hosted runner (Claudia's Mac mini, docs/ci-runner.md): says plainly what
 * the machine is missing, instead of a test failing half an hour in. Node comes from actions/setup-node;
 * the generator-freshness tests shell out to the Mac's own python3 (3.9 or newer: the scripts parse as
 * 3.9 and use builtin generic annotations); git is the Xcode command line tools'.
 */
import { execFileSync } from 'node:child_process';

const problems = [];
function version(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

const node = process.versions.node;
if (Number(node.split('.')[0]) !== 22) problems.push(`Node ${node}; CI expects 22 (actions/setup-node)`);

const py = version('python3', ['-c', 'import sys; print("%d.%d.%d" % sys.version_info[:3])']);
if (!py) problems.push('python3 not found. Install it: xcode-select --install (or brew install python@3.12)');
else {
  const [maj, min] = py.split('.').map(Number);
  if (maj < 3 || (maj === 3 && min < 9)) problems.push(`python3 is ${py}; the generators need 3.9 or newer (brew install python@3.12)`);
}

const git = version('git', ['--version']);
if (!git) problems.push('git not found. Install it: xcode-select --install');

console.log(`runner: ${process.platform} ${process.arch}, node ${node}, python3 ${py ?? 'missing'}, ${git ?? 'git missing'}`);
for (const p of problems) console.log(`::error::${p}`);
process.exit(problems.length ? 1 : 0);
