export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      catalogo_treinamentos: {
        Row: {
          ch_formacao: number
          ch_formacao_obrigatoria: boolean | null
          ch_reciclagem: number
          ch_reciclagem_obrigatoria: boolean | null
          created_at: string | null
          empresa_id: string
          id: string
          nome: string
          norma: string
          updated_at: string | null
          validade: string
        }
        Insert: {
          ch_formacao?: number
          ch_formacao_obrigatoria?: boolean | null
          ch_reciclagem?: number
          ch_reciclagem_obrigatoria?: boolean | null
          created_at?: string | null
          empresa_id: string
          id?: string
          nome: string
          norma: string
          updated_at?: string | null
          validade?: string
        }
        Update: {
          ch_formacao?: number
          ch_formacao_obrigatoria?: boolean | null
          ch_reciclagem?: number
          ch_reciclagem_obrigatoria?: boolean | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          norma?: string
          updated_at?: string | null
          validade?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_treinamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_sst: {
        Row: {
          cliente_empresa_id: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          empresa_sst_id: string
          id: string
          nome: string
          responsavel: string | null
          responsavel_id: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cliente_empresa_id?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa_sst_id: string
          id?: string
          nome: string
          responsavel?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cliente_empresa_id?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa_sst_id?: string
          id?: string
          nome?: string
          responsavel?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_sst_cliente_empresa_id_fkey"
            columns: ["cliente_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_sst_empresa_sst_id_fkey"
            columns: ["empresa_sst_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_sst_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          id: string
          empresa_id: string
          matricula: string | null
          nome: string
          cpf: string | null
          cargo: string | null
          setor: string | null
          grupo_homogeneo_id: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          matricula?: string | null
          nome: string
          cpf?: string | null
          cargo?: string | null
          setor?: string | null
          grupo_homogeneo_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          matricula?: string | null
          nome?: string
          cpf?: string | null
          cargo?: string | null
          setor?: string | null
          grupo_homogeneo_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_grupo_homogeneo_id_fkey"
            columns: ["grupo_homogeneo_id"]
            isOneToOne: false
            referencedRelation: "grupos_homogeneos"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores_treinamentos: {
        Row: {
          id: string
          colaborador_id: string
          treinamento_id: string
          status: string | null
          data_realizacao: string | null
          created_at: string
        }
        Insert: {
          id?: string
          colaborador_id: string
          treinamento_id: string
          status?: string | null
          data_realizacao?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          colaborador_id?: string
          treinamento_id?: string
          status?: string | null
          data_realizacao?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_treinamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_treinamentos_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "catalogo_treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores_treinamentos_datas: {
        Row: {
          id: string
          colaborador_treinamento_id: string
          data: string
          inicio: string | null
          fim: string | null
          horas: number | null
          created_at: string
        }
        Insert: {
          id?: string
          colaborador_treinamento_id: string
          data: string
          inicio?: string | null
          fim?: string | null
          horas?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          colaborador_treinamento_id?: string
          data?: string
          inicio?: string | null
          fim?: string | null
          horas?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_colaborador_treinamento"
            columns: ["colaborador_treinamento_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      comercial_funil: {
        Row: {
          created_at: string
          email: string | null
          empresa_id: string | null
          etapa: string
          id: string
          nome_lead: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          etapa?: string
          id?: string
          nome_lead: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          etapa?: string
          id?: string
          nome_lead?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comercial_funil_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_empresa: {
        Row: {
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string
          empresa_id: string
          id: string
          logo_url: string | null
          tema: string | null
          updated_at: string
        }
        Insert: {
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          logo_url?: string | null
          tema?: string | null
          updated_at?: string
        }
        Update: {
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          logo_url?: string | null
          tema?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          numero: string | null
          possui_gestao_treinamentos: boolean | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_empresa"]
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          numero?: string | null
          possui_gestao_treinamentos?: boolean | null
          telefone?: string | null
          tipo: Database["public"]["Enums"]["tipo_empresa"]
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          numero?: string | null
          possui_gestao_treinamentos?: boolean | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_empresa"]
          updated_at?: string
        }
        Relationships: []
      }
      empresas_modulos: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          modulo_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          modulo_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          modulo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_modulos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_modulos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_parceiras: {
        Row: {
          cnpj: string | null
          created_at: string | null
          email: string | null
          empresa_sst_id: string
          id: string
          nome: string
          parceira_empresa_id: string | null
          responsavel: string | null
          responsavel_id: string | null
          telefone: string | null
          tipo_fornecedor: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          empresa_sst_id: string
          id?: string
          nome: string
          parceira_empresa_id?: string | null
          responsavel?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          tipo_fornecedor?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          empresa_sst_id?: string
          id?: string
          nome?: string
          parceira_empresa_id?: string | null
          responsavel?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          tipo_fornecedor?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_parceiras_empresa_sst_id_fkey"
            columns: ["empresa_sst_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_parceiras_parceira_empresa_id_fkey"
            columns: ["parceira_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_parceiras_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      epis: {
        Row: {
          ca_numero: string | null
          colaborador_nome: string
          created_at: string
          data_entrega: string
          empresa_id: string
          id: string
          nome_epi: string
          quantidade: number
          updated_at: string
          validade_ca: string | null
        }
        Insert: {
          ca_numero?: string | null
          colaborador_nome: string
          created_at?: string
          data_entrega: string
          empresa_id: string
          id?: string
          nome_epi: string
          quantidade?: number
          updated_at?: string
          validade_ca?: string | null
        }
        Update: {
          ca_numero?: string | null
          colaborador_nome?: string
          created_at?: string
          data_entrega?: string
          empresa_id?: string
          id?: string
          nome_epi?: string
          quantidade?: number
          updated_at?: string
          validade_ca?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      instrutor_formacoes: {
        Row: {
          created_at: string | null
          documento_url: string | null
          id: string
          instrutor_id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          documento_url?: string | null
          id?: string
          instrutor_id: string
          nome: string
        }
        Update: {
          created_at?: string | null
          documento_url?: string | null
          id?: string
          instrutor_id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "instrutor_formacoes_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "instrutores"
            referencedColumns: ["id"]
          },
        ]
      }
      instrutor_treinamentos: {
        Row: {
          created_at: string | null
          documento_url: string | null
          id: string
          instrutor_id: string
          treinamento_id: string | null
        }
        Insert: {
          created_at?: string | null
          documento_url?: string | null
          id?: string
          instrutor_id: string
          treinamento_id?: string | null
        }
        Update: {
          created_at?: string | null
          documento_url?: string | null
          id?: string
          instrutor_id?: string
          treinamento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instrutor_treinamentos_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "instrutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrutor_treinamentos_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "catalogo_treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      instrutores: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf_cnpj: string
          created_at: string | null
          data_nascimento: string | null
          email: string
          empresa_id: string
          empresa_parceira_id: string | null
          formacao_academica: string | null
          formacoes_count: number | null
          id: string
          logradouro: string | null
          nome: string
          numero: string | null
          placa: string | null
          telefone: string | null
          treinamentos_count: number | null
          uf: string | null
          updated_at: string | null
          veiculo: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj: string
          created_at?: string | null
          data_nascimento?: string | null
          email: string
          empresa_id: string
          empresa_parceira_id?: string | null
          formacao_academica?: string | null
          formacoes_count?: number | null
          id?: string
          logradouro?: string | null
          nome: string
          numero?: string | null
          placa?: string | null
          telefone?: string | null
          treinamentos_count?: number | null
          uf?: string | null
          updated_at?: string | null
          veiculo?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string
          created_at?: string | null
          data_nascimento?: string | null
          email?: string
          empresa_id?: string
          empresa_parceira_id?: string | null
          formacao_academica?: string | null
          formacoes_count?: number | null
          id?: string
          logradouro?: string | null
          nome?: string
          numero?: string | null
          placa?: string | null
          telefone?: string | null
          treinamentos_count?: number | null
          uf?: string | null
          updated_at?: string | null
          veiculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instrutores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrutores_empresa_parceira_id_fkey"
            columns: ["empresa_parceira_id"]
            isOneToOne: false
            referencedRelation: "empresas_parceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      matriz_treinamentos: {
        Row: {
          id: string
          empresa_id: string
          norma: string
          treinamento_id: string
          treinamento_nome: string
          agente_nocivo: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          norma: string
          treinamento_id: string
          treinamento_nome: string
          agente_nocivo?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          norma?: string
          treinamento_id?: string
          treinamento_nome?: string
          agente_nocivo?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matriz_treinamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriz_treinamentos_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "catalogo_treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          rota: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          rota: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          rota?: string
        }
        Relationships: []
      }
      normas_regulamentadoras: {
        Row: {
          created_at: string | null
          descricao: string | null
          empresa_id: string
          id: string
          numero: string
          numero_documento: string | null
          termo: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          numero: string
          numero_documento?: string | null
          termo?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          numero?: string
          numero_documento?: string | null
          termo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "normas_regulamentadoras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          empresa_id: string | null
          id: string
          nome: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          senha_alterada: boolean
          ativo: boolean | null
          motivo_desativacao: string | null
          setor_id: string | null
          grupo_acesso: string | null
          gestor_id: string | null
          primeiro_acesso: boolean | null
          lider_setor: boolean | null
          telefone: string | null
          cpf: string | null
          cep: string | null
          logradouro: string | null
          numero: string | null
          complemento: string | null
          bairro: string | null
          cidade: string | null
          uf: string | null
        }
        Insert: {
          created_at?: string
          email: string
          empresa_id?: string | null
          id: string
          nome: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          senha_alterada?: boolean
          ativo?: boolean | null
          motivo_desativacao?: string | null
          setor_id?: string | null
          grupo_acesso?: string | null
          gestor_id?: string | null
          primeiro_acesso?: boolean | null
          lider_setor?: boolean | null
          telefone?: string | null
          cpf?: string | null
          cep?: string | null
          logradouro?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          empresa_id?: string | null
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          senha_alterada?: boolean
          ativo?: boolean | null
          motivo_desativacao?: string | null
          setor_id?: string | null
          grupo_acesso?: string | null
          gestor_id?: string | null
          primeiro_acesso?: boolean | null
          lider_setor?: boolean | null
          telefone?: string | null
          cpf?: string | null
          cep?: string | null
          logradouro?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      saude_ocupacional: {
        Row: {
          aso_arquivo_url: string | null
          colaborador_nome: string
          created_at: string
          data_exame: string
          empresa_id: string
          id: string
          observacoes: string | null
          tipo_exame: string
          updated_at: string
          validade_dias: number
        }
        Insert: {
          aso_arquivo_url?: string | null
          colaborador_nome: string
          created_at?: string
          data_exame: string
          empresa_id: string
          id?: string
          observacoes?: string | null
          tipo_exame: string
          updated_at?: string
          validade_dias?: number
        }
        Update: {
          aso_arquivo_url?: string | null
          colaborador_nome?: string
          created_at?: string
          data_exame?: string
          empresa_id?: string
          id?: string
          observacoes?: string | null
          tipo_exame?: string
          updated_at?: string
          validade_dias?: number
        }
        Relationships: [
          {
            foreignKeyName: "saude_ocupacional_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      terceiros: {
        Row: {
          created_at: string
          data_validade_documentos: string
          documentos_entregues: string | null
          empresa_id: string
          id: string
          nome_empresa_terceira: string
          responsavel: string
          status_conformidade: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_validade_documentos: string
          documentos_entregues?: string | null
          empresa_id: string
          id?: string
          nome_empresa_terceira: string
          responsavel: string
          status_conformidade?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_validade_documentos?: string
          documentos_entregues?: string | null
          empresa_id?: string
          id?: string
          nome_empresa_terceira?: string
          responsavel?: string
          status_conformidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      treinamentos: {
        Row: {
          created_at: string
          data_realizacao: string
          empresa_id: string
          id: string
          instrutor: string
          nome_treinamento: string
          participantes: string
          updated_at: string
          validade_meses: number
        }
        Insert: {
          created_at?: string
          data_realizacao: string
          empresa_id: string
          id?: string
          instrutor: string
          nome_treinamento: string
          participantes: string
          updated_at?: string
          validade_meses?: number
        }
        Update: {
          created_at?: string
          data_realizacao?: string
          empresa_id?: string
          id?: string
          instrutor?: string
          nome_treinamento?: string
          participantes?: string
          updated_at?: string
          validade_meses?: number
        }
        Relationships: [
          {
            foreignKeyName: "treinamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas_treinamento: {
        Row: {
          id: string
          empresa_id: string
          numero_turma: number
          cliente_id: string
          treinamento_id: string
          tipo_treinamento: string
          carga_horaria_total: number
          instrutor_id: string | null
          quantidade_participantes: number | null
          status: string
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          numero_turma: number
          cliente_id: string
          treinamento_id: string
          tipo_treinamento: string
          carga_horaria_total?: number
          instrutor_id?: string | null
          quantidade_participantes?: number | null
          status?: string
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          numero_turma?: number
          cliente_id?: string
          treinamento_id?: string
          tipo_treinamento?: string
          carga_horaria_total?: number
          instrutor_id?: string | null
          quantidade_participantes?: number | null
          status?: string
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_treinamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_treinamento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_sst"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_treinamento_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "catalogo_treinamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_treinamento_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "instrutores"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas_treinamento_aulas: {
        Row: {
          id: string
          turma_id: string
          data: string
          hora_inicio: string
          hora_fim: string
          horas: number
          created_at: string
        }
        Insert: {
          id?: string
          turma_id: string
          data: string
          hora_inicio: string
          hora_fim: string
          horas?: number
          created_at?: string
        }
        Update: {
          id?: string
          turma_id?: string
          data?: string
          hora_inicio?: string
          hora_fim?: string
          horas?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_treinamento_aulas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas_treinamento"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          descricao: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          descricao?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          descricao?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          descricao: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          descricao?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          descricao?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_homogeneos: {
        Row: {
          id: string
          empresa_id: string
          cliente_id: string | null
          cargo_id: string | null
          cargo_nome: string | null
          nome: string
          agente_nocivo: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          cliente_id?: string | null
          cargo_id?: string | null
          cargo_nome?: string | null
          nome: string
          agente_nocivo?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          cliente_id?: string | null
          cargo_id?: string | null
          cargo_nome?: string | null
          nome?: string
          agente_nocivo?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_homogeneos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupos_homogeneos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_sst"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupos_homogeneos_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_homogeneos_treinamentos: {
        Row: {
          id: string
          grupo_homogeneo_id: string
          treinamento_id: string
          created_at: string
        }
        Insert: {
          id?: string
          grupo_homogeneo_id: string
          treinamento_id: string
          created_at?: string
        }
        Update: {
          id?: string
          grupo_homogeneo_id?: string
          treinamento_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_homogeneos_treinamentos_grupo_homogeneo_id_fkey"
            columns: ["grupo_homogeneo_id"]
            isOneToOne: false
            referencedRelation: "grupos_homogeneos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupos_homogeneos_treinamentos_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "catalogo_treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_treinamento: {
        Row: {
          id: string
          numero: number
          empresa_id: string
          treinamento_id: string
          colaborador_id: string | null
          tipo: string | null
          carga_horaria: number | null
          data_treinamento: string | null
          status: string
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero?: number
          empresa_id: string
          treinamento_id: string
          colaborador_id?: string | null
          tipo?: string | null
          carga_horaria?: number | null
          data_treinamento?: string | null
          status?: string
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero?: number
          empresa_id?: string
          treinamento_id?: string
          colaborador_id?: string | null
          tipo?: string | null
          carga_horaria?: number | null
          data_treinamento?: string | null
          status?: string
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_treinamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_treinamento_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "catalogo_treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin_vertical" | "empresa_sst" | "cliente_final" | "empresa_parceira"
      tipo_empresa: "vertical_on" | "sst" | "cliente_final" | "empresa_parceira" | "lead"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin_vertical", "empresa_sst", "cliente_final", "empresa_parceira"],
      tipo_empresa: ["vertical_on", "sst", "cliente_final", "empresa_parceira", "lead"],
    },
  },
} as const
