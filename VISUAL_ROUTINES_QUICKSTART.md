# 🎉 Visual Routines - Quick Start Guide

## ✨ What's New!

ChoreStar now has **Visual Routines** - a delightful, kid-friendly way to guide children through daily routines step-by-step!

### Features:
- 📋 **4 Pre-built Templates** (Morning, Bedtime, After School, Quick Hygiene)
- 🎨 **80+ Beautiful Icons** from Lucide
- 🎯 **Drag-and-Drop** step reordering
- 👶 **Kid Mode** with large touch targets and animations
- 🎊 **Celebration Screen** with confetti on completion
- ⏱️ **Optional Timers** for each step
- 💰 **Reward Points** integration with existing ChoreStar system
- 🔒 **PIN Protection** for kid access

---

## 🚀 Getting Started (For Parents)

### 1. Create Your First Routine

1. **Go to Dashboard** - You'll see your children listed
2. **Click on a child** to manage their routines
3. **Click "New Routine"** button
4. **Choose a template** or create custom:
   - **Morning Routine** (8 steps: wake up, make bed, brush teeth, etc.)
   - **Bedtime Routine** (7 steps: put away toys, bath, pajamas, etc.)
   - **After School Routine** (5 steps: backpack, wash hands, snack, homework, play)
   - **Quick Hygiene** (4 steps: wash hands, brush teeth, wash face, brush hair)
   - **Custom** - Build from scratch

### 2. Customize the Routine

- **Name it**: e.g., "Emma's Morning Routine"
- **Pick an icon**: Choose from 80+ options (sun, moon, backpack, etc.)
- **Set reward points**: Default is 7¢ (uses your family settings)
- **Add/Edit Steps**:
  - Click "+ Add Step" to add new steps
  - **Drag** steps to reorder (grab the ≡ handle)
  - Set optional timer (e.g., "2 minutes to brush teeth")
  - Pick icons for each step
  - Click trash icon to delete steps

### 3. Save & Done!

Click "Create Routine" and it's ready for your kiddo! 🎉

---

## 👶 Kid Mode - How Kids Use It

### Step 1: Set Up a PIN (One-Time)

1. In **Dashboard → Child Settings**, set a 4-6 digit PIN for your child
2. Tell your child their PIN (make it memorable!)

### Step 2: Kid Login

1. Open `/kid-login` (you can bookmark this!)
2. Kid enters their PIN on the big numeric keypad
3. Tap the numbers - dots appear to show progress
4. Auto-submits when PIN is complete

### Step 3: Choose a Routine

- Kid sees all their routines as **big, colorful cards**
- Each card shows:
  - Routine icon and name
  - Number of steps
  - Points they'll earn (+7¢)
- Tap **"Start"** to begin!

### Step 4: Complete Steps One-by-One

**Full-screen experience with:**
- 🎨 **Huge animated icon** for current step
- 📝 **Big readable title** (e.g., "Brush Your Teeth")
- ⏱️ **Visual timer** (if step has duration)
- ✓ **Giant "Done!" button**
- Progress dots at top (●●○○○)

**What happens:**
1. Read the step
2. Do the task
3. Tap "Done!"
4. Celebrate with animation + sound! ✨
5. Move to next step automatically

### Step 5: Celebration! 🎉

When all steps are complete:
- **Confetti explosion!** 🎊
- "You Did It!" message
- Shows points earned (+7¢)
- Shows how many steps completed
- Shows time taken
- **"Back to Home"** button

---

## 🎨 Parent Dashboard Integration

### Where to Find Routines

**Option 1: Add a "Routines" Tab/Section** (Recommended - TODO)

In your existing dashboard ([`chorestar-nextjs/components/dashboard/dashboard-client.tsx`](chorestar-nextjs/components/dashboard/dashboard-client.tsx)):

```tsx
import { RoutineList } from '@/components/routines/routine-list';

// Add to your tabs or sections:
<RoutineList
  childId={child.id}
  childName={child.name}
  defaultRewardCents={settings?.daily_reward_cents || 7}
/>
```

**Option 2: Child Profile Page**

Add routines to each child's dedicated page:

```tsx
import { RoutineList } from '@/components/routines/routine-list';

export default function ChildProfilePage({ params }) {
  const { childId } = params;

  return (
    <div>
      {/* Existing child info */}
      <RoutineList childId={childId} />
    </div>
  );
}
```

