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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          address: string | null
          agency_type: string
          availability: Database["public"]["Enums"]["availability"]
          capabilities: string[]
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          district: string | null
          id: string
          last_active_at: string
          latitude: number
          longitude: number
          name: string
          owner_id: string
          personnel_count: number
          state: string | null
          status: Database["public"]["Enums"]["agency_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          agency_type: string
          availability?: Database["public"]["Enums"]["availability"]
          capabilities?: string[]
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          id?: string
          last_active_at?: string
          latitude: number
          longitude: number
          name: string
          owner_id: string
          personnel_count?: number
          state?: string | null
          status?: Database["public"]["Enums"]["agency_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          agency_type?: string
          availability?: Database["public"]["Enums"]["availability"]
          capabilities?: string[]
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          id?: string
          last_active_at?: string
          latitude?: number
          longitude?: number
          name?: string
          owner_id?: string
          personnel_count?: number
          state?: string | null
          status?: Database["public"]["Enums"]["agency_status"]
          updated_at?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          from_agency_id: string | null
          id: string
          incident_id: string | null
          message: string
          sender_id: string
          to_agency_id: string | null
        }
        Insert: {
          created_at?: string
          from_agency_id?: string | null
          id?: string
          incident_id?: string | null
          message: string
          sender_id: string
          to_agency_id?: string | null
        }
        Update: {
          created_at?: string
          from_agency_id?: string | null
          id?: string
          incident_id?: string | null
          message?: string
          sender_id?: string
          to_agency_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_from_agency_id_fkey"
            columns: ["from_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_to_agency_id_fkey"
            columns: ["to_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          disaster_type: string
          id: string
          latitude: number
          longitude: number
          people_affected: number
          photo_url: string | null
          reporter_id: string
          severity: number
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          disaster_type: string
          id?: string
          latitude: number
          longitude: number
          people_affected?: number
          photo_url?: string | null
          reporter_id: string
          severity?: number
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          disaster_type?: string
          id?: string
          latitude?: number
          longitude?: number
          people_affected?: number
          photo_url?: string | null
          reporter_id?: string
          severity?: number
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          incident_id: string
          note: string | null
          resource_id: string | null
          status: Database["public"]["Enums"]["mission_status"]
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          incident_id: string
          note?: string | null
          resource_id?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          incident_id?: string
          note?: string | null
          resource_id?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          kind: string
          name: string
          quantity: number
          status: Database["public"]["Enums"]["availability"]
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          kind: string
          name: string
          quantity?: number
          status?: Database["public"]["Enums"]["availability"]
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
          quantity?: number
          status?: Database["public"]["Enums"]["availability"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      owns_agency: { Args: { _agency_id: string }; Returns: boolean }
    }
    Enums: {
      agency_status: "pending" | "verified" | "rejected"
      app_role: "admin" | "agency" | "responder"
      availability: "available" | "on_mission" | "offline"
      incident_status: "reported" | "assigned" | "in_progress" | "resolved"
      mission_status: "pending" | "accepted" | "declined" | "completed"
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
      agency_status: ["pending", "verified", "rejected"],
      app_role: ["admin", "agency", "responder"],
      availability: ["available", "on_mission", "offline"],
      incident_status: ["reported", "assigned", "in_progress", "resolved"],
      mission_status: ["pending", "accepted", "declined", "completed"],
    },
  },
} as const
