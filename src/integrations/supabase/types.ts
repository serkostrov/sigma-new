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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brigade_members: {
        Row: {
          brigade_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          brigade_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          brigade_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brigade_members_brigade_id_fkey"
            columns: ["brigade_id"]
            isOneToOne: false
            referencedRelation: "brigades"
            referencedColumns: ["id"]
          },
        ]
      }
      brigades: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          notes: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          notes?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          notes?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_folders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          object_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          object_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          object_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          doc_type: string
          file_path: string
          folder_id: string | null
          id: string
          mime_type: string
          name: string
          object_id: string
          size_bytes: number
          updated_at: string
          uploaded_by: string | null
          uploaded_by_name: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          file_path: string
          folder_id?: string | null
          id?: string
          mime_type?: string
          name: string
          object_id: string
          size_bytes?: number
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_name?: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_path?: string
          folder_id?: string | null
          id?: string
          mime_type?: string
          name?: string
          object_id?: string
          size_bytes?: number
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_attachments: {
        Row: {
          created_at: string
          expense_id: string
          file_path: string
          id: string
          mime_type: string
          name: string
          size_bytes: number
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          expense_id: string
          file_path: string
          id?: string
          mime_type?: string
          name: string
          size_bytes?: number
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          expense_id?: string
          file_path?: string
          id?: string
          mime_type?: string
          name?: string
          size_bytes?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_attachments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          comment: string | null
          created_at: string
          created_by: string | null
          created_by_name: string
          id: string
          name: string
          object_id: string
          spent_on: string
          stage_id: string | null
          task_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          id?: string
          name: string
          object_id: string
          spent_on?: string
          stage_id?: string | null
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          id?: string
          name?: string
          object_id?: string
          spent_on?: string
          stage_id?: string | null
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "site_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "object_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      object_health_states: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      object_stages: {
        Row: {
          assignee_id: string | null
          created_at: string
          duration_days: number
          finished_at: string | null
          id: string
          name: string
          notes: string
          object_id: string
          sort_order: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          duration_days?: number
          finished_at?: string | null
          id?: string
          name: string
          notes?: string
          object_id: string
          sort_order?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          duration_days?: number
          finished_at?: string | null
          id?: string
          name?: string
          notes?: string
          object_id?: string
          sort_order?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      object_statuses: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      photo_reports: {
        Row: {
          author_id: string | null
          author_name: string
          created_at: string
          id: string
          images: string[]
          note: string
          object_id: string
          review_comment: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          stage_id: string | null
          task_id: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          created_at?: string
          id?: string
          images?: string[]
          note?: string
          object_id: string
          review_comment?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          stage_id?: string | null
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          created_at?: string
          id?: string
          images?: string[]
          note?: string
          object_id?: string
          review_comment?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          stage_id?: string | null
          task_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      site_objects: {
        Row: {
          address: string
          brigade: string
          brigade_id: string | null
          budget: number
          created_at: string
          created_by: string | null
          current_stage: string
          customer: string
          customer_id: string | null
          deadline: string
          foreman: string
          foreman_id: string | null
          health: string
          id: string
          name: string
          progress: number
          responsible: string
          risk: boolean
          stages_status: Json
          status: string
          updated_at: string
        }
        Insert: {
          address?: string
          brigade?: string
          brigade_id?: string | null
          budget?: number
          created_at?: string
          created_by?: string | null
          current_stage?: string
          customer?: string
          customer_id?: string | null
          deadline?: string
          foreman?: string
          foreman_id?: string | null
          health?: string
          id: string
          name: string
          progress?: number
          responsible?: string
          risk?: boolean
          stages_status?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          brigade?: string
          brigade_id?: string | null
          budget?: number
          created_at?: string
          created_by?: string | null
          current_stage?: string
          customer?: string
          customer_id?: string | null
          deadline?: string
          foreman?: string
          foreman_id?: string | null
          health?: string
          id?: string
          name?: string
          progress?: number
          responsible?: string
          risk?: boolean
          stages_status?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_objects_brigade_id_fkey"
            columns: ["brigade_id"]
            isOneToOne: false
            referencedRelation: "brigades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_objects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_objects_foreman_id_fkey"
            columns: ["foreman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_templates: {
        Row: {
          created_at: string
          duration_days: number
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_days?: number
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_days?: number
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          author_id: string
          created_at: string
          edited: boolean
          id: string
          task_id: string
          text: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          edited?: boolean
          id?: string
          task_id: string
          text: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          edited?: boolean
          id?: string
          task_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_priorities: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      task_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string
          id: string
          object_id: string | null
          priority: string
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          stage_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string
          id?: string
          object_id?: string | null
          priority?: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stage_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string
          id?: string
          object_id?: string | null
          priority?: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stage_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tool_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tool_conditions: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tool_movements: {
        Row: {
          created_at: string
          created_by: string | null
          from_assignee_id: string | null
          from_object_id: string | null
          from_status: string | null
          id: string
          note: string
          to_assignee_id: string | null
          to_object_id: string | null
          to_status: string | null
          tool_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_assignee_id?: string | null
          from_object_id?: string | null
          from_status?: string | null
          id?: string
          note?: string
          to_assignee_id?: string | null
          to_object_id?: string | null
          to_status?: string | null
          tool_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_assignee_id?: string | null
          from_object_id?: string | null
          from_status?: string | null
          id?: string
          note?: string
          to_assignee_id?: string | null
          to_object_id?: string | null
          to_status?: string | null
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_movements_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tools: {
        Row: {
          assignee_id: string | null
          category: string
          condition: string
          created_at: string
          created_by: string | null
          id: string
          inv_number: string
          name: string
          notes: string
          object_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          category?: string
          condition?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inv_number?: string
          name: string
          notes?: string
          object_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          category?: string
          condition?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inv_number?: string
          name?: string
          notes?: string
          object_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          enabled: boolean
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
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
    }
    Enums: {
      app_role:
        | "director"
        | "rop"
        | "deputy_director"
        | "foreman"
        | "tools_keeper"
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
      app_role: [
        "director",
        "rop",
        "deputy_director",
        "foreman",
        "tools_keeper",
      ],
    },
  },
} as const
