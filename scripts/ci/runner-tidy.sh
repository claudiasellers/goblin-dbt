#!/usr/bin/env bash
# Last step of every job on the self-hosted runner (Claudia's Mac mini, docs/ci-runner.md, ~18 GB free
# when it was set up). Gives back what a job leaves behind, so the Mac's free space doesn't depend on
# the next checkout's clean. Never touches anything outside the runner's folder and ~/.npm.
# Bash 3.2 (macOS) safe. Never fails the job.
set -u
ws="${GITHUB_WORKSPACE:-$PWD}"
tool="${RUNNER_TOOL_CACHE:-}"

before=$(df -Pk "$ws" 2>/dev/null | awk 'NR==2 {print $4}')

# 1. This job's installs and outputs (the next job's npm ci restores them from ~/.npm in a minute).
for d in node_modules functions/node_modules dist functions/lib backups .rehearsal; do
  rm -rf "${ws:?}/$d"
done

# 2. Node versions setup-node downloaded: keep the newest of each major, drop the rest.
if [ -n "$tool" ] && [ -d "$tool/node" ]; then
  versions=$(ls "$tool/node" 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$')
  for major in $(echo "$versions" | cut -d. -f1 | sort -u); do
    echo "$versions" | grep "^$major\." | sort -t. -k1,1n -k2,2n -k3,3n | sed '$d' | while read -r old; do
      echo "removing old Node $old"
      rm -rf "$tool/node/$old" "$tool/node/$old.complete"
    done
  done
fi

# 3. The npm cache grows with every version ever installed: start it over past 3 GB.
if [ -d "$HOME/.npm/_cacache" ]; then
  kb=$(du -sk "$HOME/.npm/_cacache" 2>/dev/null | awk '{print $1}')
  if [ "${kb:-0}" -gt 3145728 ]; then
    echo "npm cache is $((kb / 1024)) MB; clearing it"
    rm -rf "$HOME/.npm/_cacache"
  fi
fi

# 4. Runner diagnostics older than two weeks.
if [ -n "${RUNNER_WORKSPACE:-}" ]; then
  diag="$(dirname "$RUNNER_WORKSPACE")/../_diag"
  [ -d "$diag" ] && find "$diag" -type f -mtime +14 -delete 2>/dev/null
fi

after=$(df -Pk "$ws" 2>/dev/null | awk 'NR==2 {print $4}')
if [ -n "${before:-}" ] && [ -n "${after:-}" ]; then
  echo "free space: $((before / 1048576)) GB -> $((after / 1048576)) GB"
fi
exit 0
