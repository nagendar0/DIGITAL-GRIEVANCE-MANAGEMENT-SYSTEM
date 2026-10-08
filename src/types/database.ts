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
      ai_analyses: {
        Row: {
          created_at: string
          duplicate_score: number | null
          grievance_id: string
          id: string
          raw_response: Json | null
          severity_score: number | null
          status: string
          suggested_category: string | null
          suggested_department: string | null
          suggested_priority:
            | Database["public"]["Enums"]["priority_level"]
            | null
          summary: string | null
        }
        Insert: {
          created_at?: string
          duplicate_score?: number | null
          grievance_id: string
          id?: string
          raw_response?: Json | null
          severity_score?: number | null
          status?: string
          suggested_category?: string | null
          suggested_department?: string | null
          suggested_priority?:
            | Database["public"]["Enums"]["priority_level"]
            | null
          summary?: string | null
        }
        Update: {
          created_at?: string
          duplicate_score?: number | null
          grievance_id?: string
          id?: string
          raw_response?: Json | null
          severity_score?: number | null
          status?: string
          suggested_category?: string | null
          suggested_department?: string | null
          suggested_priority?:
            | Database["public"]["Enums"]["priority_level"]
            | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyses_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analyses_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "public_grievances_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_evidence_verifications: {
        Row: {
          confidence: number
          consistency_notes: string
          created_at: string
          evidence_id: string
          grievance_id: string
          id: string
          raw_analysis: Json | null
          reason: string
          relevance_score: number
          result: Database["public"]["Enums"]["verification_result"]
          visual_improvement: boolean
        }
        Insert: {
          confidence: number
          consistency_notes: string
          created_at?: string
          evidence_id: string
          grievance_id: string
          id?: string
          raw_analysis?: Json | null
          reason: string
          relevance_score: number
          result: Database["public"]["Enums"]["verification_result"]
          visual_improvement: boolean
        }
        Update: {
          confidence?: number
          consistency_notes?: string
          created_at?: string
          evidence_id?: string
          grievance_id?: string
          id?: string
          raw_analysis?: Json | null
          reason?: string
          relevance_score?: number
          result?: Database["public"]["Enums"]["verification_result"]
          visual_improvement?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_evidence_verifications_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "completion_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evidence_verifications_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evidence_verifications_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "public_grievances_view"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"]
          created_at: string
          details: Json
          id: string
          ip_address: string | null
          resource_id: string
          resource_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: Database["public"]["Enums"]["user_role"]
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          resource_id: string
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"]
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          resource_id?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      completion_evidence: {
        Row: {
          after_image_url: string
          description: string
          grievance_id: string
          id: string
          latitude: number
          longitude: number
          submitted_at: string
          worker_id: string
        }
        Insert: {
          after_image_url: string
          description: string
          grievance_id: string
          id?: string
          latitude: number
          longitude: number
          submitted_at?: string
          worker_id: string
        }
        Update: {
          after_image_url?: string
          description?: string
          grievance_id?: string
          id?: string
          latitude?: number
          longitude?: number
          submitted_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completion_evidence_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completion_evidence_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "public_grievances_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completion_evidence_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_verifications: {
        Row: {
          allowed_radius_meters: number
          created_at: string
          disclaimer: string
          distance_meters: number
          evidence_id: string
          grievance_id: string
          id: string
          result: Database["public"]["Enums"]["verification_result"]
        }
        Insert: {
          allowed_radius_meters?: number
          created_at?: string
          disclaimer?: string
          distance_meters: number
          evidence_id: string
          grievance_id: string
          id?: string
          result: Database["public"]["Enums"]["verification_result"]
        }
        Update: {
          allowed_radius_meters?: number
          created_at?: string
          disclaimer?: string
          distance_meters?: number
          evidence_id?: string
          grievance_id?: string
          id?: string
          result?: Database["public"]["Enums"]["verification_result"]
        }
        Relationships: [
          {
            foreignKeyName: "gps_verifications_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "completion_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_verifications_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_verifications_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "public_grievances_view"
            referencedColumns: ["id"]
          },
        ]
      }
      grievance_images: {
        Row: {
          created_at: string
          grievance_id: string
          id: string
          is_before: boolean
          storage_path: string
        }
        Insert: {
          created_at?: string
          grievance_id: string
          id?: string
          is_before?: boolean
          storage_path: string
        }
        Update: {
          created_at?: string
          grievance_id?: string
          id?: string
          is_before?: boolean
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "grievance_images_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grievance_images_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "public_grievances_view"
            referencedColumns: ["id"]
          },
        ]
      }
      grievance_status_history: {
        Row: {
          changed_by: string
          created_at: string
          from_status: Database["public"]["Enums"]["grievance_status"] | null
          grievance_id: string
          id: string
          notes: string | null
          to_status: Database["public"]["Enums"]["grievance_status"]
        }
        Insert: {
          changed_by: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["grievance_status"] | null
          grievance_id: string
          id?: string
          notes?: string | null
          to_status: Database["public"]["Enums"]["grievance_status"]
        }
        Update: {
          changed_by?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["grievance_status"] | null
          grievance_id?: string
          id?: string
          notes?: string | null
          to_status?: Database["public"]["Enums"]["grievance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "grievance_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grievance_status_history_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grievance_status_history_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "public_grievances_view"
            referencedColumns: ["id"]
          },
        ]
      }
      grievances: {
        Row: {
          assigned_org_id: string | null
          assigned_worker_id: string | null
          category: string
          citizen_id: string
          closed_at: string | null
          closed_by: string | null
          closure_notes: string | null
          coarse_address: string
          created_at: string
          description: string
          id: string
          latitude: number
          longitude: number
          priority: Database["public"]["Enums"]["priority_level"]
          public_id: string
          status: Database["public"]["Enums"]["grievance_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_org_id?: string | null
          assigned_worker_id?: string | null
          category: string
          citizen_id: string
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          coarse_address: string
          created_at?: string
          description: string
          id?: string
          latitude: number
          longitude: number
          priority?: Database["public"]["Enums"]["priority_level"]
          public_id?: string
          status?: Database["public"]["Enums"]["grievance_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_org_id?: string | null
          assigned_worker_id?: string | null
          category?: string
          citizen_id?: string
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          coarse_address?: string
          created_at?: string
          description?: string
          id?: string
          latitude?: number
          longitude?: number
          priority?: Database["public"]["Enums"]["priority_level"]
          public_id?: string
          status?: Database["public"]["Enums"]["grievance_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grievances_assigned_org_id_fkey"
            columns: ["assigned_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grievances_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grievances_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grievances_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          grievance_id: string | null
          id: string
          is_read: boolean
          message: string
          recipient_id: string
          title: string
        }
        Insert: {
          created_at?: string
          grievance_id?: string | null
          id?: string
          is_read?: boolean
          message: string
          recipient_id: string
          title: string
        }
        Update: {
          created_at?: string
          grievance_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          recipient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "public_grievances_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          official_email: string
          official_phone: string
          registration_number: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["org_status"]
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
          verification_doc_url: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          official_email: string
          official_phone: string
          registration_number: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          verification_doc_url: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          official_email?: string
          official_phone?: string
          registration_number?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          verification_doc_url?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      resolution_reviews: {
        Row: {
          decision: string
          grievance_id: string
          id: string
          reason: string | null
          reviewed_at: string
          reviewer_id: string
        }
        Insert: {
          decision: string
          grievance_id: string
          id?: string
          reason?: string | null
          reviewed_at?: string
          reviewer_id: string
        }
        Update: {
          decision?: string
          grievance_id?: string
          id?: string
          reason?: string | null
          reviewed_at?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resolution_reviews_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolution_reviews_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "public_grievances_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolution_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      worker_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          grievance_id: string
          id: string
          rejection_reason: string | null
          responded_at: string | null
          status: string
          worker_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          grievance_id: string
          id?: string
          rejection_reason?: string | null
          responded_at?: string | null
          status?: string
          worker_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          grievance_id?: string
          id?: string
          rejection_reason?: string | null
          responded_at?: string | null
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_assignments_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "grievances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_assignments_grievance_id_fkey"
            columns: ["grievance_id"]
            isOneToOne: false
            referencedRelation: "public_grievances_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          created_at: string
          current_active_jobs: number
          id: string
          is_active: boolean
          organization_id: string
          skills: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          current_active_jobs?: number
          id?: string
          is_active?: boolean
          organization_id: string
          skills?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          current_active_jobs?: number
          id?: string
          is_active?: boolean
          organization_id?: string
          skills?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_grievances_view: {
        Row: {
          after_image_url: string | null
          before_image_path: string | null
          category: string | null
          closed_at: string | null
          coarse_address: string | null
          created_at: string | null
          description: string | null
          gps_distance_meters: number | null
          id: string | null
          organization_name: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          public_id: string | null
          status: Database["public"]["Enums"]["grievance_status"] | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      grievance_status:
        | "PENDING"
        | "ASSIGNED"
        | "ACCEPTED"
        | "IN_PROGRESS"
        | "AWAITING_VERIFICATION"
        | "VERIFIED"
        | "CLOSED"
        | "REWORK_REQUIRED"
      org_status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "SUSPENDED"
      org_type:
        | "MUNICIPALITY"
        | "PUBLIC_WORKS"
        | "WATER_BOARD"
        | "ELECTRICITY_BOARD"
        | "TRANSPORT_AUTHORITY"
        | "SANITATION"
        | "OTHER"
      priority_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
      user_role: "CITIZEN" | "ORG_MEMBER" | "WORKER" | "PLATFORM_ADMIN"
      verification_result: "PASS" | "FAIL" | "INCONCLUSIVE"
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
      grievance_status: [
        "PENDING",
        "ASSIGNED",
        "ACCEPTED",
        "IN_PROGRESS",
        "AWAITING_VERIFICATION",
        "VERIFIED",
        "CLOSED",
        "REWORK_REQUIRED",
      ],
      org_status: ["PENDING_VERIFICATION", "VERIFIED", "REJECTED", "SUSPENDED"],
      org_type: [
        "MUNICIPALITY",
        "PUBLIC_WORKS",
        "WATER_BOARD",
        "ELECTRICITY_BOARD",
        "TRANSPORT_AUTHORITY",
        "SANITATION",
        "OTHER",
      ],
      priority_level: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      user_role: ["CITIZEN", "ORG_MEMBER", "WORKER", "PLATFORM_ADMIN"],
      verification_result: ["PASS", "FAIL", "INCONCLUSIVE"],
    },
  },
} as const