---

## 🔧 Advanced Customization

### Change Default Reward Amount

Edit in Family Settings:
- Dashboard → Settings → Family Settings
- `daily_reward_cents` (default: 7)
- All new routines will use this value

### Add New Icons

Edit [`chorestar-nextjs/lib/constants/routine-icons.ts`](chorestar-nextjs/lib/constants/routine-icons.ts):

```tsx
import { YourIcon } from 'lucide-react';

export const ROUTINE_ICONS = {
  // Add your icon:
  'your-icon-key': {
    icon: YourIcon,
    label: 'Your Icon',
    category: 'general'
  },
  // ... existing icons
};
```

### Create Custom Templates

Edit [`chorestar-nextjs/lib/constants/routine-icons.ts`](chorestar-nextjs/lib/constants/routine-icons.ts):

```tsx
export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  // Add your template:
  {
    name: 'Homework Routine',
    type: 'custom',
    icon: 'do-homework',
    color: '#10b981',
    steps: [
      { title: 'Get supplies', icon: 'organize-desk' },
      { title: 'Math homework', icon: 'practice-math', duration_seconds: 1200 },
      { title: 'Reading homework', icon: 'practice-reading', duration_seconds: 900 },
      { title: 'Pack backpack', icon: 'pack-backpack' },
    ],
  },
  // ... existing templates
];
```

---

## 🎵 Adding Sound Effects (Optional)

### 1. Find Sound Files

