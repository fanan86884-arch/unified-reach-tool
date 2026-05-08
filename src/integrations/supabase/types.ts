export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          id: string
          previous_data: Json | null
          subscriber_id: string | null
          subscriber_name: string
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          id?: string
          previous_data?: Json | null
          subscriber_id?: string | null
          subscriber_name: string
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          previous_data?: Json | null
          subscriber_id?: string | null
          subscriber_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_training_examples: {
        Row: {
          client_data: Json
          created_at: string
          id: string
          is_active: boolean
          plan_content: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          client_data: Json
          created_at?: string
          id?: string
          is_active?: boolean
          plan_content: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          client_data?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          plan_content?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          checked_in_at: string
          client_user_id: string
          id: string
          qr_token: string | null
          subscriber_id: string
        }
        Insert: {
          checked_in_at?: string
          client_user_id: string
          id?: string
          qr_token?: string | null
          subscriber_id: string
        }
        Update: {
          checked_in_at?: string
          client_user_id?: string
          id?: string
          qr_token?: string | null
          subscriber_id?: string
        }
        Relationships: []
      }
      captain_accounts: {
        Row: {
          captain_name: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          captain_name: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          captain_name?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      captains: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      client_accounts: {
        Row: {
          created_at: string
          id: string
          phone: string
          subscriber_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone: string
          subscriber_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string
          subscriber_id?: string
          user_id?: string
        }
        Relationships: []
      }
      client_notes: {
        Row: {
          captain_user_id: string
          created_at: string
          id: string
          note: string
          subscriber_id: string
        }
        Insert: {
          captain_user_id: string
          created_at?: string
          id?: string
          note: string
          subscriber_id: string
        }
        Update: {
          captain_user_id?: string
          created_at?: string
          id?: string
          note?: string
          subscriber_id?: string
        }
        Relationships: []
      }
      client_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          subscriber_id: string
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          subscriber_id: string
          title: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          subscriber_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      contact_settings: {
        Row: {
          captains: Json | null
          created_at: string
          facebook_url: string | null
          id: string
          instagram_url: string | null
          instapay_number: string | null
          store_url: string | null
          updated_at: string
          vodafone_cash_number: string | null
        }
        Insert: {
          captains?: Json | null
          created_at?: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          instapay_number?: string | null
          store_url?: string | null
          updated_at?: string
          vodafone_cash_number?: string | null
        }
        Update: {
          captains?: Json | null
          created_at?: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          instapay_number?: string | null
          store_url?: string | null
          updated_at?: string
          vodafone_cash_number?: string | null
        }
        Relationships: []
      }
      diet_plan_messages: {
        Row: {
          content: string
          created_at: string
          diet_plan_id: string
          id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          diet_plan_id: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          diet_plan_id?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_plan_messages_diet_plan_id_fkey"
            columns: ["diet_plan_id"]
            isOneToOne: false
            referencedRelation: "diet_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_plans: {
        Row: {
          client_data: Json
          client_name: string
          client_phone: string
          created_at: string
          diet_request_id: string | null
          id: string
          plan_content: string
          status: string
          target_calories: number | null
          updated_at: string
        }
        Insert: {
          client_data: Json
          client_name: string
          client_phone: string
          created_at?: string
          diet_request_id?: string | null
          id?: string
          plan_content: string
          status?: string
          target_calories?: number | null
          updated_at?: string
        }
        Update: {
          client_data?: Json
          client_name?: string
          client_phone?: string
          created_at?: string
          diet_request_id?: string | null
          id?: string
          plan_content?: string
          status?: string
          target_calories?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_plans_diet_request_id_fkey"
            columns: ["diet_request_id"]
            isOneToOne: false
            referencedRelation: "diet_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_requests: {
        Row: {
          activity_level: string
          admin_response: string | null
          age: number
          created_at: string
          gender: string
          goal: string
          height: number
          id: string
          meals_count: number
          name: string
          phone: string
          sleep_time: string
          status: string
          updated_at: string
          wake_time: string
          weight: number
        }
        Insert: {
          activity_level: string
          admin_response?: string | null
          age: number
          created_at?: string
          gender: string
          goal: string
          height: number
          id?: string
          meals_count: number
          name: string
          phone: string
          sleep_time: string
          status?: string
          updated_at?: string
          wake_time: string
          weight: number
        }
        Update: {
          activity_level?: string
          admin_response?: string | null
          age?: number
          created_at?: string
          gender?: string
          goal?: string
          height?: number
          id?: string
          meals_count?: number
          name?: string
          phone?: string
          sleep_time?: string
          status?: string
          updated_at?: string
          wake_time?: string
          weight?: number
        }
        Relationships: []
      }
      gym_qr_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          token: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          token?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      renewal_history: {
        Row: {
          end_date: string
          id: string
          paid_amount: number
          renewed_at: string
          start_date: string
          subscriber_id: string
          user_id: string
        }
        Insert: {
          end_date: string
          id?: string
          paid_amount?: number
          renewed_at?: string
          start_date: string
          subscriber_id: string
          user_id: string
        }
        Update: {
          end_date?: string
          id?: string
          paid_amount?: number
          renewed_at?: string
          start_date?: string
          subscriber_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_subscriber"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          annual_price: number
          created_at: string
          id: string
          monthly_price: number
          pricing_tiers: Json
          quarterly_price: number
          semi_annual_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_price?: number
          created_at?: string
          id?: string
          monthly_price?: number
          pricing_tiers?: Json
          quarterly_price?: number
          semi_annual_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_price?: number
          created_at?: string
          id?: string
          monthly_price?: number
          pricing_tiers?: Json
          quarterly_price?: number
          semi_annual_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          captain: string
          created_at: string
          end_date: string
          gender: string
          id: string
          is_archived: boolean
          is_paused: boolean
          name: string
          paid_amount: number
          paused_until: string | null
          phone: string
          remaining_amount: number
          start_date: string
          status: string
          subscription_category: string
          subscription_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          captain?: string
          created_at?: string
          end_date: string
          gender?: string
          id?: string
          is_archived?: boolean
          is_paused?: boolean
          name: string
          paid_amount?: number
          paused_until?: string | null
          phone: string
          remaining_amount?: number
          start_date?: string
          status?: string
          subscription_category?: string
          subscription_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          captain?: string
          created_at?: string
          end_date?: string
          gender?: string
          id?: string
          is_archived?: boolean
          is_paused?: boolean
          name?: string
          paid_amount?: number
          paused_until?: string | null
          phone?: string
          remaining_amount?: number
          start_date?: string
          status?: string
          subscription_category?: string
          subscription_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          name: string
          paid_amount: number
          payment_method: string | null
          phone: string
          remaining_amount: number
          start_date: string
          status: string
          subscription_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          name: string
          paid_amount?: number
          payment_method?: string | null
          phone: string
          remaining_amount?: number
          start_date?: string
          status?: string
          subscription_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          paid_amount?: number
          payment_method?: string | null
          phone?: string
          remaining_amount?: number
          start_date?: string
          status?: string
          subscription_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          created_at: string | null
          key: string
          value: Json
        }
        Insert: {
          created_at?: string | null
          key: string
          value: Json
        }
        Update: {
          created_at?: string | null
          key?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_global: boolean
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id: string
          is_global?: boolean
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_global?: boolean
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      workout_plan_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          workout_plan_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          workout_plan_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_messages_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          client_data: Json
          client_name: string
          client_phone: string
          created_at: string
          id: string
          plan_content: string
          status: string
          updated_at: string
          workout_request_id: string | null
        }
        Insert: {
          client_data: Json
          client_name: string
          client_phone: string
          created_at?: string
          id?: string
          plan_content: string
          status?: string
          updated_at?: string
          workout_request_id?: string | null
        }
        Update: {
          client_data?: Json
          client_name?: string
          client_phone?: string
          created_at?: string
          id?: string
          plan_content?: string
          status?: string
          updated_at?: string
          workout_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_workout_request_id_fkey"
            columns: ["workout_request_id"]
            isOneToOne: false
            referencedRelation: "workout_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          goal: string
          id: string
          name: string
          phone: string
          session_duration: number
          status: string
          training_days: number
          training_level: string
          training_location: string
          updated_at: string
          weight: number
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          goal: string
          id?: string
          name: string
          phone: string
          session_duration: number
          status?: string
          training_days: number
          training_level: string
          training_location: string
          updated_at?: string
          weight: number
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          goal?: string
          id?: string
          name?: string
          phone?: string
          session_duration?: number
          status?: string
          training_days?: number
          training_level?: string
          training_location?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_captain_name: { Args: never; Returns: string }
      get_my_subscriber_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "shift_employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "shift_employee"],
    },
  },
} as const
