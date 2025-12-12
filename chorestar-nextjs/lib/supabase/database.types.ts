export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          family_name: string
          created_at: string
          subscription_tier: 'free' | 'premium' | 'lifetime'
          trial_ends_at: string | null
        }
        Insert: {
          id: string
          email: string
          family_name: string
          created_at?: string
          subscription_tier?: 'free' | 'premium' | 'lifetime'
          trial_ends_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          family_name?: string
          created_at?: string
          subscription_tier?: 'free' | 'premium' | 'lifetime'
          trial_ends_at?: string | null
        }
      }
      children: {
        Row: {
          id: string
          user_id: string
          name: string
          age: number | null
          avatar_color: string | null
          avatar_url: string | null
          avatar_file: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          age?: number | null
          avatar_color?: string | null
          avatar_url?: string | null
          avatar_file?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          age?: number | null
          avatar_color?: string | null
          avatar_url?: string | null
          avatar_file?: string | null
          created_at?: string
        }
      }
      chores: {
        Row: {
          id: string
          child_id: string
          name: string
          reward_cents: number
          is_active: boolean
          sort_order: number | null
          icon: string | null
          category: string | null
          notes: string | null
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          name: string
          reward_cents?: number
          is_active?: boolean
          sort_order?: number | null
          icon?: string | null
          category?: string | null
          notes?: string | null
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          name?: string
          reward_cents?: number
          is_active?: boolean
          sort_order?: number | null
          icon?: string | null
          category?: string | null
          notes?: string | null
          color?: string | null
          created_at?: string
        }
      }
      chore_completions: {
        Row: {
          id: string
          chore_id: string
          day_of_week: number
          week_start: string
          created_at: string
        }
        Insert: {
          id?: string
          chore_id: string
          day_of_week: number
          week_start: string
          created_at?: string
        }
        Update: {
          id?: string
          chore_id?: string
          day_of_week?: number
          week_start?: string
          created_at?: string
        }
      }
      family_settings: {
        Row: {
          id: string
          user_id: string
          daily_reward_cents: number | null
          weekly_bonus_cents: number | null
          timezone: string | null
          currency_code: string | null
          locale: string | null
          date_format: string | null
          language: string | null
          custom_theme: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          daily_reward_cents?: number | null
          weekly_bonus_cents?: number | null
          timezone?: string | null
          currency_code?: string | null
          locale?: string | null
          date_format?: string | null
          language?: string | null
          custom_theme?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          daily_reward_cents?: number | null
          weekly_bonus_cents?: number | null
          timezone?: string | null
          currency_code?: string | null
          locale?: string | null
          date_format?: string | null
          language?: string | null
          custom_theme?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      achievement_badges: {
        Row: {
          id: string
          child_id: string
          user_id: string
          badge_type: string
          earned_date: string
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          user_id: string
          badge_type: string
          earned_date: string
          created_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          user_id?: string
          badge_type?: string
          earned_date?: string
          created_at?: string
        }
      }
      contact_submissions: {
        Row: {
          id: string
          name: string
          email: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          message?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
