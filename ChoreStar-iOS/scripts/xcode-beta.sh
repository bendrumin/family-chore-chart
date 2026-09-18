#!/bin/bash
# Point THIS SHELL at the Xcode beta, and nothing else.
#
#   source scripts/xcode-beta.sh
#
# The two-Xcode rule for this repo: the release Xcode at /Applications/Xcode.app
# ships the app (every ship-b*.sh pins DEVELOPER_DIR to it, and xcode-select
# stays there too). The beta at /Applications/Xcode Beta.app is for QA and
# design against devices the release Xcode does not know yet (iPhone Duo, as
# of the 27.1 beta). We never `xcode-select -s` to the beta, because that
# flips the default for every terminal, and we never archive for the store
# with it: beta SDK builds are TestFlight-only (BUILD_SDK_NOT_ALLOWED_FOR_
# APP_STORE_SUBMISSION burned build 21 in August).
BETA="/Applications/Xcode Beta.app"
if [ ! -d "$BETA" ]; then
  echo "No Xcode beta at $BETA."
  echo "Download the current Xcode 27.x beta xip from developer.apple.com/download,"
  echo 'then: xip --expand ~/Downloads/Xcode_27.1_beta.xip && mv ~/Downloads/Xcode-beta.app "/Applications/Xcode Beta.app"'
  return 1 2>/dev/null || exit 1
fi
export DEVELOPER_DIR="$BETA/Contents/Developer"
echo "This shell now uses: $(xcodebuild -version | tr '\n' ' ')"
echo "Global default is untouched: $(env -u DEVELOPER_DIR /usr/bin/xcode-select -p)"
