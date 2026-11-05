#!/bin/bash
# Merge lane: tests open PRs labelled `ready-to-merge` on top of main and merges them, one at a time,
# oldest PR number first. Runs from launchd every 2 minutes; see scripts/lane/README.md.
set -uo pipefail
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
OWNER=claudiasellers
REPO=$OWNER/goblin-dbt
LANE="${LANE_HOME:-$HOME/.goblin-lane}"
WORK="$LANE/repo"          # the lane's own clone; never your working checkout
LABEL=ready-to-merge
FAILED=lane-failed

log() { echo "$(date '+%F %T') $*"; }

mkdir "$LANE/lock" 2>/dev/null || { log "another run holds $LANE/lock"; exit 0; }
trap 'rmdir "$LANE/lock"' EXIT

[ -d "$WORK/.git" ] || git clone -q "https://github.com/$REPO.git" "$WORK"
cd "$WORK" || exit 1

run_checks() {  # the same gate as .github/workflows/ci.yml
  npm ci && npm ci --prefix functions &&
  npm run build && npm --prefix functions run build &&
  npm test && node scripts/ci/lint-budget.mjs
}

fail() {  # pr, reason, [logfile]
  local pr=$1 why=$2 file=${3:-}
  log "#$pr not merged: $why"
  {
    echo "**Merge lane:** not merged, $why."
    if [ -n "$file" ]; then
      echo; echo "<details><summary>Last 60 lines of the log</summary>"; echo; echo '```'
      tail -60 "$file"; echo '```'; echo "</details>"
    fi
    echo; echo "Fix it on the branch, then add the \`$LABEL\` label again to requeue."
  } > "$LANE/comment.md"
  gh pr comment "$pr" -R "$REPO" -F "$LANE/comment.md" >/dev/null
  gh pr edit "$pr" -R "$REPO" --remove-label "$LABEL" --add-label "$FAILED" >/dev/null
}

process() {  # pr
  local pr=$1 head branch base logf attempt
  for attempt in 1 2 3; do
    read -r head branch < <(gh pr view "$pr" -R "$REPO" --json headRefOid,headRefName -q '.headRefOid+" "+.headRefName')
    git fetch -q origin main "pull/$pr/head" || { log "#$pr fetch failed, will retry next run"; return; }
    base=$(git rev-parse origin/main)
    git checkout -q -f -B lane-test "$base" && git clean -qfdx
    if ! git merge -q --no-ff --no-edit -m "Merge pull request #$pr from $OWNER/$branch" "$head"; then
      git merge --abort
      fail "$pr" "it conflicts with main (merge main into the branch and resolve)"
      return
    fi
    logf="$LANE/logs/pr-$pr-$(date +%Y%m%d-%H%M%S).log"
    log "#$pr testing ${head:0:7} on main ${base:0:7} (log: $logf)"
    if ! run_checks > "$logf" 2>&1; then
      fail "$pr" "the checks failed on top of main ${base:0:7}" "$logf"
      return
    fi
    if [ "$(gh pr view "$pr" -R "$REPO" --json headRefOid -q .headRefOid)" != "$head" ]; then
      log "#$pr got new commits while testing, retesting"; continue
    fi
    # Push the exact tree that passed. This is rejected if main moved meanwhile, and GitHub marks
    # the PR merged once its head is on main. The push to main also starts the deploy workflow.
    if git push -q origin lane-test:main; then
      log "#$pr merged"
      gh pr edit "$pr" -R "$REPO" --remove-label "$LABEL" --remove-label "$FAILED" >/dev/null 2>&1
      gh pr comment "$pr" -R "$REPO" -b "**Merge lane:** merged after the checks passed on top of main ${base:0:7}." >/dev/null
      return
    fi
    log "#$pr main moved while testing, retesting"
  done
  fail "$pr" "main kept moving while the checks ran (3 tries)"
}

tried=" "
while :; do
  pr=$(gh pr list -R "$REPO" --label "$LABEL" --state open --json number,isDraft \
        -q '[.[] | select(.isDraft | not) | .number] | sort | map(tostring) | join(" ")')
  next=""
  for n in $pr; do case "$tried" in *" $n "*) ;; *) next=$n; break ;; esac; done
  [ -z "$next" ] && break
  tried="$tried$next "
  process "$next"
done
