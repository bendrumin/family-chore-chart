#!/bin/bash
# Build ChoreStar with the Xcode beta and run it on the iPhone Duo simulator.
#
#   scripts/duo-sim.sh            # build, install, launch, screenshot
#   scripts/duo-sim.sh shot NAME  # just screenshot the running Duo sim
#
# Keeps the beta fenced off from the ship lane:
#   - DEVELOPER_DIR points at the beta for this process only
#   - DerivedData goes to build/duo-dd, never the release cache
#   - the pbxproj is diffed afterwards: a beta Xcode that "upgrades" the
#     project file silently breaks the release Xcode, so any change is flagged
set -euo pipefail
cd "$(dirname "$0")/.."

BETA="/Applications/Xcode Beta.app"
[ -d "$BETA" ] || { echo "No Xcode beta at $BETA (see scripts/xcode-beta.sh)"; exit 1; }
export DEVELOPER_DIR="$BETA/Contents/Developer"

DD=build/duo-dd
SHOTS=build/duo-shots
mkdir -p "$SHOTS"
BUNDLE=com.chorestar.ChoreStar

# The Duo device type only exists in the beta's platform support.
DUO_TYPE=$(xcrun simctl list devicetypes | grep -i "duo" | head -1 | sed -E 's/.*\((com\.apple[^)]+)\).*/\1/')
[ -n "$DUO_TYPE" ] || { echo "This Xcode has no iPhone Duo device type. Is it the 27.1 beta or later?"; exit 1; }
RUNTIME=$(xcrun simctl list runtimes | grep -i "iOS 27" | grep -oE 'com\.apple\.CoreSimulator\.SimRuntime\.iOS-[0-9-]+' | tail -1)

DUO_ID=$(xcrun simctl list devices | grep -i "ChoreStar Duo" | head -1 | grep -oE '[0-9A-F-]{36}' || true)
if [ -z "$DUO_ID" ]; then
  echo "==> Creating 'ChoreStar Duo' simulator ($DUO_TYPE on $RUNTIME)"
  DUO_ID=$(xcrun simctl create "ChoreStar Duo" "$DUO_TYPE" "$RUNTIME")
fi

if [ "${1:-}" = "shot" ]; then
  xcrun simctl io "$DUO_ID" screenshot "$SHOTS/${2:-duo}.png" && echo "saved $SHOTS/${2:-duo}.png"
  exit 0
fi

echo "==> Quit the release Simulator if it is open: two CoreSimulator versions"
echo "    at once produce 'connection became invalid' errors."
xcrun simctl boot "$DUO_ID" 2>/dev/null || true
# The GUI is optional: simctl builds, installs and screenshots headless.
SIM_APP=$(find "$BETA" -maxdepth 6 -name "Simulator.app" 2>/dev/null | head -1)
[ -n "$SIM_APP" ] && open -a "$SIM_APP" --args -CurrentDeviceUDID "$DUO_ID" || echo "    (Simulator GUI not opened; continuing headless)"

echo "==> Building with $(xcodebuild -version | head -1) into $DD"
xcodebuild build \
  -project ChoreStar.xcodeproj -scheme ChoreStar \
  -destination "platform=iOS Simulator,id=$DUO_ID" \
  -derivedDataPath "$DD" -quiet

APP=$(find "$DD/Build/Products" -maxdepth 2 -name "ChoreStar.app" | head -1)
xcrun simctl install "$DUO_ID" "$APP"
xcrun simctl launch "$DUO_ID" "$BUNDLE" >/dev/null
sleep 8
xcrun simctl io "$DUO_ID" screenshot "$SHOTS/duo-launch.png"
echo "saved $SHOTS/duo-launch.png"

# The beta must not rewrite the project file under us.
if ! git diff --quiet -- ChoreStar.xcodeproj/project.pbxproj; then
  echo ""
  echo "WARNING: project.pbxproj changed during this run. The beta Xcode likely"
  echo "upgraded the project format. Revert it before the release Xcode sees it:"
  echo "  git checkout -- ChoreStar.xcodeproj/project.pbxproj"
fi
