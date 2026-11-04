#!/usr/bin/env bash
# Premium ending and coming back, end to end in the iOS simulator, on the demo
# family. Builds and installs the app, signs in, then: Premium over the free
# limits -> lapse while the app is backgrounded -> maestro/premium-lapsed.yaml
# -> resubscribe while backgrounded -> maestro/premium-resumed.yaml. The demo
# family is put back afterwards whatever happens.
#
#   DEMO_EMAIL=... DEMO_PASSWORD=... ChoreStar-iOS/scripts/premium-lapse-sim.sh [simulator-udid]
#
# DEMO_EMAIL / DEMO_PASSWORD are the demo family's login (the same account
# e2e/plan-limits-features.spec.ts uses). Needs Maestro (~/.maestro/bin) and
# chorestar-nextjs/.env.local. Set DEVELOPER_DIR if the default Xcode isn't
# the one with simulators.
set -euo pipefail
: "${DEMO_EMAIL:?set DEMO_EMAIL to the demo family's login}"
: "${DEMO_PASSWORD:?set DEMO_PASSWORD to the demo family's password}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SIM="${1:-$(xcrun simctl list devices booted | grep -m1 -oE '[0-9A-F-]{36}')}"
APP_ID=com.chorestar.ChoreStar
MAESTRO="${MAESTRO:-$HOME/.maestro/bin/maestro}"
SAVE="$(mktemp -d)/demo.json"
drive() { (cd "$REPO/chorestar-nextjs" && npx tsx scripts/sim-premium-lapse.ts "$1" "$SAVE" | tail -1); }
trap 'drive restore >/dev/null' EXIT

cd "$REPO/ChoreStar-iOS"
xcodebuild build -project ChoreStar.xcodeproj -scheme ChoreStar -destination "id=$SIM" -derivedDataPath build/lapse-sim -quiet
xcrun simctl install "$SIM" build/lapse-sim/Build/Products/Debug-iphonesimulator/ChoreStar.app

drive setup
# Maestro installs its driver on first use, which sends the simulator to the
# home screen; get that out of the way before launching the app.
WARM="$(mktemp -d)/warm.yaml"
printf 'appId: com.apple.Preferences\n---\n- waitForAnimationToEnd\n' > "$WARM"
"$MAESTRO" --device "$SIM" test "$WARM" >/dev/null
xcrun simctl terminate "$SIM" "$APP_ID" 2>/dev/null || true
xcrun simctl launch "$SIM" "$APP_ID" -chorestar-fresh -chorestar-signin "$DEMO_EMAIL" "$DEMO_PASSWORD" >/dev/null
WAIT="$(mktemp -d)/wait.yaml"
printf 'appId: %s\n---\n- extendedWaitUntil:\n    visible: "The Star Family"\n    timeout: 45000\n' "$APP_ID" > "$WAIT"
"$MAESTRO" --device "$SIM" test "$WAIT"

# The app reloads on returning at most once a minute (Entitlements.
# foregroundRefreshInterval), so let a minute pass since its last reload.
sleep 65
xcrun simctl launch "$SIM" com.apple.Preferences >/dev/null
drive lapse
"$MAESTRO" --device "$SIM" test maestro/premium-lapsed.yaml

# The app reloads on returning at most once a minute (Entitlements.
# foregroundRefreshInterval), so let a minute pass since its last reload.
sleep 65
xcrun simctl launch "$SIM" com.apple.Preferences >/dev/null
drive resume
"$MAESTRO" --device "$SIM" test maestro/premium-resumed.yaml
echo "Premium lapse and resume: passed"
