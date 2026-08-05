/*
 * Gerado a partir do schema do Supabase. Não edite à mão.
 *
 * Regerar depois de cada migration:
 *   npm run tipos:banco
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
      captacoes: {
        Row: {
          agente_usuario: string | null
          criado_em: string
          evento_id: string | null
          fbc: string | null
          fbclid: string | null
          fbp: string | null
          formulario_id: string | null
          identidade_em: string | null
          ip: unknown
          lead_id: string | null
          pagina: string | null
          respondente_id: string
        }
        Insert: {
          agente_usuario?: string | null
          criado_em?: string
          evento_id?: string | null
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          formulario_id?: string | null
          identidade_em?: string | null
          ip?: unknown
          lead_id?: string | null
          pagina?: string | null
          respondente_id: string
        }
        Update: {
          agente_usuario?: string | null
          criado_em?: string
          evento_id?: string | null
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          formulario_id?: string | null
          identidade_em?: string | null
          ip?: unknown
          lead_id?: string | null
          pagina?: string | null
          respondente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "captacoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chamadas_iniciadas: {
        Row: {
          chamada_id: string
          iniciada_em: string
          lead_id: string
          tentativa: number
        }
        Insert: {
          chamada_id: string
          iniciada_em?: string
          lead_id: string
          tentativa?: number
        }
        Update: {
          chamada_id?: string
          iniciada_em?: string
          lead_id?: string
          tentativa?: number
        }
        Relationships: [
          {
            foreignKeyName: "chamadas_iniciadas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_meta: {
        Row: {
          abandonado_em: string | null
          abandono_motivo: string | null
          enfileirado_em: string
          enviado_em: string | null
          event_id: string
          evento: Database["public"]["Enums"]["evento_meta"]
          id: string
          lead_id: string
          ocorrido_em: string
          tentativas: number
          ultimo_erro: string | null
          valor: number | null
        }
        Insert: {
          abandonado_em?: string | null
          abandono_motivo?: string | null
          enfileirado_em?: string
          enviado_em?: string | null
          event_id: string
          evento: Database["public"]["Enums"]["evento_meta"]
          id?: string
          lead_id: string
          ocorrido_em: string
          tentativas?: number
          ultimo_erro?: string | null
          valor?: number | null
        }
        Update: {
          abandonado_em?: string | null
          abandono_motivo?: string | null
          enfileirado_em?: string
          enviado_em?: string | null
          event_id?: string
          evento?: Database["public"]["Enums"]["evento_meta"]
          id?: string
          lead_id?: string
          ocorrido_em?: string
          tentativas?: number
          ultimo_erro?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_meta_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      formularios_captacao: {
        Row: {
          criado_em: string
          descricao: string
          form_id: string
          tese: Database["public"]["Enums"]["tese"]
        }
        Insert: {
          criado_em?: string
          descricao?: string
          form_id: string
          tese: Database["public"]["Enums"]["tese"]
        }
        Update: {
          criado_em?: string
          descricao?: string
          form_id?: string
          tese?: Database["public"]["Enums"]["tese"]
        }
        Relationships: []
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
      ligacoes: {
        Row: {
          chamada_id: string
          duracao_segundos: number | null
          encerrada_em: string | null
          gravacao_url: string | null
          id: string
          iniciada_em: string | null
          lead_id: string
          motivo_encerramento: string | null
          registrada_em: string
          resultado: Database["public"]["Enums"]["resultado_ligacao"]
          resumo: string | null
          tentativa: number
          transcricao: string | null
        }
        Insert: {
          chamada_id: string
          duracao_segundos?: number | null
          encerrada_em?: string | null
          gravacao_url?: string | null
          id?: string
          iniciada_em?: string | null
          lead_id: string
          motivo_encerramento?: string | null
          registrada_em?: string
          resultado: Database["public"]["Enums"]["resultado_ligacao"]
          resumo?: string | null
          tentativa: number
          transcricao?: string | null
        }
        Update: {
          chamada_id?: string
          duracao_segundos?: number | null
          encerrada_em?: string | null
          gravacao_url?: string | null
          id?: string
          iniciada_em?: string | null
          lead_id?: string
          motivo_encerramento?: string | null
          registrada_em?: string
          resultado?: Database["public"]["Enums"]["resultado_ligacao"]
          resumo?: string | null
          tentativa?: number
          transcricao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ligacoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
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
      abandonar_eventos_meta_vencidos: { Args: never; Returns: number }
      advogado_atual: { Args: never; Returns: string }
      ajustar_creditos_advogado: {
        Args: { p_advogado_id: string; p_creditos: number; p_motivo: string }
        Returns: Json
      }
      alterar_status_usuarios: {
        Args: {
          p_ids: string[]
          p_status: Database["public"]["Enums"]["status_usuario"]
        }
        Returns: Json
      }
      atualizar_usuario: {
        Args: {
          p_departamento?: string
          p_email: string
          p_id: string
          p_nome: string
          p_papel: Database["public"]["Enums"]["papel_usuario"]
          p_permissoes?: string[]
        }
        Returns: Json
      }
      avaliar_lead: {
        Args: { p_comentario: string; p_lead_id: string; p_nota: number }
        Returns: Json
      }
      cidade_meta: { Args: { cidade: string }; Returns: string }
      comprar_lead: { Args: { p_lead_id: string }; Returns: Json }
      conferir_oab_advogado: { Args: { p_advogado_id: string }; Returns: Json }
      criar_advogado: {
        Args: {
          p_cidades: string[]
          p_email: string
          p_nome: string
          p_oab: string
          p_porte: Database["public"]["Enums"]["porte_escritorio"]
          p_potencial_mensal: number
          p_responsavel_id?: string
          p_teses: Database["public"]["Enums"]["tese"][]
          p_uf: string
          p_whatsapp: string
        }
        Returns: Json
      }
      devolver_lead: {
        Args: { p_lead_id: string; p_motivo: string }
        Returns: Json
      }
      eh_time_interno: { Args: never; Returns: boolean }
      encerrar_reuniao: {
        Args: { p_compareceu: boolean; p_lead_id: string }
        Returns: Json
      }
      enfileirar_evento_meta: {
        Args: {
          p_evento: Database["public"]["Enums"]["evento_meta"]
          p_lead_id: string
          p_ocorrido_em: string
          p_valor?: number
        }
        Returns: undefined
      }
      eventos_meta_pendentes: {
        Args: { p_limite?: number }
        Returns: {
          evento: string
          id: string
          lead_id: string
          payload: Json
        }[]
      }
      filtros_pendentes: { Args: { p_lead_id: string }; Returns: string[] }
      hash_meta: { Args: { valor: string }; Returns: string }
      hash_meta_lista: { Args: { valor: string }; Returns: Json }
      inet_ou_nulo: { Args: { valor: string }; Returns: unknown }
      iniciais_do_nome: { Args: { p_nome: string }; Returns: string }
      liberar_reserva: { Args: { p_lead_id: string }; Returns: undefined }
      marcar_evento_meta: {
        Args: { p_erro?: string; p_id: string }
        Returns: undefined
      }
      mascarar_contato: { Args: { telefone: string }; Returns: string }
      mover_advogado: {
        Args: {
          p_advogado_id: string
          p_motivo_perda?: string
          p_status: Database["public"]["Enums"]["status_advogado"]
        }
        Returns: Json
      }
      papel_atual: {
        Args: never
        Returns: Database["public"]["Enums"]["papel_usuario"]
      }
      registrar_agendamento: {
        Args: { p_chamada_id: string; p_reuniao_em: string }
        Returns: Json
      }
      registrar_captacao: {
        Args: {
          p_cidade?: string
          p_elegibilidade?: Json
          p_formulario_id?: string
          p_nome: string
          p_respondente_id: string
          p_resumo?: string
          p_telefone: string
          p_tese?: Database["public"]["Enums"]["tese"]
          p_uf?: string
        }
        Returns: Json
      }
      registrar_chamada_iniciada: {
        Args: { p_chamada_id: string; p_lead_id: string; p_tentativa?: number }
        Returns: Json
      }
      registrar_identidade_captacao: {
        Args: {
          p_agente_usuario?: string
          p_evento_id?: string
          p_fbc?: string
          p_fbclid?: string
          p_fbp?: string
          p_formulario_id?: string
          p_ip?: string
          p_pagina?: string
          p_respondente_id: string
        }
        Returns: Json
      }
      registrar_qualificacao: {
        Args: {
          p_chamada_id: string
          p_duracao_segundos?: number
          p_encerrada_em?: string
          p_gravacao_url?: string
          p_iniciada_em?: string
          p_motivo_encerramento?: string
          p_resultado: Database["public"]["Enums"]["resultado_ligacao"]
          p_resumo?: string
          p_transcricao?: string
        }
        Returns: Json
      }
      reservar_lead: { Args: { p_lead_id: string }; Returns: Json }
      telefone_meta: { Args: { telefone: string }; Returns: string }
      tentativas_do_lead: { Args: { p_lead_id: string }; Returns: number }
      uf_do_ddd: { Args: { telefone: string }; Returns: string }
      vincular_usuario_advogado: {
        Args: { p_advogado_id: string; p_usuario_id: string }
        Returns: Json
      }
    }
    Enums: {
      evento_meta: "Lead" | "LeadQualificado" | "Schedule" | "Purchase"
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
      resultado_ligacao:
        | "qualificado"
        | "desqualificado"
        | "nao_atendeu"
        | "reagendar"
        | "em_andamento"
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
      evento_meta: ["Lead", "LeadQualificado", "Schedule", "Purchase"],
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
      resultado_ligacao: [
        "qualificado",
        "desqualificado",
        "nao_atendeu",
        "reagendar",
        "em_andamento",
      ],
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
