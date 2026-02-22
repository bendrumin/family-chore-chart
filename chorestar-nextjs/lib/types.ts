import type { Database } from '@/lib/supabase/database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Child = Database['public']['Tables']['children']['Row']
export type Chore = Database['public']['Tables']['chores']['Row']
export type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']
export type FamilySettings = Database['public']['Tables']['family_settings']['Row']
export type AchievementBadge = Database['public']['Tables']['achievement_badges']['Row']
export type Routine = Database['public']['Tables']['routines']['Row']
export type RoutineStep = Database['public']['Tables']['routine_steps']['Row']
