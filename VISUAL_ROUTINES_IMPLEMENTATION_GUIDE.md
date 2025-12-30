# Visual Routines Feature - Implementation Guide

## 🎉 Progress Summary

### ✅ Completed (Backend & Infrastructure)

1. **Database Schema** - [`/backend/supabase/migrations/001_add_routines.sql`](backend/supabase/migrations/001_add_routines.sql)
   - ✅ `routines` table with routine_type enum
   - ✅ `routine_steps` table with order_index for sorting
   - ✅ `routine_completions` table for tracking completions
   - ✅ `child_pins` table for kid login authentication
   - ✅ Row-level security (RLS) policies
   - ✅ Database helper functions:
     - `get_child_routine_stats()` - Get completion statistics
     - `get_todays_completed_routine_ids()` - Check today's completions
     - `verify_child_pin()` - PIN authentication (uses crypt for security)
   - ✅ Indexes for optimal performance

2. **TypeScript Types** - [`chorestar-nextjs/lib/supabase/database.types.ts`](chorestar-nextjs/lib/supabase/database.types.ts)
   - ✅ Full type safety for all new tables
   - ✅ Function return types
   - ✅ Enum types for routine_type

3. **Routine Icons System** - [`chorestar-nextjs/lib/constants/routine-icons.ts`](chorestar-nextjs/lib/constants/routine-icons.ts)
   - ✅ 80+ Lucide icons organized by category
   - ✅ Categories: morning, bedtime, hygiene, meals, school, chores, fun, general
   - ✅ Helper functions: `getIconsByCategory()`, `getRoutineIcon()`
   - ✅ 4 predefined routine templates (Morning, Bedtime, After School, Quick Hygiene)

4. **API Routes** - Complete REST API for routines
   - ✅ [`/api/routines`](chorestar-nextjs/app/api/routines/route.ts)
     - GET: List all routines for user's children
     - POST: Create new routine with steps
   - ✅ [`/api/routines/[routineId]`](chorestar-nextjs/app/api/routines/[routineId]/route.ts)
     - GET: Get specific routine with steps
     - PATCH: Update routine and steps
     - DELETE: Delete routine
   - ✅ [`/api/routines/[routineId]/complete`](chorestar-nextjs/app/api/routines/[routineId]/complete/route.ts)
     - POST: Mark routine as completed (awards points)
     - GET: Check if completed today
   - ✅ [`/api/child-pin`](chorestar-nextjs/app/api/child-pin/route.ts)
     - POST: Set/update child PIN (SHA-256 hashed)
     - DELETE: Remove child PIN
   - ✅ [`/api/child-pin/verify`](chorestar-nextjs/app/api/child-pin/verify/route.ts)
     - POST: Verify PIN and return child data

5. **UI Components**
   - ✅ [`RoutineIconPicker`](chorestar-nextjs/components/routines/routine-icon-picker.tsx) - Searchable icon picker with category filter

---

## 🚧 Next Steps (Frontend Components & UI)

### Phase 1: Parent Dashboard Integration (High Priority)

#### 1.1 RoutineBuilder Modal Component
**File:** `chorestar-nextjs/components/routines/routine-builder-modal.tsx`

**Features:**
- Form to create/edit routine
- Name, type selector (morning/bedtime/afterschool/custom)
- Icon picker integration
- Color picker
- Reward cents input (defaults from family settings)
- Step list with drag-and-drop reordering (@dnd-kit)
- Add/edit/delete steps
- Save/cancel buttons
- Template selection (quick start with predefined templates)

**Dependencies:**
- `@dnd-kit/core` - Install: `npm install @dnd-kit/core @dnd-kit/sortable`
- React Hook Form (already installed)
- Zod validation (already installed)

**Example Structure:**
```tsx
'use client';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
// ... component implementation
```

#### 1.2 Routine List Component
**File:** `chorestar-nextjs/components/routines/routine-list.tsx`

**Features:**
- Display routines per child
- Filter by type (morning/bedtime/etc)
- Show completion stats
- Edit/delete buttons
- "Add Routine" button
- Completion indicator for today

#### 1.3 Routine Card Component
**File:** `chorestar-nextjs/components/routines/routine-card.tsx`

**Features:**
- Visual card display with icon and color
- Show number of steps
- Show reward cents
- Completion status badge
- Quick actions (edit, delete, view details)

