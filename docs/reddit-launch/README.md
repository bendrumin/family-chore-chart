# Reddit Launch Assets (ChoreStar iOS)

Captured 2026-09-07 on the iPhone 17 Pro simulator (iOS 26.5, udid `E786125F-1DFA-4605-BF00-42E7AA2ED478`), demo Star Family (kid code `b5aceec8`, Maya PIN 1234; parent `bsiegel13+uitest-preview@gmail.com`). Status bar overridden to 9:41 / full battery. Native resolution 1206x2622.

## Files

| File | What it shows |
|------|---------------|
| `01-kid-dashboard.png` | Maya's kid dashboard: greeting, Done/To Do/Earned/Streak stat cards, 5 of 10 badges, "Lego Speed Champions" goal bar at $17.00 of $25.00 ($8.00 to go), Morning Routine card (8 steps, Earn $0.50). |
| `02-kid-store.png` | Reward Store section, "$17.00 to spend", all four items with prices: 30 min screen time $2.00, Pick Friday dinner $5.00, Stay up 30 min late $3.00, Family movie pick $4.00, each with a "Get it!" button. |
| `03-kid-dashboard-es.png` | The same kid dashboard running in Spanish (`-AppleLanguages "(es)"`): "¡Hola, Maya!", Hechas/Por hacer/Ganado/Racha, "5 de 10 insignias", "AHORRANDO PARA", "Te faltan $8.00", "Mis rutinas", "8 pasos · Mañana", "Gana $0.50". |
| `04-parent-week-grid.png` | Parent Chores tab > Week segment > Week View grid for Maya: Sun/Mon/Tue/Wed columns (grid scrolls horizontally on phones; Thu-Sat are future days this week) with the mixed pattern: Make your bed checked Sun+Mon, Feed the dog checked Sun, Demo Chore Two empty, Water the plants showing its Mon/Wed/Fri schedule with dashed off-days. |
| `05-parent-dashboard.png` | Parent Family tab: Maya (Age 8, 1/4 today, $0.25 earned, $17.00 unpaid) and Leo (Age 6) member cards with progress rings. |
| `raw-walkthrough.mp4` | Untouched simulator recording of the Morning Routine run, 75.5 s, 1206x2622 h264. First ~9 s are the dashboard while Maestro warms up. |
| `walkthrough.mp4` | Final Reddit cut, 47.5 s, 886x1926 h264 yuv420p, no audio, ~1.9 MB. Opens on the kid dashboard (1.2 s hold), taps Morning Routine, runs all 8 steps at 1.5x, then the "Routine Complete! 8/8 · 59s · $0.50" celebration at natural speed. |

## Re-record recipe

All commands assume the repo root. Every `xcodebuild`/`simctl` call needs `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`; Maestro needs `JAVA_HOME="$(brew --prefix openjdk)/libexec/openjdk.jdk/Contents/Home"`.

```bash
UDID=E786125F-1DFA-4605-BF00-42E7AA2ED478
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
export JAVA_HOME="$(brew --prefix openjdk)/libexec/openjdk.jdk/Contents/Home"

# 1. Boot + pretty status bar
xcrun simctl boot $UDID; xcrun simctl bootstatus $UDID; open -a Simulator
xcrun simctl status_bar $UDID override --time 9:41 --batteryLevel 100 \
  --batteryState charged --cellularBars 4 --operatorName ""

# 2. Build + install
xcodebuild -project ChoreStar-iOS/ChoreStar.xcodeproj -scheme ChoreStar \
  -destination "platform=iOS Simulator,id=$UDID" build
xcrun simctl install $UDID ~/Library/Developer/Xcode/DerivedData/ChoreStar-*/Build/Products/Debug-iphonesimulator/ChoreStar.app

# 3. Kid login (clears state, lands on Maya's dashboard)
maestro --device $UDID test ChoreStar-iOS/maestro/kid-login-nav.yaml
xcrun simctl io $UDID screenshot 01-kid-dashboard.png
# 02: scroll until "Reward Store" is visible (maestro scrollUntilVisible), screenshot

# 4. Spanish (kid session persists across relaunch)
xcrun simctl terminate $UDID com.chorestar.ChoreStar
xcrun simctl launch $UDID com.chorestar.ChoreStar -AppleLanguages "(es)"
xcrun simctl io $UDID screenshot 03-kid-dashboard-es.png

# 5. Video (routine completes once per day; use a fresh day or delete the
#    routine_completions row before re-running)
xcrun simctl terminate $UDID com.chorestar.ChoreStar
xcrun simctl launch $UDID com.chorestar.ChoreStar   # back to English
xcrun simctl io $UDID recordVideo --codec h264 --force raw-walkthrough.mp4 &
sleep 2
maestro --device $UDID test ChoreStar-iOS/maestro/routine-run.yaml
sleep 4; kill -INT %1; wait   # let confetti play, then finalize the file

# 6. Post-process (boundaries found from a 1 fps contact sheet: tap at ~9.5 s,
#    celebration at ~68 s; simctl records VFR so the static dashboard has
#    almost no frames, hence the tpad clone to hold the opening frame)
ffmpeg -i raw-walkthrough.mp4 -filter_complex \
 "[0:v]trim=start=8.5:end=11.0,setpts=PTS-STARTPTS,tpad=start_duration=1.2:start_mode=clone[a];
  [0:v]trim=start=11.0:end=68.0,setpts=(PTS-STARTPTS)/1.5[b];
  [0:v]trim=start=68.0:end=75.5,setpts=PTS-STARTPTS[c];
  [a][b][c]concat=n=3:v=1:a=0,fps=30,scale=886:-2,format=yuv420p[out]" \
 -map "[out]" -c:v libx264 -crf 20 -preset slow -movflags +faststart -an walkthrough.mp4

# 7. Parent shots. Sign in, then EXIT KID MODE by tapping the kid dashboard's
#    "Sign out" button via Maestro (editing the prefs plist on disk does not
#    stick; cfprefsd flushes the cached kid_mode_session right back).
xcrun simctl terminate $UDID com.chorestar.ChoreStar
xcrun simctl launch $UDID com.chorestar.ChoreStar \
  -chorestar-signin bsiegel13+uitest-preview@gmail.com 'RedditDemo2026!'
# maestro: tapOn "Sign out"  (kid dashboard, top right)
xcrun simctl terminate $UDID com.chorestar.ChoreStar
xcrun simctl launch $UDID com.chorestar.ChoreStar -chorestar-tab chores
# maestro: tapOn "Week", then tap the "Week View" segment BY POINT (72%,37%)
# because the page title is also "Week View"; small swipe down to frame rows
xcrun simctl io $UDID screenshot 04-parent-week-grid.png
xcrun simctl terminate $UDID com.chorestar.ChoreStar
xcrun simctl launch $UDID com.chorestar.ChoreStar -chorestar-tab family
xcrun simctl io $UDID screenshot 05-parent-dashboard.png
```

## Update (same day)
The iOS week grid was rebuilt after the first capture round: chore info now sits above its row of seven flexible cells (the web grid shape), so nothing scrolls sideways. 04-parent-week-grid.png shows the full Sun-Sat week on one screen; 04-parent-week-daily.png is the stacked Daily List variant.
