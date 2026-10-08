#!/bin/bash
# ChoreStar 2.4 (build 39): build 38 plus the Duo screenshot pass, so the
# binary matches the 2.4 listing's Duo screenshots and custom product page:
# Home / Chores / Family keep off the fold half-open, kids share one row on the
# open Duo's Family tab, and the closed screen's approvals tray and kid header
# no longer crush their text. Archived with Xcode 27.1 like b38.
# Stops at TestFlight: replaces b38 on 2.4, NOT submitted. After the device test:
#   node scripts/asc.mjs phased 2.4 && node scripts/asc.mjs submit-version 2.4
#
#   SHIP_XCODE=~/Downloads/Xcode.app scripts/ship-b39.sh   # the 27.1 RC
#
# 27.1 rewrites ChoreStar/Localizable.xcstrings on every build (drops some
# translations as stale); the archive step restores it from git afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."

SHIP_XCODE="${SHIP_XCODE:-/Applications/Xcode.app}"
export DEVELOPER_DIR="$SHIP_XCODE/Contents/Developer"
xcodebuild -showsdks 2>/dev/null | grep -q "iphoneos27.1" || {
  echo "$SHIP_XCODE has no iOS 27.1 SDK. Point SHIP_XCODE at Xcode 27.1 (RC or later)."; exit 1; }
VERSION=2.4
BUILD=39
ARCHIVE="build/ChoreStar-${VERSION}-b${BUILD}.xcarchive"
KEY_ID="${ASC_KEY_ID:-P8NYU5K555}"
ISSUER="${ASC_ISSUER_ID:-69a6de6f-7e14-47e3-e053-5b8c7c11a4d1}"
KEY_PATH="${ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8}"
# fastlane's asc_api_key reads these; export so a non-login shell works too.
export ASC_KEY_ID="$KEY_ID" ASC_ISSUER_ID="$ISSUER" ASC_KEY_PATH="$KEY_PATH"
AUTH=(-allowProvisioningUpdates
      -authenticationKeyPath "$KEY_PATH"
      -authenticationKeyID "$KEY_ID"
      -authenticationKeyIssuerID "$ISSUER")

echo "==> [1/6] Archiving ${VERSION} (${BUILD}) with $(xcodebuild -version | head -1)"
rm -rf "$ARCHIVE"
xcodebuild archive \
  -project ChoreStar.xcodeproj -scheme ChoreStar \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" "${AUTH[@]}" | tail -3
git checkout -- ChoreStar/Localizable.xcstrings  # undo 27.1's catalog rewrite

echo "==> [2/6] Exporting + uploading to App Store Connect (this re-signs)"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist scripts/ExportOptions.plist \
  -exportPath "build/export-b${BUILD}" "${AUTH[@]}" | tail -5

echo "==> [3/6] Waiting for ASC processing"
node scripts/asc.mjs wait-build "$VERSION" "$BUILD"

echo "==> [4/6] 2.4 listing: description, promo text, release notes x4 locales"
node scripts/asc.mjs ensure-version "$VERSION"
node scripts/asc.mjs push-locales "$VERSION" en-US es-MX pt-BR ar-SA

echo "==> [5/6] Attaching build ${BUILD} to version ${VERSION}"
node scripts/asc.mjs attach-build "$VERSION" "$BUILD"

echo "==> [6/6] TestFlight What to Test (fastlane/beta/whats_new.txt)"
fastlane ios beta_test_info feedback_email:hi@chorestar.app

echo ""
echo "DONE. ${VERSION} (build ${BUILD}, Xcode 27.1, Duo-ready) is in TestFlight,"
echo "with the 2.4 listing staged in en-US, es-MX, pt-BR, and ar-SA."
echo "NOT submitted for review. After the device test:"
echo "  node scripts/asc.mjs phased ${VERSION} && node scripts/asc.mjs submit-version ${VERSION}"
