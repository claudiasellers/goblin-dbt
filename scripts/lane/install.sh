#!/bin/bash
# Installs (or updates) the merge lane on this Mac: copies merge-lane.sh to ~/.goblin-lane/bin and
# loads a launchd job that runs it every 2 minutes. Re-run after merge-lane.sh changes.
set -euo pipefail
LANE="$HOME/.goblin-lane"
PLIST="$HOME/Library/LaunchAgents/com.goblin.merge-lane.plist"
mkdir -p "$LANE/bin" "$LANE/logs"
cp "$(dirname "$0")/merge-lane.sh" "$LANE/bin/merge-lane.sh"
chmod +x "$LANE/bin/merge-lane.sh"
gh label create ready-to-merge -R claudiasellers/goblin-dbt -c 0e8a16 -d "Merge lane: test on main and merge" 2>/dev/null || true
gh label create lane-failed -R claudiasellers/goblin-dbt -c d93f0b -d "Merge lane: checks or merge failed" 2>/dev/null || true
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.goblin.merge-lane</string>
  <key>ProgramArguments</key><array><string>$LANE/bin/merge-lane.sh</string></array>
  <key>StartInterval</key><integer>120</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LANE/logs/lane.log</string>
  <key>StandardErrorPath</key><string>$LANE/logs/lane.log</string>
</dict></plist>
PL
launchctl bootout "gui/$(id -u)/com.goblin.merge-lane" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Merge lane installed. Log: $LANE/logs/lane.log"
