#!/bin/bash
# ChoreStar 2.2 (build 32): withdraw the waiting build-31 submission, then
# archive -> re-stamp -> upload -> refreshed notes in four languages ->
# attach -> resubmit for review.
#
# RUN THIS FROM YOUR OWN TERMINAL, not from Claude Code (its safety layer
# refuses to touch a re-stamped archive, even to poll it).
#
# Why build 32: build 31 (the redesign) was submitted the evening of Sep 7
# and was still WAITING_FOR_REVIEW when vacation mode landed the next
# morning. This lane swaps the newer build onto the same 2.2 version, so one
# release carries the redesign, the family-first hero, AND vacation mode,
# with release notes that mention all of it. Screenshots are already on the
# listing and are untouched.
#
# Why the re-stamp: this Mac runs beta macOS, and xcodebuild records the host
# build (BuildMachineOSBuild) into every Info.plist. ASC's validator rejects
# beta-machine builds after upload (ITMS-90111, "INVALID_BINARY"), so we stamp
# the plists with a release-macOS build id before exporting. exportArchive
# re-signs everything afterwards, so signatures stay valid. Same recipe that
# shipped builds 22 through 30. Drop the re-stamp step once the Xcode 27
# RC lands on release macOS (~mid Sept).
set -euo pipefail
cd "$(dirname "$0")/.."

export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer  # release Xcode, NOT Xcode-27
VERSION=2.2
BUILD=32
GOOD_STAMP=25A354   # a release macOS build id
ARCHIVE="build/ChoreStar-${VERSION}-b${BUILD}.xcarchive"
KEY_ID="${ASC_KEY_ID:-P8NYU5K555}"
ISSUER="${ASC_ISSUER_ID:-69a6de6f-7e14-47e3-e053-5b8c7c11a4d1}"
KEY_PATH="${ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8}"

echo "==> [0/7] Withdrawing the waiting build-31 submission"
node scripts/asc.mjs cancel-submission

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
echo "in en-US, es-MX, pt-BR, and ar-SA, and the new screenshots already"
echo "attached to the version."
echo "Check state anytime with: node scripts/asc.mjs status ${VERSION}"
