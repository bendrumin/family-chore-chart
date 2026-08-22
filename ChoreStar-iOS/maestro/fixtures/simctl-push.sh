#!/usr/bin/env bash
# Inject a fake APNs payload into the booted simulator to exercise deep-link
# routing (PushDelegate → DeepLinkRouter). Does NOT talk to Apple's servers —
# only tests payload parsing + tap handling once the banner is delivered.
#
# Usage:
#   ./maestro/fixtures/simctl-push.sh                      # all-chores-done
#   ./maestro/fixtures/simctl-push.sh routine-complete
#   CHILD_ID=<uuid> ./maestro/fixtures/simctl-push.sh      # real child id
#
# Prerequisites: app installed + running (or backgrounded) on a booted sim;
# parent signed in so MainTabs can present ChildDetailView.

set -euo pipefail
cd "$(dirname "$0")/../.."

KIND="${1:-all-chores-done}"
FIXTURE="maestro/fixtures/${KIND}.apns"
if [[ ! -f "$FIXTURE" ]]; then
  echo "Unknown fixture '$KIND'. Use: all-chores-done | routine-complete" >&2
  exit 1
fi

SIM=$(xcrun simctl list devices | awk -F '[()]' '/Booted/{print $2; exit}')
if [[ -z "${SIM:-}" ]]; then
  echo "No booted simulator. Open Simulator first." >&2
  exit 1
fi

TMP=$(mktemp -t chorestar-push.XXXXXX.apns)
trap 'rm -f "$TMP"' EXIT

if [[ -n "${CHILD_ID:-}" ]]; then
  # Rewrite childId so tapping opens a real child on this account.
  /usr/bin/python3 - "$FIXTURE" "$TMP" "$CHILD_ID" <<'PY'
import json, sys
src, dst, child = sys.argv[1], sys.argv[2], sys.argv[3]
with open(src) as f:
    payload = json.load(f)
payload["childId"] = child
with open(dst, "w") as f:
    json.dump(payload, f)
PY
else
  cp "$FIXTURE" "$TMP"
fi

echo "Pushing $KIND → sim $SIM (bundle com.chorestar.ChoreStar)"
xcrun simctl push "$SIM" com.chorestar.ChoreStar "$TMP"
echo "Done. Tap the banner (or open Notification Center) to verify deep link."
