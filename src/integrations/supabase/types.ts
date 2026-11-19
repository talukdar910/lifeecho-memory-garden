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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_invites: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      archive_entries: {
        Row: {
          archived_at: string
          avatar_path: string | null
          biography: string | null
          country: string | null
          date_of_birth: string | null
          date_of_death: string | null
          death_report_id: string | null
          full_name: string
          id: string
          is_demo: boolean
          person_id: string
          profile_number: number
          published: boolean
        }
        Insert: {
          archived_at?: string
          avatar_path?: string | null
          biography?: string | null
          country?: string | null
          date_of_birth?: string | null
          date_of_death?: string | null
          death_report_id?: string | null
          full_name: string
          id?: string
          is_demo?: boolean
          person_id: string
          profile_number?: number
          published?: boolean
        }
        Update: {
          archived_at?: string
          avatar_path?: string | null
          biography?: string | null
          country?: string | null
          date_of_birth?: string | null
          date_of_death?: string | null
          death_report_id?: string | null
          full_name?: string
          id?: string
          is_demo?: boolean
          person_id?: string
          profile_number?: number
          published?: boolean
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          created_at: string
          id: string
          memory_id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          memory_id: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          memory_id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "life_memories"
            referencedColumns: ["id"]
          },
        ]
      }
      death_reports: {
        Row: {
          created_at: string
          date_of_death: string
          id: string
          notes: string | null
          proof_path: string
          relationship: string | null
          reporter_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subject_email: string
          subject_full_name: string
          subject_id: string | null
        }
        Insert: {
          created_at?: string
          date_of_death: string
          id?: string
          notes?: string | null
          proof_path: string
          relationship?: string | null
          reporter_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject_email: string
          subject_full_name: string
          subject_id?: string | null
        }
        Update: {
          created_at?: string
          date_of_death?: string
          id?: string
          notes?: string | null
          proof_path?: string
          relationship?: string | null
          reporter_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject_email?: string
          subject_full_name?: string
          subject_id?: string | null
        }
        Relationships: []
      }
      life_memories: {
        Row: {
          body: string | null
          created_at: string
          emotion: string | null
          hidden: boolean
          id: string
          kind: string
          media_path: string | null
          memory_date: string | null
          owner_id: string
          privacy: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          emotion?: string | null
          hidden?: boolean
          id?: string
          kind: string
          media_path?: string | null
          memory_date?: string | null
          owner_id: string
          privacy?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          emotion?: string | null
          hidden?: boolean
          id?: string
          kind?: string
          media_path?: string | null
          memory_date?: string | null
          owner_id?: string
          privacy?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      memorials: {
        Row: {
          biography: string | null
          birth_date: string | null
          birthplace: string | null
          cover_path: string | null
          created_at: string
          death_date: string | null
          epitaph: string | null
          full_name: string
          id: string
          owner_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          biography?: string | null
          birth_date?: string | null
          birthplace?: string | null
          cover_path?: string | null
          created_at?: string
          death_date?: string | null
          epitaph?: string | null
          full_name: string
          id?: string
          owner_id: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          biography?: string | null
          birth_date?: string | null
          birthplace?: string | null
          cover_path?: string | null
          created_at?: string
          death_date?: string | null
          epitaph?: string | null
          full_name?: string
          id?: string
          owner_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          media_path: string | null
          memorial_id: string
          memory_date: string | null
          owner_id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          media_path?: string | null
          memorial_id: string
          memory_date?: string | null
          owner_id: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          media_path?: string | null
          memorial_id?: string
          memory_date?: string | null
          owner_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          archived_at: string | null
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          date_of_death: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          last_active_at: string
          preferred_language: string
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_death?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_active_at?: string
          preferred_language?: string
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_death?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_active_at?: string
          preferred_language?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_member: { Args: { _user_id: string }; Returns: boolean }
      my_death_reports: {
        Args: never
        Returns: {
          created_at: string
          date_of_death: string
          id: string
          review_note: string
          status: string
          subject_full_name: string
        }[]
      }
      report_memory: {
        Args: { _memory_id: string; _reason: string }
        Returns: undefined
      }
      resolve_content_report: {
        Args: { _hide_memory: boolean; _report_id: string }
        Returns: undefined
      }
      review_death_report: {
        Args: { _approve: boolean; _note: string; _report_id: string }
        Returns: undefined
      }
      set_archive_published: {
        Args: { _entry_id: string; _published: boolean }
        Returns: undefined
      }
      set_memory_hidden: {
        Args: { _hidden: boolean; _memory_id: string }
        Returns: undefined
      }
      submit_death_report: {
        Args: {
          _date_of_death: string
          _email: string
          _full_name: string
          _notes: string
          _proof_path: string
          _relationship: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