Download free sound effects from:
- [Mixkit](https://mixkit.co/free-sound-effects/) (recommended)
- [FreeSound.org](https://freesound.org/)
- [Zapsplat](https://www.zapsplat.com/)

**What you need:**
- `step-complete.mp3` - Short "ding" or "pop" (200-500ms)
- `routine-complete.mp3` - Celebration fanfare (2-3 seconds)

### 2. Add to Project

Place MP3 files here:
```
chorestar-nextjs/public/sounds/
├── step-complete.mp3
└── routine-complete.mp3
```

### 3. That's It!

The `useSound` hook will automatically play them:
- **Step complete** → `step-complete.mp3`
- **Routine complete** → `routine-complete.mp3`

**Note:** Sounds are muted by default on first visit (browser restriction). They'll work after first user interaction.

---

## 📱 Mobile Optimization

The kid mode is **fully optimized for tablets and phones**:

### Touch Targets
- Minimum 80px buttons (88px on tablets)
- Large tap areas for little fingers
- No accidental taps

### Responsive Design
- Works in portrait and landscape
- Font sizes scale automatically
- Large icons and text

### Performance
- Smooth 60fps animations
- Optimized for older devices
- Reduced motion support

---

## 🐛 Troubleshooting

### "Routine not found" Error

**Cause:** Routine was deleted or child doesn't have access

**Fix:**
1. Go to parent dashboard
2. Check if routine exists for that child
3. Verify routine is active (`is_active: true`)

### Kids Can't Login (Invalid PIN)

**Cause:** PIN not set or incorrect

**Fix:**
1. Dashboard → Child Settings
2. Set new PIN for child
3. PINs are hashed for security (can't retrieve old PIN)

### Sounds Not Playing

**Cause:** Browser restrictions (iOS Safari, Chrome)

**Fix:**
- Sounds require user interaction first
- Have kid tap something first
- Check browser console for errors
- Verify MP3 files exist in `/public/sounds/`

### Confetti Not Showing

**Cause:** `canvas-confetti` not installed

**Fix:**
```bash
npm install canvas-confetti
```

### Animations Laggy on Old Devices

**Enable Reduced Motion:**
- System Settings → Accessibility → Reduce Motion
- CSS automatically disables animations

---

## 🎯 Quick Reference: Component Props

### RoutineBuilderModal

```tsx
<RoutineBuilderModal
  open={boolean}
  onOpenChange={(open: boolean) => void}
  childId="uuid"
  defaultRewardCents={7}
  onSuccess={() => void}
  editRoutine={routine | null}  // For editing
/>
```

### RoutineList

```tsx
<RoutineList
  childId="uuid"
  childName="Emma"
  defaultRewardCents={7}
  onPlayRoutine={(routineId) => router.push(`/kid/${childId}/routine/${routineId}`)}
/>
```

### RoutineCard

```tsx
<RoutineCard
  routine={routineObject}
  completedToday={false}
  onEdit={() => void}
  onPlay={() => void}
  showActions={true}
/>
```

---

## 📊 Database Schema Quick Reference

### Tables Created

1. **`routines`** - Stores routine definitions
2. **`routine_steps`** - Stores individual steps (ordered)
3. **`routine_completions`** - Tracks each completion
4. **`child_pins`** - Stores hashed PINs for kid login

### Key Fields

**routines:**
- `child_id` - Which child owns this routine
- `name` - Display name
- `type` - morning | bedtime | afterschool | custom
- `icon` - Icon key from routine-icons.ts
- `color` - Hex color (#6366f1)
- `reward_cents` - Points awarded (e.g., 7 = 7¢)

**routine_steps:**
- `routine_id` - Parent routine
- `title` - Step name
- `icon` - Icon key
- `order_index` - 0-based position
- `duration_seconds` - Optional timer

**routine_completions:**
- `routine_id` - Which routine
- `child_id` - Which child
- `completed_at` - Timestamp
- `points_earned` - Reward cents earned
- `date` - For daily tracking

---

## 🚀 Next Steps

1. **Integrate into Dashboard** - Add RoutineList to your main dashboard
2. **Set Child PINs** - Set up PINs for kids who want to use kid mode
3. **Create First Routine** - Use a template to get started quickly
4. **Test Kid Mode** - Try the full flow: Login → Choose Routine → Complete → Celebrate
5. **Add Sound Effects** - Download free MP3s for extra delight
6. **Customize** - Adjust colors, add icons, create templates

---

## 📚 File Reference

### Components
- [`RoutineBuilderModal`](chorestar-nextjs/components/routines/routine-builder-modal.tsx) - Create/edit routines
- [`RoutineList`](chorestar-nextjs/components/routines/routine-list.tsx) - Display all routines
- [`RoutineCard`](chorestar-nextjs/components/routines/routine-card.tsx) - Individual routine display
- [`RoutineIconPicker`](chorestar-nextjs/components/routines/routine-icon-picker.tsx) - Icon selector
- [`ProgressDots`](chorestar-nextjs/components/routines/progress-dots.tsx) - Step progress
- [`VisualTimer`](chorestar-nextjs/components/routines/visual-timer.tsx) - Countdown timer
- [`CelebrationScreen`](chorestar-nextjs/components/routines/celebration-screen.tsx) - Confetti!

### Pages
- [`/kid-login`](chorestar-nextjs/app/kid-login/page.tsx) - PIN entry
- [`/kid/[childId]`](chorestar-nextjs/app/kid/[childId]/page.tsx) - Kid dashboard
- [`/kid/[childId]/routine/[routineId]`](chorestar-nextjs/app/kid/[childId]/routine/[routineId]/page.tsx) - Routine player

### Hooks
- [`useRoutines`](chorestar-nextjs/lib/hooks/useRoutines.ts) - CRUD operations
- [`useChildPin`](chorestar-nextjs/lib/hooks/useChildPin.ts) - PIN management
- [`useSound`](chorestar-nextjs/lib/hooks/useSound.ts) - Sound effects

### Configuration
- [`routine-icons.ts`](chorestar-nextjs/lib/constants/routine-icons.ts) - Icons & templates
- [`database.types.ts`](chorestar-nextjs/lib/supabase/database.types.ts) - TypeScript types
- [`globals.css`](chorestar-nextjs/app/globals.css) - Kid mode styles (lines 741-904)

### API Routes
- `GET/POST /api/routines` - List & create
- `GET/PATCH/DELETE /api/routines/[id]` - Single routine CRUD
- `POST /api/routines/[id]/complete` - Mark complete
- `POST /api/child-pin` - Set PIN
- `POST /api/child-pin/verify` - Verify PIN

---

## 🎉 You're All Set!

Visual Routines is ready to help kids build great habits with a delightful, engaging experience.

**Questions? Check the [full implementation guide](VISUAL_ROUTINES_IMPLEMENTATION_GUIDE.md)**

**Issues? Report at [GitHub Issues](https://github.com/anthropics/claude-code/issues)**

Happy routine building! 🌟
