# Merge lane

A script on Claudia's Mac that tests and merges PRs in a queue, so threads can work on branches
in parallel without each one testing and merging itself.

## For anyone opening a PR (threads included)

- When the PR is finished, add the **`ready-to-merge`** label: `gh pr edit <n> --add-label ready-to-merge`.
  Leave draft PRs as drafts until then; the lane skips drafts.
- Don't merge it yourself. The lane picks it up within about 2 minutes.
- If it comes back with **`lane-failed`** and a comment, fix the branch (usually: merge main in, or fix
  the failing check from the log in the comment), then add `ready-to-merge` again.
- The PR description's Deploy section still matters: the push to main starts the deploy workflow.

## What it does

Every 2 minutes launchd runs `~/.goblin-lane/bin/merge-lane.sh`. It takes open, non-draft PRs labelled
`ready-to-merge`, lowest PR number first, and for each one:

1. Merges the PR head into the current `origin/main` in its own clone (`~/.goblin-lane/repo`, never your
   working checkout). A conflict fails the PR.
2. Runs the same checks as CI (`.github/workflows/ci.yml`): `npm ci` (root and functions), both builds,
   `npm test`, lint budget.
3. Pushes that exact tested merge commit to `main`. If main moved while testing (another merge, or the
   deploy workflow's content-snapshot commit), the push is rejected and it retests, up to 3 times.
   GitHub then marks the PR merged, and the push starts `.github/workflows/deploy.yml`.

On failure it comments on the PR with the last 60 lines of the log, swaps `ready-to-merge` for
`lane-failed`, and leaves the PR open. It never force-pushes or rewrites a branch.

## Running it

- Install or update (after `merge-lane.sh` changes): `scripts/lane/install.sh`
- Watch: `tail -f ~/.goblin-lane/logs/lane.log`. Full check logs are `~/.goblin-lane/logs/pr-<n>-*.log`.
- Run now: `launchctl kickstart gui/$(id -u)/com.goblin.merge-lane`
- Stop: `launchctl bootout gui/$(id -u)/com.goblin.merge-lane`

It only runs while the Mac is awake and logged in. Tier 2 (emulator) tests are not part of it.
