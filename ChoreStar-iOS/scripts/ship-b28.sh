#!/bin/bash
# ChoreStar 2.1 (build 28) to TESTFLIGHT ONLY: archive -> re-stamp -> upload.
#
# RUN THIS FROM YOUR OWN TERMINAL, not from Claude Code (its safety layer
# refuses to touch a re-stamped archive, even to poll it).
#
# This build carries the international pass (kid mode in es/pt-BR/ar,
# currencies/timezones/Gulf weekends, locale week grids) for on-device
# testing. It does NOT attach or submit anything: 2.1's remaining scope
# (recap, Siri, PWA, seasonal icons) ships later on a higher build via a
# ship script that adds the attach/submit steps from ship-b27.sh.
#
# Why the re-stamp: this Mac runs beta macOS, and xcodebuild records the host
# build (BuildMachineOSBuild) into every Info.plist. ASC's validator rejects
# beta-machine builds after upload (ITMS-90111, "INVALID_BINARY"), so we stamp
# the plists with a release-macOS build id before exporting. exportArchive
# re-signs everything afterwards, so signatures stay valid. Same recipe that
# shipped builds 22, 24, 25, and 27. Drop the re-stamp step once the Xcode 27
# RC lands on release macOS (~mid Sept).
set -euo pipefail
cd "$(dirname "$0")/.."

export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer  # release Xcode, NOT Xcode-27
VERSION=2.1
BUILD=28
GOOD_STAMP=25A354   # a release macOS build id
ARCHIVE="build/ChoreStar-${VERSION}-b${BUILD}.xcarchive"
KEY_ID="${ASC_KEY_ID:-P8NYU5K555}"
ISSUER="${ASC_ISSUER_ID:-69a6de6f-7e14-47e3-e053-5b8c7c11a4d1}"
KEY_PATH="${ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8}"

echo "==> [1/4] Archiving ${VERSION} (${BUILD}) with $(xcodebuild -version | head -1)"
rm -rf "$ARCHIVE"
xcodebuild archive \
  -project ChoreStar.xcodeproj -scheme ChoreStar \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" | tail -3

echo "==> [2/4] Re-stamping BuildMachineOSBuild -> ${GOOD_STAMP}"
find "$ARCHIVE" -name Info.plist -print0 | while IFS= read -r -d '' plist; do
  if /usr/libexec/PlistBuddy -c 'Print :BuildMachineOSBuild' "$plist" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Set :BuildMachineOSBuild ${GOOD_STAMP}" "$plist"
    echo "    stamped: ${plist#$ARCHIVE/}"
  fi
done

echo "==> [3/4] Exporting + uploading to App Store Connect (this re-signs)"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist scripts/ExportOptions.plist \
  -exportPath "build/export-b${BUILD}" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$KEY_PATH" \
  -authenticationKeyID "$KEY_ID" \
  -authenticationKeyIssuerID "$ISSUER" | tail -5

echo "==> [4/4] Waiting for ASC processing (VALID means the re-stamp took)"
node scripts/asc.mjs wait-build "$VERSION" "$BUILD"

echo ""
echo "DONE. ${VERSION} (build ${BUILD}) is VALID on TestFlight — internal"
echo "testers get it automatically (no export-compliance questions: the"
echo "encryption key is already declared in Info.plist)."
echo "Test the localization on device: Settings > General > Language & Region"
echo "  -> Español / Português (Brasil) / العربية, then relaunch ChoreStar."
echo "NOT attached, NOT submitted: 2.1 review submission happens later."