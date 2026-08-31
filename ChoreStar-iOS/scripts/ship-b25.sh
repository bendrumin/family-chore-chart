#!/bin/bash
# ChoreStar 2.0 (build 25): archive -> re-stamp -> upload -> attach -> submit.
#
# RUN THIS FROM YOUR OWN TERMINAL, not from Claude Code (its safety layer
# refuses to touch a re-stamped archive, even to poll it).
#
# Why the re-stamp: this Mac runs beta macOS, and xcodebuild records the host
# build (BuildMachineOSBuild) into every Info.plist. ASC's validator rejects
# beta-machine builds after upload (ITMS-90111, "INVALID_BINARY"), so we stamp
# the plists with a release-macOS build id before exporting. exportArchive
# re-signs everything afterwards, so signatures stay valid. Same recipe that
# shipped builds 22 and 24.
set -euo pipefail
cd "$(dirname "$0")/.."

export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer  # release Xcode, NOT Xcode-27 (beta SDK = TestFlight only)
VERSION=2.0
BUILD=25
GOOD_STAMP=25A354   # a release macOS build id
ARCHIVE="build/ChoreStar-${VERSION}-b${BUILD}.xcarchive"
KEY_ID="${ASC_KEY_ID:-P8NYU5K555}"
ISSUER="${ASC_ISSUER_ID:-69a6de6f-7e14-47e3-e053-5b8c7c11a4d1}"
KEY_PATH="${ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8}"

echo "==> [1/6] Archiving ${VERSION} (${BUILD}) with $(xcodebuild -version | head -1)"
rm -rf "$ARCHIVE"
xcodebuild archive \
  -project ChoreStar.xcodeproj -scheme ChoreStar \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" | tail -3

echo "==> [2/6] Re-stamping BuildMachineOSBuild -> ${GOOD_STAMP}"
find "$ARCHIVE" -name Info.plist -print0 | while IFS= read -r -d '' plist; do
  if /usr/libexec/PlistBuddy -c 'Print :BuildMachineOSBuild' "$plist" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Set :BuildMachineOSBuild ${GOOD_STAMP}" "$plist"
    echo "    stamped: ${plist#$ARCHIVE/}"
  fi
done

echo "==> [3/6] Exporting + uploading to App Store Connect (this re-signs)"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist scripts/ExportOptions.plist \
  -exportPath "build/export-b${BUILD}" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$KEY_PATH" \
  -authenticationKeyID "$KEY_ID" \
  -authenticationKeyIssuerID "$ISSUER" | tail -5

echo "==> [4/6] Waiting for ASC processing (VALID means the re-stamp took)"
node scripts/asc.mjs wait-build "$VERSION" "$BUILD"

echo "==> [5/6] Attaching build ${BUILD} to version ${VERSION}"
node scripts/asc.mjs ensure-version "$VERSION"
node scripts/asc.mjs attach-build "$VERSION" "$BUILD"

echo "==> [6/6] Phased release + submit for review"
node scripts/asc.mjs phased "$VERSION"
node scripts/asc.mjs submit-version "$VERSION"

echo ""
echo "DONE. 2.0 (build ${BUILD}) is WAITING_FOR_REVIEW."
echo "Check state anytime with: node scripts/asc.mjs status ${VERSION}"
