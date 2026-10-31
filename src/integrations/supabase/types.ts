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
      sorteio_numeros: {
        Row: {
          comprador_nome: string
          comprador_telefone: string
          created_at: string
          id: string
          numero: number
          observacao: string
          sorteio_id: string
        }
        Insert: {
          comprador_nome: string
          comprador_telefone?: string
          created_at?: string
          id?: string
          numero: number
          observacao?: string
          sorteio_id: string
        }
        Update: {
          comprador_nome?: string
          comprador_telefone?: string
          created_at?: string
          id?: string
          numero?: number
          observacao?: string
          sorteio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sorteio_numeros_sorteio_id_fkey"
            columns: ["sorteio_id"]
            isOneToOne: false
            referencedRelation: "sorteios"
            referencedColumns: ["id"]
          },
        ]
      }
      sorteio_reservas: {
        Row: {
          comprador_nome: string
          comprador_telefone: string
          created_at: string
          expires_at: string
          id: string
          numeros: number[]
          preco_unitario: number
          sorteio_id: string
          status: string
        }
        Insert: {
          comprador_nome: string
          comprador_telefone?: string
          created_at?: string
          expires_at?: string
          id?: string
          numeros: number[]
          preco_unitario: number
          sorteio_id: string
          status?: string
        }
        Update: {
          comprador_nome?: string
          comprador_telefone?: string
          created_at?: string
          expires_at?: string
          id?: string
          numeros?: number[]
          preco_unitario?: number
          sorteio_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sorteio_reservas_sorteio_id_fkey"
            columns: ["sorteio_id"]
            isOneToOne: false
            referencedRelation: "sorteios"
            referencedColumns: ["id"]
          },
        ]
      }
      sorteios: {
        Row: {
          created_at: string
          descricao: string
          ganhadores_lista: Json
          id: string
          imagem_url: string | null
          nome: string
          numero_final: number
          numero_inicial: number
          owner_id: string
          preco_unitario: number
          premio_unico_por_participante: boolean
          premios_lista: Json
          regras: string
          sorteado_em: string | null
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          descricao?: string
          ganhadores_lista?: Json
          id?: string
          imagem_url?: string | null
          nome: string
          numero_final?: number
          numero_inicial?: number
          owner_id?: string
          preco_unitario?: number
          premio_unico_por_participante?: boolean
          premios_lista?: Json
          regras?: string
          sorteado_em?: string | null
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          descricao?: string
          ganhadores_lista?: Json
          id?: string
          imagem_url?: string | null
          nome?: string
          numero_final?: number
          numero_inicial?: number
          owner_id?: string
          preco_unitario?: number
          premio_unico_por_participante?: boolean
          premios_lista?: Json
          regras?: string
          sorteado_em?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      numeros_reservados: { Args: { _sorteio_id: string }; Returns: number[] }
      numeros_vendidos: { Args: { _sorteio_id: string }; Returns: number[] }
      reservar_numeros: {
        Args: {
          _nome: string
          _numeros: number[]
          _pedido_id: string
          _sorteio_id: string
          _telefone: string
        }
        Returns: Json
      }
      resolver_reserva: {
        Args: { _confirmar: boolean; _pedido_id: string }
        Returns: undefined
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
    Enums: {},
  },
} as const
