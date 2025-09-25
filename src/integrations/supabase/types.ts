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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_setores: {
        Row: {
          created_at: string
          id: string
          setor: Database["public"]["Enums"]["setor"]
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          setor: Database["public"]["Enums"]["setor"]
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          setor?: Database["public"]["Enums"]["setor"]
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          access_level: string
          client_id: string
          created_at: string
          id: string
          last_login: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: string
          client_id: string
          created_at?: string
          id?: string
          last_login?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: string
          client_id?: string
          created_at?: string
          id?: string
          last_login?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_admin_setores: {
        Row: {
          admin_id: string
          cliente_id: string
          created_at: string
          id: string
          setor: Database["public"]["Enums"]["setor"]
          updated_at: string
        }
        Insert: {
          admin_id: string
          cliente_id: string
          created_at?: string
          id?: string
          setor: Database["public"]["Enums"]["setor"]
          updated_at?: string
        }
        Update: {
          admin_id?: string
          cliente_id?: string
          created_at?: string
          id?: string
          setor?: Database["public"]["Enums"]["setor"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_admin_setores_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_telefones: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          departamento: string
          id: string
          principal: boolean
          telefone: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          departamento: string
          id?: string
          principal?: boolean
          telefone: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          departamento?: string
          id?: string
          principal?: boolean
          telefone?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_telefones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          admin_responsavel: string | null
          apelido: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cliente_desde: string | null
          cnpj: string | null
          created_at: string
          data_abertura: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          has_system_access: boolean | null
          id: string
          inscricao_estadual: string | null
          nome: string
          numero: string | null
          razao_social: string | null
          regime_tributario: string | null
          setor: Database["public"]["Enums"]["setor"]
          situacao: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          admin_responsavel?: string | null
          apelido?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_desde?: string | null
          cnpj?: string | null
          created_at?: string
          data_abertura?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          has_system_access?: boolean | null
          id?: string
          inscricao_estadual?: string | null
          nome: string
          numero?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          setor: Database["public"]["Enums"]["setor"]
          situacao?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          admin_responsavel?: string | null
          apelido?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_desde?: string | null
          cnpj?: string | null
          created_at?: string
          data_abertura?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          has_system_access?: boolean | null
          id?: string
          inscricao_estadual?: string | null
          nome?: string
          numero?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          setor?: Database["public"]["Enums"]["setor"]
          situacao?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          created_at: string
          file_extension: string | null
          id: string
          mime_type: string | null
          name: string
          ref: string | null
          size: number
          status: string
          storage_path: string
          updated_at: string
          uploaded_by: string
          uploader_setor: Database["public"]["Enums"]["setor"]
          urgent: boolean | null
        }
        Insert: {
          category: string
          created_at?: string
          file_extension?: string | null
          id?: string
          mime_type?: string | null
          name: string
          ref?: string | null
          size: number
          status?: string
          storage_path: string
          updated_at?: string
          uploaded_by: string
          uploader_setor: Database["public"]["Enums"]["setor"]
          urgent?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string
          file_extension?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          ref?: string | null
          size?: number
          status?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
          uploader_setor?: Database["public"]["Enums"]["setor"]
          urgent?: boolean | null
        }
        Relationships: []
      }
      employee_profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          employee_id: string | null
          full_name: string
          hire_date: string | null
          id: string
          permissions: Json | null
          position: string | null
          status: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          employee_id?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          permissions?: Json | null
          position?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          employee_id?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          permissions?: Json | null
          position?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      master_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          from_user_id: string
          from_user_name: string | null
          id: string
          message: string
          message_type: string | null
          to_user_id: string
          to_user_name: string | null
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          from_user_id: string
          from_user_name?: string | null
          id?: string
          message: string
          message_type?: string | null
          to_user_id: string
          to_user_name?: string | null
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          from_user_id?: string
          from_user_name?: string | null
          id?: string
          message?: string
          message_type?: string | null
          to_user_id?: string
          to_user_name?: string | null
          viewed_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          gradient: string | null
          id: string
          telefone: string | null
          theme: string | null
          updated_at: string
          user_id: string
          username: string | null
          whatsapp_e164: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gradient?: string | null
          id?: string
          telefone?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          whatsapp_e164?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gradient?: string | null
          id?: string
          telefone?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          whatsapp_e164?: string | null
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string | null
          id: string
          task_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string | null
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_new"
            referencedColumns: ["id"]
          },
        ]
      }
      task_files: {
        Row: {
          content_type: string | null
          created_at: string | null
          file_name: string
          file_size: number | null
          id: string
          storage_path: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          storage_path: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          storage_path?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tasks: {
        Row: {
          admin_responsavel: string | null
          client_id: string
          created_at: string
          created_by: string
          file_path: string | null
          id: string
          priority: string
          setor_responsavel: Database["public"]["Enums"]["setor"] | null
          status: string
          title: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          admin_responsavel?: string | null
          client_id: string
          created_at?: string
          created_by: string
          file_path?: string | null
          id?: string
          priority: string
          setor_responsavel?: Database["public"]["Enums"]["setor"] | null
          status?: string
          title: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          admin_responsavel?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          file_path?: string | null
          id?: string
          priority?: string
          setor_responsavel?: Database["public"]["Enums"]["setor"] | null
          status?: string
          title?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      tasks_new: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_new_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_new_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      unknown_contacts: {
        Row: {
          admin_notified: boolean | null
          created_at: string | null
          first_message: string | null
          id: string
          last_message_at: string | null
          message_count: number | null
          normalized_phone: string
          phone_number: string
          status: string | null
        }
        Insert: {
          admin_notified?: boolean | null
          created_at?: string | null
          first_message?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          normalized_phone: string
          phone_number: string
          status?: string | null
        }
        Update: {
          admin_notified?: boolean | null
          created_at?: string | null
          first_message?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          normalized_phone?: string
          phone_number?: string
          status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          telefone: string | null
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"] | null
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          telefone?: string | null
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          telefone?: string | null
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          username?: string | null
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          admin_id: string | null
          client_id: string | null
          created_at: string
          id: string
          normalized_phone: string
          phone_number: string
          selected_department: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          normalized_phone: string
          phone_number: string
          selected_department?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          normalized_phone?: string
          phone_number?: string
          selected_department?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          admin_id: string | null
          content: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: string
          error_code: string | null
          error_details: string | null
          from_phone: string
          id: string
          message_type: string
          read_at: string | null
          sent_at: string | null
          status: string | null
          to_phone: string
          wamid: string | null
        }
        Insert: {
          admin_id?: string | null
          content: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: string
          error_code?: string | null
          error_details?: string | null
          from_phone: string
          id?: string
          message_type?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          to_phone: string
          wamid?: string | null
        }
        Update: {
          admin_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_details?: string | null
          from_phone?: string
          id?: string
          message_type?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          to_phone?: string
          wamid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_orphan_auth_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_orphan_clients: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_orphan_user_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_client_after_user: {
        Args: { client_data: Json; user_id_param: string }
        Returns: string
      }
      create_internal_user: {
        Args: {
          user_email: string
          user_password: string
          user_telefone?: string
          user_username?: string
        }
        Returns: string
      }
      debug_auth_context: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_user_email: string
          current_user_id: string
          has_profile: boolean
          matching_client_id: string
        }[]
      }
      ensure_admin_exists: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      ensure_master_admin_exists: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      find_admin_by_client_and_setor: {
        Args: {
          client_id_param: string
          setor_param: Database["public"]["Enums"]["setor"]
        }
        Returns: string
      }
      find_available_admin_with_setor: {
        Args: {
          client_id_param: string
          setor_param: Database["public"]["Enums"]["setor"]
        }
        Returns: {
          admin_id: string
          admin_username: string
        }[]
      }
      find_client_by_phone: {
        Args: { phone_input: string }
        Returns: {
          email: string
          id: string
          nome: string
          telefone: string
        }[]
      }
      get_user_profile_type: {
        Args: { user_id_param: string }
        Returns: string
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      involves_admin_role: {
        Args: { target_role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_master_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_master_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_user_coordenacao: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_user_master_admin: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      mark_messages_as_viewed: {
        Args: { sender_id: string; viewer_id: string }
        Returns: undefined
      }
      normalize_phone: {
        Args: { phone_text: string }
        Returns: string
      }
      promote_user_to_admin: {
        Args: { user_email: string }
        Returns: boolean
      }
      promote_user_to_master_admin: {
        Args: { user_email: string }
        Returns: boolean
      }
      register_unknown_contact: {
        Args: { message_text: string; phone_input: string }
        Returns: string
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sync_and_cleanup_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sync_auth_users_with_profiles_and_roles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sync_auth_with_app_tables: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sync_existing_admins_to_setores: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sync_profiles_user_roles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_missing_display_names: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_can_view_client_tasks: {
        Args: { client_id: string; uid?: string }
        Returns: boolean
      }
      user_has_setor_access: {
        Args: {
          setor_param: Database["public"]["Enums"]["setor"]
          user_id_param: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin"
      setor:
        | "PESSOAL"
        | "FISCAL"
        | "CONTABIL"
        | "PLANEJAMENTO"
        | "TODOS"
        | "CADASTRO"
        | "COORDENACAO"
      task_priority: "baixa" | "media" | "alta" | "urgente"
      task_status: "aberta" | "em_andamento" | "concluida" | "arquivada"
      user_type: "employee" | "client"
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
      app_role: ["user", "admin"],
      setor: [
        "PESSOAL",
        "FISCAL",
        "CONTABIL",
        "PLANEJAMENTO",
        "TODOS",
        "CADASTRO",
        "COORDENACAO",
      ],
      task_priority: ["baixa", "media", "alta", "urgente"],
      task_status: ["aberta", "em_andamento", "concluida", "arquivada"],
      user_type: ["employee", "client"],
    },
  },
} as const
