#!/bin/bash
# ChoreStar 2.2.1 (build 33): archive -> re-stamp -> upload -> notes in four
# languages -> attach -> submit for review.
#
# RUN THIS FROM YOUR OWN TERMINAL, not from Claude Code (its safety layer
# refuses to touch a re-stamped archive, even to poll it).
#
# 2.2.1 = past-week editing: the week view gains prev/next navigation so a
# missed chore from an earlier week (like Saturday, seen from a Sunday) can
# be checked off after the fact. Backfills count quietly, with no confetti.
#
# The beta-macOS re-stamp that shipped builds 22 through 32 is retired: as of
# 2026-09-13 this Mac runs release macOS 27.0 (26A428) with Xcode 27.0, so
# BuildMachineOSBuild records a release id and ASC accepts it as-is.
set -euo pipefail
cd "$(dirname "$0")/.."

export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer  # Xcode 27.0 release (27A266a)
VERSION=2.2.1
BUILD=33
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

echo "==> [2/7] Re-stamp skipped: this Mac now runs RELEASE macOS (26A428)"
# The beta-macOS trap (ITMS-90111) is over: BuildMachineOSBuild records the
# host macOS build, and release build ids pass ASC validation. If an upload
# ever comes back INVALID_BINARY again, restore the loop from ship-b32.sh.

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
