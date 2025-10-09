# 🔍 ChoreStar iOS Build Checker Scripts

Two convenient scripts to check your iOS app for errors and warnings from the command line.

## Scripts Overview

### 1. ⚡ `quick-check.sh` - Fast Syntax Check
**Use this most of the time** - validates Swift syntax without full build (< 5 seconds)

```bash
./quick-check.sh                    # Check all Swift files
./quick-check.sh ChoreStar/Views    # Check specific directory
./quick-check.sh path/to/file.swift # Check specific file
```

**Pros:**
- ⚡ Super fast (doesn't compile, just checks syntax)
- 🎯 Catches syntax errors immediately
- 📊 Clean, colored output
- 🔍 Can target specific files/folders

**Use when:**
- You made quick changes and want to verify syntax
- You want to check a specific file or folder
- You need fast feedback during development

---

### 2. 🔨 `check-xcode-build.sh` - Full Build Check
**Use before committing** - complete build with all errors/warnings (1-2 minutes)

```bash
./check-xcode-build.sh
```

**Pros:**
- 🔬 Full Xcode build (catches linking, framework, and build setting issues)
- 📝 Generates detailed log files
- 🎯 Finds issues that syntax check misses
- ✅ Confirms the app actually builds

**Use when:**
- You're about to commit code
- You want to be 100% sure everything compiles
- You need to check for linker errors or framework issues
- You want detailed logs for debugging

---

## Output Examples

### ✨ Success (No Issues)
```
⚡ ChoreStar Quick Check
==========================

📁 Checking: All Swift files in ChoreStar/
📝 Found 25 Swift file(s)

🔍 Analyzing files...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quick Check Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files checked: 25
Files with issues: 0

Total Errors:   0
Total Warnings: 0

✨ All files look good!
```

### ⚠️ Warnings Found
```
📄 ChoreStar/Managers/SupabaseManager.swift
   ⚠ 1 warning(s)
   warning: initialization of immutable value 'x' was never used

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quick Check Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files checked: 25
Files with issues: 1

Total Errors:   0
Total Warnings: 1

⚠️  No errors, but 1 warning(s) found
```

### ❌ Errors Found
```
📄 ChoreStar/Views/AchievementsView.swift
   ✗ 1 error(s)
   error: cannot find 'Achievement' in scope

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quick Check Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files checked: 25
Files with issues: 1

Total Errors:   1
Total Warnings: 0

❌ Found 1 error(s) and 0 warning(s)
```

---

## Log Files (Full Build Only)

After running `check-xcode-build.sh`, you'll find logs in the `build/` directory:

- `build/build.log` - Complete build output
- `build/errors.log` - Errors only
- `build/warnings.log` - Warnings only

---

## Recommended Workflow

```bash
# During development - quick feedback
./quick-check.sh

# Fixed an issue in a specific file
./quick-check.sh ChoreStar/Views/AchievementsView.swift

# Before committing - full verification
./check-xcode-build.sh

# Everything clean? Commit!
git add .
git commit -m "Added achievement system"
```

---

## Requirements

- Xcode Command Line Tools installed
- Swift compiler available in PATH
- Run from the `ChoreStar-iOS/` directory

---

## Troubleshooting

### "Permission denied"
```bash
chmod +x quick-check.sh check-xcode-build.sh
```

### "No Swift files found"
Make sure you're in the `ChoreStar-iOS/` directory

### "xcodebuild: command not found"
Install Xcode Command Line Tools:
```bash
xcode-select --install
```

---

## Tips

💡 **Add to git hooks**: Run `quick-check.sh` in a pre-commit hook  
💡 **CI/CD**: Use `check-xcode-build.sh` in your CI pipeline  
💡 **VSCode**: Add as tasks in `.vscode/tasks.json`  
💡 **Alias**: Add to your `.zshrc` or `.bashrc`:
```bash
alias xcheck='cd /path/to/ChoreStar-iOS && ./quick-check.sh'
alias xbuild='cd /path/to/ChoreStar-iOS && ./check-xcode-build.sh'
```

