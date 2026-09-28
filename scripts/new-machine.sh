#!/usr/bin/env bash
# Moves ChoreStar's non-git files between Macs and checks a machine is ready.
# See docs/NEW-MACHINE.md for the why behind each file.
#
#   scripts/new-machine.sh export          # OLD Mac: bundle secrets into an encrypted .dmg on the Desktop
#   scripts/new-machine.sh import <dmg>    # NEW Mac: put every file in place, merge .env.local, fix storeFile
#   scripts/new-machine.sh check           # any Mac: what's missing (default)
#   scripts/new-machine.sh install         # brew/xcode toolchain from the doc (needs current Command Line Tools)
#   scripts/new-machine.sh verify          # unit tests plus the read-only credential checks
#
# Never prints a secret value, only file and variable names.

set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

REPO="$(cd "$(dirname "$0")/.." && pwd)"
REPO_FILES=(
  chorestar-nextjs/.env.local
  chorestar-nextjs/.env.test
  ChoreStar-Android-Native/supabase.properties
  ChoreStar-Android-Native/app/google-services.json
  ChoreStar-Android/android/keystore.properties
)
KEYSTORE_PROPS="$REPO/ChoreStar-Android/android/keystore.properties"
KEYSTORE_DEST="$REPO/ChoreStar-Android/android/upload-keystore.jks"
PLAY_KEY=".chorestar-android/play-key.json"
ASC_KEY_DIR=".appstoreconnect/private_keys"
JDK21=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
XCODE_DEV=/Applications/Xcode.app/Contents/Developer

ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
head_() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# storeFile as written in keystore.properties, resolved the way the native build does.
keystore_path() {
  [ -f "$KEYSTORE_PROPS" ] || return 1
  local p
  p="$(grep -E '^[[:space:]]*storeFile[[:space:]]*=' "$KEYSTORE_PROPS" | head -1 | sed -E 's/^[^=]*=[[:space:]]*//; s/[[:space:]]*$//')"
  [ -n "$p" ] || return 1
  case "$p" in /*) echo "$p" ;; *) echo "$(dirname "$KEYSTORE_PROPS")/$p" ;; esac
}

# Point storeFile at the .jks in this repo when the current path doesn't exist.
fix_keystore() {
  [ -f "$KEYSTORE_PROPS" ] && [ -f "$KEYSTORE_DEST" ] || return 0
  local cur; cur="$(keystore_path || true)"
  if [ -n "$cur" ] && [ -f "$cur" ]; then return 0; fi
  sed -i '' -E "s|^([[:space:]]*storeFile[[:space:]]*=).*|\1$KEYSTORE_DEST|" "$KEYSTORE_PROPS"
  ok "storeFile repointed to ChoreStar-Android/android/upload-keystore.jks"
}

# Fill keys in $2 that are missing, empty or "[SENSITIVE]" with the raw lines from $1.
merge_env() {
  node - "$1" "$2" <<'JS'
const fs = require('fs'), { parseEnv } = require('util');
const [src, dst] = process.argv.slice(2);
const srcText = fs.readFileSync(src, 'utf8'), dstText = fs.readFileSync(dst, 'utf8');
const s = parseEnv(srcText), d = parseEnv(dstText);
const weak = v => v === undefined || v.trim() === '' || v.trim() === '[SENSITIVE]';
const fill = Object.keys(s).filter(k => !weak(s[k]) && weak(d[k]));
// Raw source block for a key, including multi-line quoted values.
const block = (text, key) => {
  const lines = text.split('\n'), i = lines.findIndex(l => l.startsWith(key + '='));
  if (i < 0) return null;
  const q = lines[i].slice(key.length + 1)[0];
  if (q !== '"' && q !== "'") return lines[i];
  let j = i;
  const closed = l => l.trimEnd().endsWith(q) && !(j === i && l.slice(key.length + 1).trim() === q);
  while (!closed(lines[j]) && j < lines.length - 1) j++;
  return lines.slice(i, j + 1).join('\n');
};
let out = dstText;
for (const k of fill) {
  const old = block(out, k);
  if (old !== null) out = out.replace(old + '\n', '').replace(old, '');
  out = out.replace(/\n*$/, '\n') + block(srcText, k) + '\n';
}
fs.writeFileSync(dst, out);
console.log(fill.length ? '  filled from the old machine: ' + fill.join(', ') : '  nothing to fill, every key already set');
JS
}

cmd_export() {
  head_ "Bundling ChoreStar secrets from this Mac"
  local stage; stage="$(mktemp -d)"; trap "rm -rf '$stage'" EXIT
  mkdir -p "$stage/repo" "$stage/home"
  for f in "${REPO_FILES[@]}"; do
    if [ -f "$REPO/$f" ]; then mkdir -p "$stage/repo/$(dirname "$f")"; cp -p "$REPO/$f" "$stage/repo/$f"; ok "$f"
    else warn "$f not on this Mac, skipped"; fi
  done
  local jks; jks="$(keystore_path || true)"
  if [ -n "$jks" ] && [ -f "$jks" ]; then
    cp -p "$jks" "$stage/repo/ChoreStar-Android/android/upload-keystore.jks"; ok "upload keystore (.jks)"
  else bad "no .jks at the storeFile path; the Play upload key is NOT in this bundle"; fi
  if [ -f "$HOME/$PLAY_KEY" ]; then mkdir -p "$stage/home/$(dirname "$PLAY_KEY")"; cp -p "$HOME/$PLAY_KEY" "$stage/home/$PLAY_KEY"; ok "~/$PLAY_KEY"
  else warn "~/$PLAY_KEY not on this Mac"; fi
  local p8; for p8 in "$HOME/$ASC_KEY_DIR"/AuthKey_*.p8; do
    [ -f "$p8" ] || { warn "no App Store Connect .p8 in ~/$ASC_KEY_DIR"; break; }
    mkdir -p "$stage/home/$ASC_KEY_DIR"; cp -p "$p8" "$stage/home/$ASC_KEY_DIR/"; ok "~/$ASC_KEY_DIR/$(basename "$p8")"
  done
  local dmg="$HOME/Desktop/chorestar-secrets.dmg"
  rm -f "$dmg"
  echo; echo "Choose a password for the disk image (you'll type it again on the new Mac):"
  hdiutil create -quiet -encryption AES-256 -volname chorestar-secrets -srcfolder "$stage" -format UDZO "$dmg"
  echo; ok "wrote $dmg"
  echo "  AirDrop it to the new Mac, then run: scripts/new-machine.sh import ~/Downloads/chorestar-secrets.dmg"
  echo "  Delete the .dmg on both Macs afterwards."
}

cmd_import() {
  local dmg="${1:-}"; [ -f "$dmg" ] || { echo "usage: $0 import <path to chorestar-secrets.dmg>"; exit 1; }
  local mnt; mnt="$(mktemp -d)"
  hdiutil attach -quiet -nobrowse -readonly -mountpoint "$mnt" "$dmg"
  trap "hdiutil detach -quiet '$mnt' || true; rmdir '$mnt' 2>/dev/null || true" EXIT
  head_ "Repo files"
  local f
  for f in "${REPO_FILES[@]}" ChoreStar-Android/android/upload-keystore.jks; do
    local src="$mnt/repo/$f" dst="$REPO/$f"
    [ -f "$src" ] || { warn "$f not in the bundle"; continue; }
    if [ "$f" = chorestar-nextjs/.env.local ] && [ -f "$dst" ]; then
      ok "$f exists, merging"; merge_env "$src" "$dst"
    elif [ -f "$dst" ]; then ok "$f already here, left alone"
    else mkdir -p "$(dirname "$dst")"; cp -p "$src" "$dst"; chmod 600 "$dst"; ok "$f"; fi
  done
  fix_keystore
  head_ "Home-folder keys"
  (cd "$mnt/home" 2>/dev/null && find . -type f) | while read -r f; do
    f="${f#./}"
    if [ -f "$HOME/$f" ]; then ok "~/$f already here, left alone"
    else mkdir -p "$HOME/$(dirname "$f")"; chmod 700 "$HOME/$(dirname "$f")"; cp -p "$mnt/home/$f" "$HOME/$f"; chmod 600 "$HOME/$f"; ok "~/$f"; fi
  done
  echo; echo "Done. Delete $dmg now, then run: $0 check"
}

cmd_check() {
  head_ "Tools"
  local macos clt
  macos="$(sw_vers -productVersion | cut -d. -f1)"
  clt="$(pkgutil --pkg-info=com.apple.pkg.CLTools_Executables 2>/dev/null | awk '/^version/{print $2}' | cut -d. -f1)"
  if [ -z "$clt" ]; then bad "Xcode Command Line Tools not installed: xcode-select --install"
  elif [ "$clt" -lt "$macos" ]; then bad "Command Line Tools $clt on macOS $macos, so Homebrew won't install anything. Update via Software Update, or: sudo rm -rf /Library/Developer/CommandLineTools && sudo xcode-select --install"
  else ok "Command Line Tools $clt"; fi
  local t; for t in node vercel supabase gitleaks brew fastlane; do
    command -v "$t" >/dev/null && ok "$t" || bad "$t missing"
  done
  [ -d "$JDK21" ] && ok "JDK 21" || bad "JDK 21 missing (brew install openjdk@21); Android won't build on newer Java"
  [ -d /opt/homebrew/share/android-commandlinetools ] && ok "Android command-line tools" || bad "Android command-line tools missing (brew install --cask android-commandlinetools)"
  [ -d "$XCODE_DEV" ] && ok "Xcode" || bad "Xcode.app missing (App Store), then xcodebuild -runFirstLaunch"

  head_ "Repo"
  [ "$(git -C "$REPO" config core.hooksPath)" = .githooks ] && ok "gitleaks pre-commit hook on" || bad "hook off: git config core.hooksPath .githooks"
  [ -d "$REPO/chorestar-nextjs/node_modules" ] && ok "web deps installed" || bad "web deps: cd chorestar-nextjs && npm install"
  [ -f "$REPO/supabase/.temp/project-ref" ] && ok "Supabase linked" || bad "Supabase not linked: supabase link --project-ref <ref>"
  [ -f "$REPO/.vercel/project.json" ] && ok "Vercel linked at repo root" || bad "Vercel not linked: vercel link (from the repo root)"

  head_ "Files git can't carry"
  local f; for f in "${REPO_FILES[@]}"; do [ -s "$REPO/$f" ] && ok "$f" || bad "$f"; done
  local jks; jks="$(keystore_path || true)"
  if [ -z "$jks" ]; then bad "upload keystore: no storeFile in keystore.properties"
  elif [ -f "$jks" ]; then ok "upload keystore at storeFile path"
  elif [ -f "$KEYSTORE_DEST" ]; then warn "storeFile points at a missing path; fixing"; fix_keystore
  else bad "upload keystore missing, storeFile points at a path that doesn't exist"; fi
  [ -s "$HOME/$PLAY_KEY" ] && ok "~/$PLAY_KEY" || bad "~/$PLAY_KEY (Play releases, Search Console)"
  ls "$HOME/$ASC_KEY_DIR"/AuthKey_*.p8 >/dev/null 2>&1 && ok "App Store Connect .p8" || bad "~/$ASC_KEY_DIR/AuthKey_*.p8 (iOS release scripts)"

  local env="$REPO/chorestar-nextjs/.env.local"
  if [ -f "$env" ]; then
    head_ ".env.local variables without a real value"
    node - "$env" "$REPO/chorestar-nextjs/.env.local.example" <<'JS'
const fs = require('fs'), { parseEnv } = require('util');
const e = parseEnv(fs.readFileSync(process.argv[2], 'utf8'));
const ex = fs.existsSync(process.argv[3]) ? Object.keys(parseEnv(fs.readFileSync(process.argv[3], 'utf8'))) : [];
const weak = v => v === undefined || v.trim() === '' || v.trim() === '[SENSITIVE]';
// SUPABASE_SERVICE_KEY stands in for the documented SUPABASE_SERVICE_ROLE_KEY.
// VERCEL_* are filled in by Vercel at build time; FIREBASE_PROJECT_ID defaults to the key's own.
const skip = k => (k === 'SUPABASE_SERVICE_ROLE_KEY' && !weak(e.SUPABASE_SERVICE_KEY))
  || k.startsWith('VERCEL_') || k === 'FIREBASE_PROJECT_ID';
const gaps = [...new Set([...Object.keys(e), ...ex])].filter(k => weak(e[k]) && !skip(k)).sort();
console.log(gaps.length ? gaps.map(k => '  \x1b[33m!\x1b[0m ' + k).join('\n') : '  \x1b[32m✓\x1b[0m none');
JS
  fi
  echo
}

cmd_install() {
  command -v brew >/dev/null || { echo "Install Homebrew first: https://brew.sh"; exit 1; }
  brew install node openjdk@21 fastlane gitleaks supabase/tap/supabase
  brew install --cask android-commandlinetools
  command -v vercel >/dev/null || npm i -g vercel
  [ -d "$XCODE_DEV" ] && DEVELOPER_DIR="$XCODE_DEV" xcodebuild -runFirstLaunch || echo "Install Xcode from the App Store, then run: xcodebuild -runFirstLaunch"
  git -C "$REPO" config core.hooksPath .githooks
  (cd "$REPO/chorestar-nextjs" && npm install)
}

cmd_verify() {
  local web="$REPO/chorestar-nextjs"
  run() { head_ "$1"; shift; if "$@"; then ok passed; else bad failed; fi; }
  run "Web unit tests" bash -c "cd '$web' && npm run -s test:unit"
  run "Play key" bash -c "cd '$web' && node scripts/play-release.mjs tracks"
  run "Search Console" bash -c "cd '$web' && node scripts/gsc.mjs sites"
  run "Supabase + Stripe (entitlement audit, read-only)" bash -c "cd '$web' && node --env-file=.env.local scripts/audit-entitlements.mjs"
  run "App Store Connect key" bash -c "cd '$REPO/ChoreStar-iOS' && node scripts/asc.mjs builds"
  if [ -d "$JDK21" ]; then
    run "Android compile (JDK 21)" bash -c "cd '$REPO/ChoreStar-Android-Native' && JAVA_HOME='$JDK21' ./gradlew -q :app:compileDebugKotlin"
  else warn "skipping Android compile, JDK 21 not installed"; fi
}

case "${1:-check}" in
  export)  cmd_export ;;
  import)  shift; cmd_import "$@" ;;
  check)   cmd_check ;;
  install) cmd_install ;;
  verify)  cmd_verify ;;
  *) sed -n '2,11p' "$0"; exit 1 ;;
esac
