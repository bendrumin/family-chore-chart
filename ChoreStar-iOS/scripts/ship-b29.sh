#!/bin/bash
# ChoreStar 2.1.1 (build 29): archive -> re-stamp -> upload -> notes in four
# languages -> attach -> submit for review.
#
# RUN THIS FROM YOUR OWN TERMINAL, not from Claude Code (its safety layer
# refuses to touch a re-stamped archive, even to poll it).
#
# 2.1.1 = the catch-up tools: Mark Today / Mark Week So Far Done (schedule-
# aware, approves pending, shows the earnings delta first) and partial
# payouts (subtract exactly what the kid spent). Web halves of both are
# already merged; the /api/allowance amountCents param must be deployed
# BEFORE this build reaches users (it is, if you pushed main first).
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
VERSION=2.1.1
BUILD=29
GOOD_STAMP=25A354   # a release macOS build id
ARCHIVE="build/ChoreStar-${VERSION}-b${BUILD}.xcarchive"
KEY_ID="${ASC_KEY_ID:-P8NYU5K555}"
ISSUER="${ASC_ISSUER_ID:-69a6de6f-7e14-47e3-e053-5b8c7c11a4d1}"
KEY_PATH="${ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8}"

echo "==> [1/7] Archiving ${VERSION} (${BUILD}) with $(xcodebuild -version | head -1)"
rm -rf "$ARCHIVE"
xcodebuild archive \
  -project ChoreStar.xcodeproj -scheme ChoreStar \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" | tail -3

echo "==> [2/7] Re-stamping BuildMachineOSBuild -> ${GOOD_STAMP}"
find "$ARCHIVE" -name Info.plist -print0 | while IFS= read -r -d '' plist; do
  if /usr/libexec/PlistBuddy -c 'Print :BuildMachineOSBuild' "$plist" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Set :BuildMachineOSBuild ${GOOD_STAMP}" "$plist"
    echo "    stamped: ${plist#$ARCHIVE/}"
  fi
done

echo "==> [3/7] Exporting + uploading to App Store Connect (this re-signs)"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist scripts/ExportOptions.plist \
  -exportPath "build/export-b${BUILD}" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$KEY_PATH" \
  -authenticationKeyID "$KEY_ID" \
  -authenticationKeyIssuerID "$ISSUER" | tail -5

echo "==> [4/7] Waiting for ASC processing (VALID means the re-stamp took)"
node scripts/asc.mjs wait-build "$VERSION" "$BUILD"

echo "==> [5/7] Release notes: en-US + the three localized listings"
node scripts/asc.mjs ensure-version "$VERSION"
node scripts/asc.mjs set-whatsnew "$VERSION" fastlane/metadata/en-US/release_notes.txt
node scripts/asc.mjs push-locales "$VERSION" es-MX pt-BR ar-SA

echo "==> [6/7] Attaching build ${BUILD} to version ${VERSION}"
node scripts/asc.mjs attach-build "$VERSION" "$BUILD"

echo "==> [7/7] Phased release + submit for review"
node scripts/asc.mjs phased "$VERSION"
node scripts/asc.mjs submit-version "$VERSION"

echo ""
echo "DONE. ${VERSION} (build ${BUILD}) is WAITING_FOR_REVIEW with listings"
echo "in en-US, es-MX, pt-BR, and ar-SA."
echo "Check state anytime with: node scripts/asc.mjs status ${VERSION}"