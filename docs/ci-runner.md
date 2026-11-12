# CI runner: Claudia's Mac mini

Since 12 Nov 2026 both workflows (`ci.yml`, `deploy.yml`) run on a self-hosted runner on the Mac mini,
label `goblin`, instead of GitHub's paid minutes. One runner means jobs queue one at a time.

## Set it up (once)

From the repo folder on the Mac, with `gh` signed in:

```
bash scripts/ci/install-runner.sh
```

It downloads the latest runner for the Mac's CPU into `~/actions-runner/goblin-dbt`, registers it with a
token from `gh` (nothing to copy), and installs it as a launchd service that starts at login. The runner
only runs while that user is logged in, and not while the Mac sleeps: keep the Mac mini awake
(System Settings, Energy, "Prevent automatic sleeping") or the jobs wait.

The service records `PATH` when it is registered. If `python3` or `git` moves (say a new Homebrew
python), re-register: `cd ~/actions-runner/goblin-dbt && ./svc.sh stop && ./svc.sh uninstall && ./config.sh remove --token "$(gh api -X POST repos/claudiasellers/goblin-dbt/actions/runners/remove-token -q .token)"`,
then run the install script again.

## What a job needs

- Node 22: `actions/setup-node` fetches it per job.
- `python3` 3.9 or newer (the generator-freshness tests): the Xcode command line tools' is enough.
- `git`: the Xcode command line tools.
- Deploy only: the Firebase CLI comes from `functions/node_modules`; secrets come from the repo settings.
- Not needed: Java (the emulator tier runs by hand, `npm run test:emulator`), Docker.

CI's first step, `scripts/ci/runner-check.mjs`, names anything missing.

## Day to day

- Status: https://github.com/claudiasellers/goblin-dbt/settings/actions/runners (Idle / Active / Offline).
- Logs: `~/actions-runner/goblin-dbt/_diag/`.
- Restart: `cd ~/actions-runner/goblin-dbt && ./svc.sh stop && ./svc.sh start`.
- Back to GitHub's runners: change `runs-on: [self-hosted, goblin]` to `ubuntu-latest` in both workflows,
  and put back `actions/setup-python` (python 3.12).
