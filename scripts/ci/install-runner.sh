#!/usr/bin/env bash
# Registers this Mac as the repo's self-hosted GitHub Actions runner (label "goblin") and installs it
# as a launchd service that starts at login. CI and Deploy both run on it (docs/ci-runner.md).
# Needs gh signed in as a repo admin and python3 3.9+ (the jobs fetch Node 22 themselves; the Firebase CLI
# comes from functions/node_modules; no Java: the emulator tier is not in CI). Safe to run again: an
# already registered runner is just restarted.
set -euo pipefail

REPO="claudiasellers/goblin-dbt"
DIR="$HOME/actions-runner/goblin-dbt"
NAME="$(scutil --get LocalHostName 2>/dev/null || hostname -s)"

case "$(uname -m)" in
  arm64) ARCH="osx-arm64" ;;
  x86_64) ARCH="osx-x64" ;;
  *) echo "Unknown CPU: $(uname -m)"; exit 1 ;;
esac

command -v gh >/dev/null || { echo "Install the GitHub CLI first: brew install gh, then gh auth login"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Sign in first: gh auth login"; exit 1; }
command -v python3 >/dev/null || { echo "Install python3 first: xcode-select --install"; exit 1; }
python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' || { echo "python3 is older than 3.9: brew install python@3.12"; exit 1; }

mkdir -p "$DIR"
cd "$DIR"

if [ ! -f .runner ]; then
  VERSION="$(gh api repos/actions/runner/releases/latest -q .tag_name | sed 's/^v//')"
  echo "Downloading runner $VERSION ($ARCH)..."
  curl -fsSL -o runner.tar.gz "https://github.com/actions/runner/releases/download/v${VERSION}/actions-runner-${ARCH}-${VERSION}.tar.gz"
  tar xzf runner.tar.gz
  rm runner.tar.gz
  TOKEN="$(gh api -X POST "repos/${REPO}/actions/runners/registration-token" -q .token)"
  # PATH is recorded now (.path) and used by the service, so python3 and git must already be on it.
  ./config.sh --unattended --url "https://github.com/${REPO}" --token "$TOKEN" \
    --name "$NAME" --labels goblin --work _work --replace
fi

if ./svc.sh status 2>/dev/null | grep -q "Started"; then
  ./svc.sh stop
fi
./svc.sh install 2>/dev/null || true
./svc.sh start
./svc.sh status
echo
echo "Done. The runner shows as Idle at https://github.com/${REPO}/settings/actions/runners"
