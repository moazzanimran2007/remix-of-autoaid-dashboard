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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      call_logs: {
        Row: {
          created_at: string | null
          direction: Database["public"]["Enums"]["call_direction"]
          duration: number | null
          from_number: string | null
          id: string
          job_id: string | null
          recording_url: string | null
          telnyx_call_id: string | null
          to_number: string | null
        }
        Insert: {
          created_at?: string | null
          direction: Database["public"]["Enums"]["call_direction"]
          duration?: number | null
          from_number?: string | null
          id?: string
          job_id?: string | null
          recording_url?: string | null
          telnyx_call_id?: string | null
          to_number?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: Database["public"]["Enums"]["call_direction"]
          duration?: number | null
          from_number?: string | null
          id?: string
          job_id?: string | null
          recording_url?: string | null
          telnyx_call_id?: string | null
          to_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          assigned_mechanic_id: string | null
          car_make: string | null
          car_model: string | null
          car_year: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          diagnosis: Json | null
          id: string
          location_lat: number | null
          location_lng: number | null
          photos: string[] | null
          severity: Database["public"]["Enums"]["job_severity"] | null
          status: Database["public"]["Enums"]["job_status"] | null
          symptoms: string | null
          transcript: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_mechanic_id?: string | null
          car_make?: string | null
          car_model?: string | null
          car_year?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          diagnosis?: Json | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          photos?: string[] | null
          severity?: Database["public"]["Enums"]["job_severity"] | null
          status?: Database["public"]["Enums"]["job_status"] | null
          symptoms?: string | null
          transcript?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_mechanic_id?: string | null
          car_make?: string | null
          car_model?: string | null
          car_year?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          diagnosis?: Json | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          photos?: string[] | null
          severity?: Database["public"]["Enums"]["job_severity"] | null
          status?: Database["public"]["Enums"]["job_status"] | null
          symptoms?: string | null
          transcript?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_assigned_mechanic_id_fkey"
            columns: ["assigned_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanics: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phone: string
          status: Database["public"]["Enums"]["mechanic_status"] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phone: string
          status?: Database["public"]["Enums"]["mechanic_status"] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phone?: string
          status?: Database["public"]["Enums"]["mechanic_status"] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      call_direction: "inbound" | "outbound"
      job_severity: "low" | "medium" | "high"
      job_status: "new" | "assigned" | "in-progress" | "resolved"
      mechanic_status: "available" | "busy"
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
      call_direction: ["inbound", "outbound"],
      job_severity: ["low", "medium", "high"],
      job_status: ["new", "assigned", "in-progress", "resolved"],
      mechanic_status: ["available", "busy"],
    },
  },
} as const
