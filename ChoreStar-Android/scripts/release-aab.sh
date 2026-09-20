#!/bin/bash
# Build the signed release bundle for Google Play.
#
#   ChoreStar-Android/scripts/release-aab.sh
#
# Signing comes from android/keystore.properties (gitignored; storeFile,
# storePassword, keyAlias, keyPassword). Without it Gradle produces an
# UNSIGNED bundle, which Play rejects, so the script stops early. Gradle
# needs JDK 21 (the default brew JDK's jlink fails); the SDK is the brew
# command-line tools install. Both are pinned here so this runs from any
# shell. Bump versionCode in android/app/build.gradle before each upload;
# Play refuses a bundle whose versionCode it has already seen.
set -euo pipefail
cd "$(dirname "$0")/.."

export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools

[ -f android/keystore.properties ] || {
  echo "android/keystore.properties is missing. Create the upload key first:"
  echo '  keytool -genkeypair -v -keystore ~/.chorestar-android/upload.keystore \'
  echo '    -alias chorestar-upload -keyalg RSA -keysize 2048 -validity 10000'
  echo "then write android/keystore.properties with storeFile (absolute path),"
  echo "storePassword, keyAlias=chorestar-upload, keyPassword."
  exit 1
}

echo "==> [1/3] cap sync (copies web config into the Android project)"
npx cap sync android >/dev/null

echo "==> [2/3] gradle bundleRelease ($(grep -oE 'version(Code|Name) [^ ]+' android/app/build.gradle | tr '\n' ' '))"
(cd android && ./gradlew bundleRelease --console=plain -q)

AAB=android/app/build/outputs/bundle/release/app-release.aab
echo "==> [3/3] verifying signature"
"$JAVA_HOME/bin/jarsigner" -verify "$AAB" | grep -q "jar verified" \
  && echo "signed: $AAB ($(du -h "$AAB" | cut -f1))" \
  || { echo "NOT SIGNED: check keystore.properties"; exit 1; }
echo "Upload at https://play.google.com/console (closed testing track first)."
