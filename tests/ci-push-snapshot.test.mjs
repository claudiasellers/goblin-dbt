// scripts/ci/push-snapshot.mjs: the deploy's content-snapshot push survives main moving under it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pushSnapshot } from "../scripts/ci/push-snapshot.mjs";

const quiet = { log: () => {} };
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
function write(cwd, path, text) {
  mkdirSync(join(cwd, path, ".."), { recursive: true });
  writeFileSync(join(cwd, path), text);
}
function commit(cwd, msg) {
  git(cwd, "add", "-A");
  git(cwd, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", msg);
}

function setup() {
  const root = mkdtempSync(join(tmpdir(), "push-snap-"));
  const origin = join(root, "origin.git");
  git(root, "init", "-q", "--bare", "-b", "main", origin);
  const runner = join(root, "runner");
  git(root, "clone", "-q", origin, runner);
  git(runner, "config", "user.name", "t"); git(runner, "config", "user.email", "t@t"); // commit-tree needs one
  write(runner, "src/data/content/a.json", "old a\n");
  write(runner, "src/data/content/b.json", "old b\n");
  write(runner, "app.ts", "v1\n");
  commit(runner, "base");
  git(runner, "push", "-q", "origin", "HEAD:main");
  const other = join(root, "other");
  git(root, "clone", "-q", origin, other);
  // The deploy's snapshot commit, on top of what it checked out.
  write(runner, "src/data/content/a.json", "new a\n");
  commit(runner, "Content snapshots from the live graph");
  return { root, origin, runner, other };
}
const show = (cwd, path) => git(cwd, "show", `origin/main:${path}`);

test("main unchanged: the snapshot commit itself is pushed", () => {
  const { root, runner } = setup();
  try {
    const head = git(runner, "rev-parse", "HEAD");
    assert.equal(pushSnapshot({ cwd: runner, commit: "HEAD", log: quiet }), head);
    git(runner, "fetch", "-q");
    assert.equal(git(runner, "rev-parse", "origin/main"), head);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("main moved: the content change goes on top of the new tip; the working tree is untouched", () => {
  const { root, runner, other } = setup();
  try {
    write(other, "app.ts", "v2\n");
    write(other, "src/data/content/b.json", "b from a newer merge\n");
    commit(other, "a newer merge");
    git(other, "push", "-q", "origin", "HEAD:main");
    const newer = git(other, "rev-parse", "HEAD");
    const head = git(runner, "rev-parse", "HEAD");

    const pushed = pushSnapshot({ cwd: runner, commit: "HEAD", log: quiet });
    git(runner, "fetch", "-q");
    assert.equal(git(runner, "rev-parse", "origin/main"), pushed);
    assert.equal(git(runner, "rev-parse", `${pushed}^`), newer, "on top of the newer merge");
    assert.equal(show(runner, "src/data/content/a.json"), "new a", "the snapshot's file");
    assert.equal(show(runner, "src/data/content/b.json"), "b from a newer merge", "files the snapshot didn't change stay main's");
    assert.equal(show(runner, "app.ts"), "v2");
    assert.equal(git(runner, "log", "-1", "--format=%s", pushed), "Content snapshots from the live graph");
    assert.equal(git(runner, "rev-parse", "HEAD"), head, "HEAD stays at what was deployed");
    assert.equal(readFileSync(join(runner, "app.ts"), "utf8"), "v1\n", "working tree untouched");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("main already has the same content: nothing is pushed", () => {
  const { root, runner, other } = setup();
  try {
    write(other, "src/data/content/a.json", "new a\n");
    commit(other, "a merge that shipped the same snapshot");
    git(other, "push", "-q", "origin", "HEAD:main");
    const tip = git(other, "rev-parse", "HEAD");
    assert.equal(pushSnapshot({ cwd: runner, commit: "HEAD", log: quiet }), null);
    git(runner, "fetch", "-q");
    assert.equal(git(runner, "rev-parse", "origin/main"), tip);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("main moved and a newer merge changed the same content file: main's version stays", () => {
  const { root, runner, other } = setup();
  try {
    // The snapshot changes a.json and b.json; a newer merge (newer graph content) changed b.json too.
    write(runner, "src/data/content/b.json", "b from this run's older graph\n");
    git(runner, "add", "-A");
    git(runner, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--amend", "--no-edit");
    write(other, "src/data/content/b.json", "b from a newer merge\n");
    commit(other, "a newer merge with newer content");
    git(other, "push", "-q", "origin", "HEAD:main");
    const newer = git(other, "rev-parse", "HEAD");

    const lines = [];
    const pushed = pushSnapshot({ cwd: runner, commit: "HEAD", log: { log: (m) => lines.push(m) } });
    git(runner, "fetch", "-q");
    assert.equal(git(runner, "rev-parse", `${pushed}^`), newer);
    assert.equal(show(runner, "src/data/content/a.json"), "new a", "a file only the snapshot changed takes the snapshot's");
    assert.equal(show(runner, "src/data/content/b.json"), "b from a newer merge", "never overwritten with older graph content");
    assert.match(lines.join("\n"), /Left as main has them.*b\.json/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("main moved and a newer merge changed every snapshot file: nothing is pushed", () => {
  const { root, runner, other } = setup();
  try {
    write(other, "src/data/content/a.json", "a from a newer merge\n");
    commit(other, "a newer merge with newer content");
    git(other, "push", "-q", "origin", "HEAD:main");
    const tip = git(other, "rev-parse", "HEAD");
    assert.equal(pushSnapshot({ cwd: runner, commit: "HEAD", log: quiet }), null);
    git(runner, "fetch", "-q");
    assert.equal(git(runner, "rev-parse", "origin/main"), tip);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a snapshot commit that touches anything outside src/data/content is refused", () => {
  const { root, runner, other } = setup();
  try {
    write(runner, "app.ts", "sneaky\n");
    commit(runner, "not just content");
    write(other, "app.ts", "v2\n");
    commit(other, "a newer merge");
    git(other, "push", "-q", "origin", "HEAD:main");
    assert.throws(() => pushSnapshot({ cwd: runner, commit: "HEAD", log: quiet }), /changes more than src\/data\/content/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
