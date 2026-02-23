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
          subscription_type: 'free' | 'premium' | 'lifetime'
          created_at: string
          updated_at: string
          kid_login_code: string | null
        }
        Insert: {
          id: string
          email: string
          family_name: string
          subscription_type?: 'free' | 'premium' | 'lifetime'
          created_at?: string
          updated_at?: string
          kid_login_code?: string | null
        }
        Update: {
          id?: string
          email?: string
          family_name?: string
          subscription_type?: 'free' | 'premium' | 'lifetime'
          created_at?: string
          updated_at?: string
          kid_login_code?: string | null
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
          child_pin: string | null
          child_access_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          age?: number | null
          avatar_color?: string | null
          avatar_url?: string | null
          avatar_file?: string | null
          child_pin?: string | null
          child_access_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          age?: number | null
          avatar_color?: string | null
          avatar_url?: string | null
          avatar_file?: string | null
          child_pin?: string | null
          child_access_enabled?: boolean
          created_at?: string
          updated_at?: string
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
        }
      }
      chore_completions: {
        Row: {
          id: string
          chore_id: string
          day_of_week: number
          week_start: string
          completed_at: string
        }
        Insert: {
          id?: string
          chore_id: string
          day_of_week: number
          week_start: string
          completed_at?: string
        }
        Update: {
          id?: string
          chore_id?: string
          day_of_week?: number
          week_start?: string
          completed_at?: string
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
      family_invites: {
        Row: {
          id: string
          family_id: string
          invited_email: string
          code: string
          status: string
          accepted_by: string | null
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          family_id: string
          invited_email: string
          code: string
          status?: string
          accepted_by?: string | null
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          family_id?: string
          invited_email?: string
          code?: string
          status?: string
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
        }
      }
      family_members: {
        Row: {
          id: string
          user_id: string
          family_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          family_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          family_id?: string
          created_at?: string
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
      routines: {
        Row: {
          id: string
          child_id: string
          name: string
          type: 'morning' | 'bedtime' | 'afterschool' | 'custom'
          icon: string
          color: string
          reward_cents: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          child_id: string
          name: string
          type?: 'morning' | 'bedtime' | 'afterschool' | 'custom'
          icon?: string
          color?: string
          reward_cents?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          name?: string
          type?: 'morning' | 'bedtime' | 'afterschool' | 'custom'
          icon?: string
          color?: string
          reward_cents?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      routine_steps: {
        Row: {
          id: string
          routine_id: string
          title: string
          description: string | null
          icon: string
          order_index: number
          duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          routine_id: string
          title: string
          description?: string | null
          icon?: string
          order_index: number
          duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          routine_id?: string
          title?: string
          description?: string | null
          icon?: string
          order_index?: number
          duration_seconds?: number | null
          created_at?: string
        }
      }
      routine_completions: {
        Row: {
          id: string
          routine_id: string
          child_id: string
          completed_at: string
          duration_seconds: number | null
          steps_completed: number
          steps_total: number
          points_earned: number
          date: string
        }
        Insert: {
          id?: string
          routine_id: string
          child_id: string
          completed_at?: string
          duration_seconds?: number | null
          steps_completed: number
          steps_total: number
          points_earned: number
          date?: string
        }
        Update: {
          id?: string
          routine_id?: string
          child_id?: string
          completed_at?: string
          duration_seconds?: number | null
          steps_completed?: number
          steps_total?: number
          points_earned?: number
          date?: string
        }
      }
      child_pins: {
        Row: {
          id: string
          child_id: string
          pin_hash: string
          pin_salt: string | null
          failed_attempts: number | null
          locked_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          child_id: string
          pin_hash: string
          pin_salt?: string | null
          failed_attempts?: number | null
          locked_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          pin_hash?: string
          pin_salt?: string | null
          failed_attempts?: number | null
          locked_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
          created_at?: string
        }
      }
      kid_sessions: {
        Row: {
          id: string
          child_id: string
          token: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          token?: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          token?: string
          expires_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_child_routine_stats: {
        Args: {
          p_child_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          total_completions: number
          total_steps_completed: number
          total_points_earned: number
          average_duration_seconds: number
          completion_rate: number
        }[]
      }
      get_todays_completed_routine_ids: {
        Args: {
          p_child_id: string
        }
        Returns: {
          routine_id: string
        }[]
      }
      verify_child_pin: {
        Args: {
          p_pin: string
        }
        Returns: {
          child_id: string
          child_name: string
        }[]
      }
    }
    Enums: {
      routine_type: 'morning' | 'bedtime' | 'afterschool' | 'custom'
    }
  }
}