#### 1.4 Dashboard Integration
**File:** `chorestar-nextjs/components/dashboard/dashboard-client.tsx`

**Changes:**
- Add "Routines" tab/section
- Show routine stats alongside chore stats
- Quick access to create routine per child

---

### Phase 2: Kid Mode (Critical User-Facing Feature)

#### 2.1 Kid PIN Login Page
**File:** `chorestar-nextjs/app/kid-login/page.tsx`

**Features:**
- Full-screen, kid-friendly design
- Large numeric keypad (0-9)
- Visual feedback on button press
- Animated PIN dots (•••)
- Error handling for wrong PIN
- Redirect to kid dashboard on success

**Design Specs:**
- Minimum 80px buttons
- Bright, friendly colors
- Large, rounded font (Nunito)
- Simple animations on tap

#### 2.2 Kid Dashboard
**File:** `chorestar-nextjs/app/kid/[childId]/page.tsx`

**Features:**
- Welcome message with child's name and avatar
- Today's routines as large cards
- Completion checkmarks for finished routines
- "Start" button on each routine
- Logout button (back to PIN entry)

#### 2.3 Routine Player (THE HERO FEATURE)
**File:** `chorestar-nextjs/app/kid/[childId]/routine/[routineId]/page.tsx`

**Features:**
- Full-screen immersive experience
- Large animated icon for current step
- Big readable title (32-48px font)
- Optional visual timer (countdown circle)
- Huge "Done!" button (minimum 80px height, full-width)
- Progress dots at top (e.g., •••○○ for step 3 of 5)
- Smooth transitions between steps (Framer Motion)
- Sound effects on completion
- Exit button (safety)

**Step Completion Animation:**
```tsx
import { motion } from 'framer-motion';

const stepCompleteAnimation = {
  scale: [1, 1.2, 1],
  rotate: [0, 10, -10, 0],
  transition: { duration: 0.5 }
};
```

#### 2.4 Celebration Screen
**File:** `chorestar-nextjs/components/routines/celebration-screen.tsx`

**Features:**
- Full-screen celebration
- Confetti animation (use `canvas-confetti` library)
- "You did it!" message with animation
- Points earned display: "+10¢ ⭐"
- Streak counter (if applicable)
- "Back to Home" button
- Sound effect (fanfare)

**Install:** `npm install canvas-confetti @types/canvas-confetti`

#### 2.5 Visual Timer Component
**File:** `chorestar-nextjs/components/routines/visual-timer.tsx`

**Features:**
- Circular progress ring
- Countdown display (MM:SS)
- Color changes (green → yellow → red)
- Optional time-up alert
- Pause/resume (optional)

#### 2.6 Progress Dots Component
**File:** `chorestar-nextjs/components/routines/progress-dots.tsx`

**Features:**
- Visual step progress (•••○○)
- Animated fill on step completion
- Current step highlighted
- Accessibility labels

---

### Phase 3: Sound Effects & Polish

#### 3.1 Sound Files
**Create:** `chorestar-nextjs/public/sounds/`
- `step-complete.mp3` - Short "ding" or "pop" (200-500ms)
- `routine-complete.mp3` - Celebration fanfare (2-3 seconds)

