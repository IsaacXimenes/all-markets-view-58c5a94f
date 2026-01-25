// Tipos para os dados mockados do sistema

export type TipoLoja = 'Loja' | 'Estoque' | 'Assistência' | 'Financeiro' | 'Administrativo';

export interface LojaMockada {
  id: string;
  nome: string;
  tipo: TipoLoja;
  endereco: string;
  telefone: string;
  email: string;
  ativa: boolean;
  data_criacao: string;
}

export interface ColaboradorMockado {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  loja_id: string;
  cargo: string;
  data_admissao: string;
  salario_fixo: number;
  ajuda_custo: number;
  comissao: number;
  eh_gestor: boolean;
  eh_vendedor: boolean;
  eh_estoquista: boolean;
  ativo: boolean;
  data_criacao: string;
}

export interface ResumoMockado {
  total_lojas: number;
  total_colaboradores: number;
  gestores: number;
  vendedores: number;
  estoquistas: number;
}

export interface RodizioColaborador {
  id: string;
  colaborador_id: string;
  loja_origem_id: string;
  loja_destino_id: string;
  data_inicio: string;
  data_fim: string;
  observacao: string;
  ativo: boolean;
  data_criacao: string;
  criado_por_id: string;
  criado_por_nome: string;
}

export interface DadosMockados {
  lojas: LojaMockada[];
  colaboradores: ColaboradorMockado[];
  resumo: ResumoMockado;
}
