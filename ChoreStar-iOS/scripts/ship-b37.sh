#!/bin/bash
# ChoreStar 2.4 (build 37): archive -> upload -> 2.4 listing in four
# languages -> attach -> TestFlight "What to Test". Stops short of review:
# Sign in with Apple needs a device test first (sign in, then delete the
# account and check the revoke). When that passes:
#   node scripts/asc.mjs phased 2.4 && node scripts/asc.mjs submit-version 2.4
#
# 2.4 = Sign in with Apple: one-tap signup, Hide My Email, a name-your-family
# step for new Apple families, and account deletion revoking the Apple link.
# The app calls https://chorestar.app/api/auth/ensure-profile, so Apple
# sign-in in this build only works once PR #1 is deployed. Email sign-in
# works either way.
#
# First ship from the second Mac: there was no signing identity in the
# keychain, so the archive step passes the ASC key too and lets Xcode create
# the certificate and provisioning (incl. the new applesignin entitlement).
set -euo pipefail
cd "$(dirname "$0")/.."

export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
VERSION=2.4
BUILD=37
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
echo "DONE. ${VERSION} (build ${BUILD}) is in TestFlight for internal testers,"
echo "with the 2.4 listing staged in en-US, es-MX, pt-BR, and ar-SA."
echo "NOT submitted for review. After the device test:"
echo "  node scripts/asc.mjs phased ${VERSION} && node scripts/asc.mjs submit-version ${VERSION}"