**Free Sources:**
- [FreeSound.org](https://freesound.org/)
- [Mixkit](https://mixkit.co/free-sound-effects/)
- [Zapsplat](https://www.zapsplat.com/)

#### 3.2 Sound Hook
**File:** `chorestar-nextjs/lib/hooks/useSound.ts`

```tsx
export function useSound() {
  const playStepComplete = () => {
    const audio = new Audio('/sounds/step-complete.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.warn('Audio play failed:', err));
  };

  const playRoutineComplete = () => {
    const audio = new Audio('/sounds/routine-complete.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.warn('Audio play failed:', err));
  };

  return { playStepComplete, playRoutineComplete };
}
```

---

### Phase 4: Data Integration & Stats

#### 4.1 Routine Completion Hook
**File:** `chorestar-nextjs/lib/hooks/useRoutineCompletion.ts`

**Features:**
- Fetch today's completed routines
- Mark routine as complete
- Calculate points earned
- Handle duplicate completion prevention

#### 4.2 Routine Stats Component
**File:** `chorestar-nextjs/components/routines/routine-stats.tsx`

**Features:**
- Weekly completion rate
- Total points earned from routines
- Most completed routine
- Streak tracking

#### 4.3 Weekly Stats Integration
**Update:** `chorestar-nextjs/components/dashboard/weekly-stats.tsx`

**Add:**
- Routine completions to weekly stats
- Combined points (chores + routines)

---

## 🗂️ File Structure Overview

```
chorestar-nextjs/
├── app/
│   ├── api/
│   │   ├── routines/
│   │   │   ├── route.ts ✅
│   │   │   └── [routineId]/
│   │   │       ├── route.ts ✅
│   │   │       └── complete/route.ts ✅
│   │   └── child-pin/
│   │       ├── route.ts ✅
│   │       └── verify/route.ts ✅
│   ├── kid-login/
│   │   └── page.tsx 🚧
│   └── kid/
│       └── [childId]/
│           ├── page.tsx 🚧
│           └── routine/
│               └── [routineId]/
│                   └── page.tsx 🚧
├── components/
│   ├── routines/
│   │   ├── routine-icon-picker.tsx ✅
│   │   ├── routine-builder-modal.tsx 🚧
│   │   ├── routine-list.tsx 🚧
│   │   ├── routine-card.tsx 🚧
│   │   ├── celebration-screen.tsx 🚧
│   │   ├── visual-timer.tsx 🚧
│   │   └── progress-dots.tsx 🚧
│   └── dashboard/
│       └── dashboard-client.tsx (update) 🚧
├── lib/
│   ├── constants/
│   │   └── routine-icons.ts ✅
│   ├── hooks/
│   │   ├── useRoutine.ts 🚧
│   │   ├── useRoutineCompletion.ts 🚧
│   │   └── useSound.ts 🚧
│   └── supabase/
│       └── database.types.ts ✅
├── public/
│   └── sounds/
│       ├── step-complete.mp3 🚧
│       └── routine-complete.mp3 🚧
└── backend/
    └── supabase/
        └── migrations/
            └── 001_add_routines.sql ✅
```

**Legend:**
- ✅ Completed
- 🚧 To be implemented

---

## 🔧 Installation Instructions

### 1. Apply Database Migration

**Option A: Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `backend/supabase/migrations/001_add_routines.sql`
3. Execute the SQL

**Option B: Supabase CLI** (if installed)
```bash
cd backend/supabase
supabase db push
```

### 2. Install Required Dependencies

```bash
cd chorestar-nextjs
npm install @dnd-kit/core @dnd-kit/sortable canvas-confetti
npm install --save-dev @types/canvas-confetti
```

**Already Installed (confirmed):**
- ✅ framer-motion
- ✅ lucide-react
- ✅ react-hook-form
- ✅ zod
- ✅ @tanstack/react-query

### 3. Verify Types

Run type check to ensure no TypeScript errors:
```bash
npm run typecheck
# or
npx tsc --noEmit
```

---

## 🎨 Design Tokens for Kid Mode

**Add to:** `chorestar-nextjs/app/globals.css`

```css
/* Kid Mode Design Tokens */
.kid-mode {
  --kid-primary: #6366f1; /* Indigo */
  --kid-success: #2ed573; /* Bright Green */
  --kid-warning: #fbbf24; /* Amber */
  --kid-error: #ff4757; /* Red */
  --kid-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  /* Typography */
  --kid-font-xl: 3rem; /* 48px */
  --kid-font-lg: 2rem; /* 32px */
  --kid-font-md: 1.5rem; /* 24px */

  /* Spacing */
  --kid-touch-min: 80px; /* Minimum touch target */
  --kid-spacing: 1.5rem; /* 24px */

  /* Animations */
  --kid-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Kid Mode Touch Targets */
.kid-button {
  min-height: var(--kid-touch-min);
  min-width: var(--kid-touch-min);
  font-size: var(--kid-font-md);
  border-radius: 1rem;
  font-weight: 700;
  transition: transform 0.2s var(--kid-bounce);
}

.kid-button:active {
  transform: scale(0.95);
}

/* Confetti Animations */
@keyframes confetti-fall {
  to {
    transform: translateY(100vh) rotate(360deg);
  }
}
```

---

## 🧪 Testing Checklist

### Parent Dashboard Tests
- [ ] Create new routine with template
- [ ] Create custom routine with manual steps
- [ ] Edit existing routine
- [ ] Delete routine
- [ ] Set child PIN
- [ ] Update child PIN
- [ ] Remove child PIN
- [ ] Drag-and-drop step reordering
- [ ] Icon picker search and selection
- [ ] View routine completion stats

### Kid Mode Tests
- [ ] Login with correct PIN
- [ ] Login with wrong PIN (error handling)
- [ ] View available routines
- [ ] Start routine
- [ ] Complete all steps in routine
- [ ] See celebration screen
- [ ] Verify points awarded
- [ ] Check "already completed" message
- [ ] Sound effects play correctly
- [ ] Timer counts down properly (if used)
- [ ] Progress dots update correctly
- [ ] Animations play smoothly
- [ ] Touch targets are large enough (min 80px)

### Mobile/Tablet Tests
- [ ] Landscape orientation works
- [ ] Portrait orientation works
- [ ] Touch targets are accessible
- [ ] Fonts are readable at distance
- [ ] No horizontal scrolling
- [ ] Animations perform smoothly (60fps)
- [ ] Audio plays on iOS Safari (requires user interaction)
- [ ] Audio plays on Android Chrome

---

## 📊 Integration with Existing Reward System

**Current ChoreStar Rewards:**
- Stored in `reward_cents` (7¢ = 7 reward_cents)
- Daily rewards for ANY chore completions
- Weekly bonus for perfect weeks

**Routines Integration:**
- Routines also use `reward_cents` field
- Default value from `family_settings.daily_reward_cents`
- Parents can customize per routine
- Points awarded ONLY on full routine completion
- Tracked separately in `routine_completions` table
- Can be displayed alongside chore earnings in weekly stats

**Future Enhancement Ideas:**
- Combine chore + routine points for achievement badges
- Streak bonuses for consecutive routine completions
- Family-wide routine challenges

---

## 🚀 Deployment Steps

### 1. Database Migration
- [ ] Test migration on development database
- [ ] Backup production database
- [ ] Apply migration to production
- [ ] Verify all tables and RLS policies

### 2. Code Deployment
- [ ] Test all features locally
- [ ] Run type checking: `npm run typecheck`
- [ ] Run build: `npm run build`
- [ ] Deploy to Vercel
- [ ] Verify environment variables

### 3. Post-Deployment
- [ ] Test kid login on production
- [ ] Test routine creation on production
- [ ] Test routine completion flow
- [ ] Monitor error logs
- [ ] Collect user feedback

---

## 🎯 Success Metrics

Track these metrics to measure feature adoption:

1. **Adoption Rate**
   - % of families who create at least one routine
   - Average routines per family

2. **Engagement**
   - Daily routine completions
   - Most popular routine types (morning/bedtime/etc)
   - Average steps per routine

3. **Completion Rate**
   - % of started routines that are completed
   - Average time to complete routines

4. **Points Impact**
   - % of total points from routines vs chores
   - Average points earned per child from routines

---

## 💡 Future Enhancements (Post-MVP)

1. **Advanced Features**
   - Photo step verification (kids take photo proof)
   - Voice instructions (TTS for young kids)
   - Routine sharing (community templates)
   - Adaptive difficulty (suggest removing steps for struggles)

2. **Gamification**
   - Routine completion badges
   - Animated character mascot
   - Unlockable themes/avatars
   - Leaderboards (family-only)

3. **Parent Insights**
   - Routine completion trends
   - Peak completion times
   - Step difficulty analysis
   - Export PDF routine guides

4. **Accessibility**
   - Screen reader support
   - High contrast mode
   - Larger text options
   - Alternative input methods

---

## 📞 Support & Questions

If you encounter any issues or have questions:

1. Check TypeScript errors: `npx tsc --noEmit`
2. Review Supabase logs for RLS policy issues
3. Verify API routes return expected data
4. Test database functions in Supabase SQL Editor

**Common Issues:**

- **RLS Policies:** Ensure user is authenticated for parent routes
- **Child PIN:** Remember PINs are hashed (SHA-256)
- **Audio on Mobile:** iOS requires user interaction before playing audio
- **Framer Motion:** Wrap animated components in `<motion.div>`

---

## ✨ Ready to Continue?

You now have:
- ✅ Complete database schema
- ✅ Full API implementation
- ✅ Icon system with 80+ icons
- ✅ TypeScript types
- ✅ Icon picker component

**Next immediate task:** Build the `RoutineBuilderModal` component to allow parents to create routines!

Run this command to start building the UI:
```bash
cd chorestar-nextjs
npm run dev
```

Then create the parent dashboard integration components following the structure in Phase 1 above.
