# 💰 ChoreStar Earnings System - How It Works

## 🎯 Core Concept: Perfect Day Rewards

### The Rule
**You only earn money when ALL chores for a complete day are done!**

## 💵 How Much Do You Earn?

### Fixed Daily Reward
- **NOT** based on individual chore values
- **Fixed amount per perfect day** from family settings
- Default: **7¢** (or customize in settings)
- Example: If daily reward is set to 25¢, every perfect day earns 25¢

### Perfect Day Definition
A "perfect day" means:
- ✅ ALL assigned chores are completed
- ✅ For that specific day of the week
- ❌ Even 4 out of 5 chores = $0.00 (no partial credit!)

## 📊 Examples

### Example 1: Monday with 5 Chores (Daily Reward: $0.25)

**Scenario A - Incomplete Day:**
```
Monday:
  ✓ Make Bed
  ✓ Feed Dog
  ✓ Sweep Floor
  ○ Dishes
  ○ Take Out Trash

Result: 3/5 complete = $0.00 earned ❌
```

**Scenario B - Perfect Day:**
```
Monday:
  ✓ Make Bed
  ✓ Feed Dog
  ✓ Sweep Floor
  ✓ Dishes
  ✓ Take Out Trash

Result: 5/5 complete = $0.25 earned! ✅
```

### Example 2: Full Week (Daily Reward: $0.07)

```
Week Overview:
  Sunday:    5/5 ✅ → Earn $0.07
  Monday:    4/5 ❌ → Earn $0.00
  Tuesday:   5/5 ✅ → Earn $0.07
  Wednesday: 5/5 ✅ → Earn $0.07
  Thursday:  3/5 ❌ → Earn $0.00
  Friday:    5/5 ✅ → Earn $0.07
  Saturday:  0/5 ❌ → Earn $0.00

Week Total: 4 perfect days × $0.07 = $0.28
```

## 🎨 Visual Indicators

### In Week Calendar Views

#### Grid View
```
┌──────────┬──────┬──────┬──────┬──────┐
│ Chore    │ Sun  │ Mon  │ Tue  │ Wed  │
│          │$0.07 │      │$0.07 │$0.07 │
├──────────┼──────┼──────┼──────┼──────┤
│ 🛏️ Bed   │  ✓   │  ✓   │  ✓   │  ✓   │
│ 🐕 Dog   │  ✓   │      │  ✓   │  ✓   │
│ 🧹 Sweep │  ✓   │  ✓   │  ✓   │  ✓   │
└──────────┴──────┴──────┴──────┴──────┘
            ⭐           ⭐     ⭐
     Perfect!     Not     Perfect! Perfect!
                Complete
```

#### Daily List View
```
📅 Sunday
   5 of 5 completed  ⭐ $0.07
   [Progress shows gold star ⭐]
   
📅 Monday  
   4 of 5 completed  [====80%]
   (No earnings shown - not all complete)
   
📅 Tuesday
   5 of 5 completed  ⭐ $0.07
   [Progress shows gold star ⭐]
```

### Visual Cues for Perfect Days
- ⭐ **Gold star** in progress circle (instead of %)
- 💰 **Earnings badge** appears (e.g., "$0.07")
- 🌟 **Amber/gold color** on progress ring
- ✨ **Confetti** when completing final chore on today

## 🔧 Technical Implementation

### Database: `family_settings` Table
```sql
- daily_reward_cents: INTEGER DEFAULT 7
- weekly_bonus_cents: INTEGER DEFAULT 1
- timezone: TEXT
```

### iOS Code
```swift
// Only returns money if ALL chores complete for that day
func calculateDayEarnings(for childId: UUID, dayOfWeek: Int) -> Double {
    if isPerfectDay(for: childId, dayOfWeek: dayOfWeek) {
        let dailyRewardCents = familySettings?.dailyRewardCents ?? 7
        return Double(dailyRewardCents) / 100.0  // Convert cents to dollars
    }
    return 0.0  // Not a perfect day = no earnings
}
```

### Key Methods
- `isPerfectDay(for: childId, dayOfWeek:)` - Checks if ALL chores complete
- `calculateDayEarnings(for: childId, dayOfWeek:)` - Returns fixed reward or $0
- `calculateTodayEarnings(for: childId)` - Convenience for today

## 📱 Where Earnings Are Shown

### 1. **Week Summary Card** (Top of Week Calendar)
Shows:
- **Perfect Days**: Count of days with all chores complete
- **Earned**: Total $ from perfect days this week
- **Complete**: Overall percentage

### 2. **Grid View Headers**
Each day column shows:
- **$X.XX** badge when that day is perfect
- Hidden when day is incomplete

### 3. **Daily List Cards**
Each day card shows:
- **⭐ $X.XX** badge when all chores complete
- Gold star in progress circle
- Hidden when incomplete

### 4. **Child Detail Views**
Main screens show:
- **Today's earnings** (if today is perfect)
- Always uses fixed daily reward from settings

## ⚙️ Customizing the Daily Reward

### From Web App Settings
Parents can change the daily reward amount:
1. Go to Settings in web app
2. Adjust "Daily Reward" (in cents)
3. iOS app automatically loads the updated value
4. All calculations use the new amount

### Default Values
- **Daily Reward**: 7¢ ($0.07)
- **Weekly Bonus**: 1¢ (if all 7 days perfect)

## 🎓 Teaching Moment for Kids

This system teaches:
- **Completion matters** - Finishing what you start
- **Consistency** - Every chore counts
- **No shortcuts** - Can't skip chores
- **Fair rewards** - Same amount per perfect day

## ❓ FAQs

**Q: Why don't individual chore values matter?**
A: The fixed daily reward makes it simple and fair - complete your full day, get your reward!

**Q: Can I earn partial credit?**
A: No! It's all or nothing. This encourages finishing all chores.

**Q: What if different days have different chores?**
A: The reward is the same for each perfect day, regardless of how many or which chores.

**Q: Can the reward amount be changed?**
A: Yes! Parents can adjust it in family settings. The app uses whatever is configured.

## 🎉 Summary

- ✅ Fixed daily reward (default 7¢ = $0.07)
- ✅ Only earned when ALL chores for a day are complete
- ✅ Visual indicators show when you've earned it
- ✅ Week view shows total earned from all perfect days
- ✅ Loads from database settings (customizable!)

**Remember**: Complete ALL your chores to earn your daily reward! 🌟

