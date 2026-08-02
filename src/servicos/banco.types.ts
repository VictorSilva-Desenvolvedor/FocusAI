/*
 * Gerado a partir do schema do Supabase. Não edite à mão.
 *
 * Regerar depois de cada migration:
 *   npm run tipos:banco
 *
 * Sem isto o cliente não sabe o formato de nenhuma tabela e devolve
 * `GenericStringError`, que só passa no typecheck com asserção — exatamente o
 * afrouxamento de portão que o repositório não aceita.
 */
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
      advogados: {
        Row: {
          cidades: string[]
          criado_em: string
          criado_por: string | null
          email: string
          id: string
          modelo_pagamento:
            | Database["public"]["Enums"]["modelo_pagamento"]
            | null
          motivo_perda: string | null
          nome: string
          oab: string
          oab_conferida_em: string | null
          oab_conferida_por: string | null
          porte: Database["public"]["Enums"]["porte_escritorio"]
          potencial_mensal: number
          prioridade_manual:
            | Database["public"]["Enums"]["prioridade_advogado"]
            | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["status_advogado"]
          teses: Database["public"]["Enums"]["tese"][]
          uf: string
          ultima_atividade: string
          usuario_id: string | null
          whatsapp: string
        }
        Insert: {
          cidades?: string[]
          criado_em?: string
          criado_por?: string | null
          email: string
          id?: string
          modelo_pagamento?:
            | Database["public"]["Enums"]["modelo_pagamento"]
            | null
          motivo_perda?: string | null
          nome: string
          oab: string
          oab_conferida_em?: string | null
          oab_conferida_por?: string | null
          porte: Database["public"]["Enums"]["porte_escritorio"]
          potencial_mensal?: number
          prioridade_manual?:
            | Database["public"]["Enums"]["prioridade_advogado"]
            | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_advogado"]
          teses?: Database["public"]["Enums"]["tese"][]
          uf: string
          ultima_atividade?: string
          usuario_id?: string | null
          whatsapp: string
        }
        Update: {
          cidades?: string[]
          criado_em?: string
          criado_por?: string | null
          email?: string
          id?: string
          modelo_pagamento?:
            | Database["public"]["Enums"]["modelo_pagamento"]
            | null
          motivo_perda?: string | null
          nome?: string
          oab?: string
          oab_conferida_em?: string | null
          oab_conferida_por?: string | null
          porte?: Database["public"]["Enums"]["porte_escritorio"]
          potencial_mensal?: number
          prioridade_manual?:
            | Database["public"]["Enums"]["prioridade_advogado"]
            | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_advogado"]
          teses?: Database["public"]["Enums"]["tese"][]
          uf?: string
          ultima_atividade?: string
          usuario_id?: string | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "advogados_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advogados_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          avaliacao_comentario: string | null
          avaliacao_em: string | null
          avaliacao_nota: number | null
          cidade: string
          comprado_em: string | null
          comprado_por: string | null
          criado_em: string
          custo_creditos: number
          devolucao_em: string | null
          devolucao_motivo: string | null
          elegibilidade: Json
          id: string
          motivo_desqualificacao: string | null
          nome: string
          origem: Database["public"]["Enums"]["origem_lead"]
          preco_avulso: number
          reservado_ate: string | null
          reservado_por: string | null
          resumo_qualificacao: string
          reuniao_em: string | null
          status: Database["public"]["Enums"]["status_lead"]
          telefone_mascarado: string | null
          tem_gravacao: boolean
          tese: Database["public"]["Enums"]["tese"]
          uf: string
          ultima_atividade: string
        }
        Insert: {
          avaliacao_comentario?: string | null
          avaliacao_em?: string | null
          avaliacao_nota?: number | null
          cidade: string
          comprado_em?: string | null
          comprado_por?: string | null
          criado_em?: string
          custo_creditos?: number
          devolucao_em?: string | null
          devolucao_motivo?: string | null
          elegibilidade?: Json
          id?: string
          motivo_desqualificacao?: string | null
          nome: string
          origem?: Database["public"]["Enums"]["origem_lead"]
          preco_avulso?: number
          reservado_ate?: string | null
          reservado_por?: string | null
          resumo_qualificacao?: string
          reuniao_em?: string | null
          status?: Database["public"]["Enums"]["status_lead"]
          telefone_mascarado?: string | null
          tem_gravacao?: boolean
          tese: Database["public"]["Enums"]["tese"]
          uf: string
          ultima_atividade?: string
        }
        Update: {
          avaliacao_comentario?: string | null
          avaliacao_em?: string | null
          avaliacao_nota?: number | null
          cidade?: string
          comprado_em?: string | null
          comprado_por?: string | null
          criado_em?: string
          custo_creditos?: number
          devolucao_em?: string | null
          devolucao_motivo?: string | null
          elegibilidade?: Json
          id?: string
          motivo_desqualificacao?: string | null
          nome?: string
          origem?: Database["public"]["Enums"]["origem_lead"]
          preco_avulso?: number
          reservado_ate?: string | null
          reservado_por?: string | null
          resumo_qualificacao?: string
          reuniao_em?: string | null
          status?: Database["public"]["Enums"]["status_lead"]
          telefone_mascarado?: string | null
          tem_gravacao?: boolean
          tese?: Database["public"]["Enums"]["tese"]
          uf?: string
          ultima_atividade?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_comprado_por_fkey"
            columns: ["comprado_por"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_comprado_por_fkey"
            columns: ["comprado_por"]
            isOneToOne: false
            referencedRelation: "advogados_com_saldo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_reservado_por_fkey"
            columns: ["reservado_por"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_reservado_por_fkey"
            columns: ["reservado_por"]
            isOneToOne: false
            referencedRelation: "advogados_com_saldo"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_contato: {
        Row: {
          atualizado_em: string
          lead_id: string
          telefone: string
        }
        Insert: {
          atualizado_em?: string
          lead_id: string
          telefone: string
        }
        Update: {
          atualizado_em?: string
          lead_id?: string
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_contato_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentos_creditos: {
        Row: {
          advogado_id: string
          creditos: number
          descricao: string
          em: string
          id: string
          lead_id: string | null
          origem_confirmacao: string | null
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          valor: number
        }
        Insert: {
          advogado_id: string
          creditos: number
          descricao: string
          em?: string
          id?: string
          lead_id?: string | null
          origem_confirmacao?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          valor?: number
        }
        Update: {
          advogado_id?: string
          creditos?: number
          descricao?: string
          em?: string
          id?: string
          lead_id?: string | null
          origem_confirmacao?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimento"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentos_creditos_advogado_id_fkey"
            columns: ["advogado_id"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentos_creditos_advogado_id_fkey"
            columns: ["advogado_id"]
            isOneToOne: false
            referencedRelation: "advogados_com_saldo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentos_creditos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          advogado_id: string | null
          avatar_iniciais: string
          criado_em: string
          criado_por: string | null
          departamento: string | null
          email: string
          id: string
          nome: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          permissoes: string[]
          status: Database["public"]["Enums"]["status_usuario"]
          ultimo_acesso: string | null
        }
        Insert: {
          advogado_id?: string | null
          avatar_iniciais: string
          criado_em?: string
          criado_por?: string | null
          departamento?: string | null
          email: string
          id: string
          nome: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          permissoes?: string[]
          status?: Database["public"]["Enums"]["status_usuario"]
          ultimo_acesso?: string | null
        }
        Update: {
          advogado_id?: string | null
          avatar_iniciais?: string
          criado_em?: string
          criado_por?: string | null
          departamento?: string | null
          email?: string
          id?: string
          nome?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          permissoes?: string[]
          status?: Database["public"]["Enums"]["status_usuario"]
          ultimo_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfis_advogado_id_fkey"
            columns: ["advogado_id"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfis_advogado_id_fkey"
            columns: ["advogado_id"]
            isOneToOne: false
            referencedRelation: "advogados_com_saldo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfis_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      advogados_com_saldo: {
        Row: {
          cidades: string[] | null
          criado_em: string | null
          criado_por: string | null
          email: string | null
          id: string | null
          modelo_pagamento:
            | Database["public"]["Enums"]["modelo_pagamento"]
            | null
          motivo_perda: string | null
          nome: string | null
          oab: string | null
          oab_conferida_em: string | null
          oab_conferida_por: string | null
          porte: Database["public"]["Enums"]["porte_escritorio"] | null
          potencial_mensal: number | null
          prioridade_manual:
            | Database["public"]["Enums"]["prioridade_advogado"]
            | null
          responsavel_id: string | null
          saldo_creditos: number | null
          status: Database["public"]["Enums"]["status_advogado"] | null
          teses: Database["public"]["Enums"]["tese"][] | null
          uf: string | null
          ultima_atividade: string | null
          usuario_id: string | null
          whatsapp: string | null
        }
        Insert: {
          cidades?: string[] | null
          criado_em?: string | null
          criado_por?: string | null
          email?: string | null
          id?: string | null
          modelo_pagamento?:
            | Database["public"]["Enums"]["modelo_pagamento"]
            | null
          motivo_perda?: string | null
          nome?: string | null
          oab?: string | null
          oab_conferida_em?: string | null
          oab_conferida_por?: string | null
          porte?: Database["public"]["Enums"]["porte_escritorio"] | null
          potencial_mensal?: number | null
          prioridade_manual?:
            | Database["public"]["Enums"]["prioridade_advogado"]
            | null
          responsavel_id?: string | null
          saldo_creditos?: never
          status?: Database["public"]["Enums"]["status_advogado"] | null
          teses?: Database["public"]["Enums"]["tese"][] | null
          uf?: string | null
          ultima_atividade?: string | null
          usuario_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          cidades?: string[] | null
          criado_em?: string | null
          criado_por?: string | null
          email?: string | null
          id?: string | null
          modelo_pagamento?:
            | Database["public"]["Enums"]["modelo_pagamento"]
            | null
          motivo_perda?: string | null
          nome?: string | null
          oab?: string | null
          oab_conferida_em?: string | null
          oab_conferida_por?: string | null
          porte?: Database["public"]["Enums"]["porte_escritorio"] | null
          potencial_mensal?: number | null
          prioridade_manual?:
            | Database["public"]["Enums"]["prioridade_advogado"]
            | null
          responsavel_id?: string | null
          saldo_creditos?: never
          status?: Database["public"]["Enums"]["status_advogado"] | null
          teses?: Database["public"]["Enums"]["tese"][] | null
          uf?: string | null
          ultima_atividade?: string | null
          usuario_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advogados_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advogados_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      advogado_atual: { Args: never; Returns: string }
      avaliar_lead: {
        Args: { p_comentario: string; p_lead_id: string; p_nota: number }
        Returns: Json
      }
      comprar_lead: { Args: { p_lead_id: string }; Returns: Json }
      devolver_lead: {
        Args: { p_lead_id: string; p_motivo: string }
        Returns: Json
      }
      eh_time_interno: { Args: never; Returns: boolean }
      encerrar_reuniao: {
        Args: { p_compareceu: boolean; p_lead_id: string }
        Returns: Json
      }
      liberar_reserva: { Args: { p_lead_id: string }; Returns: undefined }
      mascarar_contato: { Args: { telefone: string }; Returns: string }
      papel_atual: {
        Args: never
        Returns: Database["public"]["Enums"]["papel_usuario"]
      }
      reservar_lead: { Args: { p_lead_id: string }; Returns: Json }
    }
    Enums: {
      modelo_pagamento: "avulso" | "creditos"
      origem_lead: "meta_ads" | "google_ads" | "indicacao" | "organico"
      papel_usuario:
        | "adm"
        | "gerente"
        | "gestor_trafego"
        | "criativo"
        | "analista_conformidade"
        | "operador_ia"
        | "closer"
        | "sdr"
        | "cs"
        | "financeiro"
        | "advogado"
      porte_escritorio: "solo" | "pequeno" | "medio" | "grande"
      prioridade_advogado: "P1" | "P2" | "P3"
      status_advogado:
        | "novo"
        | "em_qualificacao"
        | "qualificado"
        | "acesso_liberado"
        | "modelo_definido"
        | "ativo"
        | "recusado"
        | "perdido"
        | "em_pausa"
      status_lead:
        | "novo"
        | "em_qualificacao"
        | "qualificado"
        | "agendado"
        | "vendido"
        | "atendido"
        | "desqualificado"
        | "nao_atendeu"
        | "no_show"
        | "expirado"
      status_usuario: "ativo" | "convite_pendente" | "inativo"
      tese: "polo_passivo" | "vinculo_empregaticio" | "juros_abusivos"
      tipo_movimento: "compra" | "consumo" | "devolucao" | "ajuste"
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
      modelo_pagamento: ["avulso", "creditos"],
      origem_lead: ["meta_ads", "google_ads", "indicacao", "organico"],
      papel_usuario: [
        "adm",
        "gerente",
        "gestor_trafego",
        "criativo",
        "analista_conformidade",
        "operador_ia",
        "closer",
        "sdr",
        "cs",
        "financeiro",
        "advogado",
      ],
      porte_escritorio: ["solo", "pequeno", "medio", "grande"],
      prioridade_advogado: ["P1", "P2", "P3"],
      status_advogado: [
        "novo",
        "em_qualificacao",
        "qualificado",
        "acesso_liberado",
        "modelo_definido",
        "ativo",
        "recusado",
        "perdido",
        "em_pausa",
      ],
      status_lead: [
        "novo",
        "em_qualificacao",
        "qualificado",
        "agendado",
        "vendido",
        "atendido",
        "desqualificado",
        "nao_atendeu",
        "no_show",
        "expirado",
      ],
      status_usuario: ["ativo", "convite_pendente", "inativo"],
      tese: ["polo_passivo", "vinculo_empregaticio", "juros_abusivos"],
      tipo_movimento: ["compra", "consumo", "devolucao", "ajuste"],
    },
  },
} as const
