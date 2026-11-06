#!/bin/sh
# Render the general product page header and search visual to PNG.
# Chrome writes RGBA; App Store Connect rejects alpha, so flatten via JPEG-free
# path: sips re-saves as a 24-bit PNG after a lossless bmp round trip.
set -e
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
render() { # html out w h
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=FFFFFFFF --window-size="$3,$4" --screenshot="/tmp/$2.raw.png" "file://$PWD/$1" >/dev/null 2>&1
  sips -s format bmp "/tmp/$2.raw.png" --out "/tmp/$2.bmp" >/dev/null
  sips -s format png "/tmp/$2.bmp" --out "$2" >/dev/null
  echo "$2: $(sips -g pixelWidth -g pixelHeight -g hasAlpha "$2" | tail -3 | tr -s ' \n' ' ')"
}
render header-general.html header-general-5244x2950.png 5244 2950
render search-general.html search-general-3840x2560.png 3840 2560
