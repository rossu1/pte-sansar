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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      email_queue: {
        Row: {
          body: string
          created_at: string
          id: string
          sent_at: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      mock_test_sessions: {
        Row: {
          answers: Json
          current_question_index: number
          exam_type: string
          id: string
          last_saved_at: string
          mode: string
          questions: Json
          scores: Json
          seconds_remaining: number
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          answers?: Json
          current_question_index?: number
          exam_type: string
          id?: string
          last_saved_at?: string
          mode?: string
          questions?: Json
          scores?: Json
          seconds_remaining?: number
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          answers?: Json
          current_question_index?: number
          exam_type?: string
          id?: string
          last_saved_at?: string
          mode?: string
          questions?: Json
          scores?: Json
          seconds_remaining?: number
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      mock_tests: {
        Row: {
          completed_at: string
          exam_type: string
          id: string
          listening_score: number | null
          reading_score: number | null
          speaking_score: number | null
          total_score: number | null
          user_id: string
          writing_score: number | null
        }
        Insert: {
          completed_at?: string
          exam_type: string
          id?: string
          listening_score?: number | null
          reading_score?: number | null
          speaking_score?: number | null
          total_score?: number | null
          user_id: string
          writing_score?: number | null
        }
        Update: {
          completed_at?: string
          exam_type?: string
          id?: string
          listening_score?: number | null
          reading_score?: number | null
          speaking_score?: number | null
          total_score?: number | null
          user_id?: string
          writing_score?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          exam_date: string | null
          exam_type: string | null
          full_name: string | null
          id: string
          last_active_date: string | null
          level: string | null
          role: string
          streak_count: number
          target_score: number | null
          user_id: string
          xp_points: number
        }
        Insert: {
          city?: string | null
          created_at?: string
          exam_date?: string | null
          exam_type?: string | null
          full_name?: string | null
          id?: string
          last_active_date?: string | null
          level?: string | null
          role?: string
          streak_count?: number
          target_score?: number | null
          user_id: string
          xp_points?: number
        }
        Update: {
          city?: string | null
          created_at?: string
          exam_date?: string | null
          exam_type?: string | null
          full_name?: string | null
          id?: string
          last_active_date?: string | null
          level?: string | null
          role?: string
          streak_count?: number
          target_score?: number | null
          user_id?: string
          xp_points?: number
        }
        Relationships: []
      }
      questions: {
        Row: {
          audio_url: string | null
          correct_answer: string | null
          created_at: string
          difficulty: number
          exam_type: string
          id: string
          image_url: string | null
          question_text: string
          question_type: string
          skill: string
        }
        Insert: {
          audio_url?: string | null
          correct_answer?: string | null
          created_at?: string
          difficulty?: number
          exam_type: string
          id?: string
          image_url?: string | null
          question_text: string
          question_type: string
          skill: string
        }
        Update: {
          audio_url?: string | null
          correct_answer?: string | null
          created_at?: string
          difficulty?: number
          exam_type?: string
          id?: string
          image_url?: string | null
          question_text?: string
          question_type?: string
          skill?: string
        }
        Relationships: []
      }
      seen_topics: {
        Row: {
          created_at: string
          id: string
          question_type: string
          skill: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_type: string
          skill: string
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_type?: string
          skill?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          expires_at: string | null
          id: string
          plan: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_attempts: {
        Row: {
          ai_feedback: string | null
          ai_feedback_nepali: string | null
          ai_score: number | null
          created_at: string
          id: string
          question_id: string
          time_taken_seconds: number | null
          user_answer: string | null
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_feedback_nepali?: string | null
          ai_score?: number | null
          created_at?: string
          id?: string
          question_id: string
          time_taken_seconds?: number | null
          user_answer?: string | null
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          ai_feedback_nepali?: string | null
          ai_score?: number | null
          created_at?: string
          id?: string
          question_id?: string
          time_taken_seconds?: number | null
          user_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_streak_and_xp: {
        Args: { p_user_id: string; p_xp_gained?: number }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
