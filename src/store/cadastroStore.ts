import { create } from 'zustand';
import { DadosMockados, LojaMockada, ColaboradorMockado, TipoLoja } from '../types/mockData';
import dadosMockados from '../data/dados_mockados_sistema.json';

const LOJAS_KEY = 'cadastro_lojas';
const COLABORADORES_KEY = 'cadastro_colaboradores';

interface CadastroStore {
  lojas: LojaMockada[];
  colaboradores: ColaboradorMockado[];
  inicializado: boolean;
  
  // Ações
  inicializarDadosMockados: () => void;
  carregarDoLocalStorage: () => void;
  
  // Lojas
  obterLojas: () => LojaMockada[];
  obterLojasPorTipo: (tipo: TipoLoja) => LojaMockada[];
  obterLojasAtivas: () => LojaMockada[];
  obterLojaById: (id: string) => LojaMockada | undefined;
  adicionarLoja: (loja: Omit<LojaMockada, 'id' | 'data_criacao'>) => LojaMockada;
  atualizarLoja: (id: string, updates: Partial<LojaMockada>) => void;
  deletarLoja: (id: string) => void;
  
  // Colaboradores
  obterColaboradores: () => ColaboradorMockado[];
  obterColaboradoresPorLoja: (lojaId: string) => ColaboradorMockado[];
  obterColaboradoresPorCargo: (cargo: string) => ColaboradorMockado[];
  obterColaboradoresAtivos: () => ColaboradorMockado[];
  obterColaboradorById: (id: string) => ColaboradorMockado | undefined;
  obterGestores: () => ColaboradorMockado[];
  obterVendedores: () => ColaboradorMockado[];
  obterEstoquistas: () => ColaboradorMockado[];
  obterTecnicos: () => ColaboradorMockado[];
  obterMotoboys: () => ColaboradorMockado[];
  adicionarColaborador: (colaborador: Omit<ColaboradorMockado, 'id' | 'data_criacao'>) => ColaboradorMockado;
  atualizarColaborador: (id: string, updates: Partial<ColaboradorMockado>) => void;
  deletarColaborador: (id: string) => void;
  
  // Lookup helpers
  obterNomeLoja: (lojaId: string) => string;
  obterNomeColaborador: (colaboradorId: string) => string;
}

// Gerar ID único
const gerarId = (): string => {
  return Math.random().toString(36).substring(2, 10);
};

export const useCadastroStore = create<CadastroStore>((set, get) => ({
  lojas: [],
  colaboradores: [],
  inicializado: false,
  
  inicializarDadosMockados: () => {
    const state = get();
    if (state.inicializado) return;
    
    // Tentar carregar do localStorage primeiro
    const lojasStorage = localStorage.getItem(LOJAS_KEY);
    const colaboradoresStorage = localStorage.getItem(COLABORADORES_KEY);
    
    if (lojasStorage && colaboradoresStorage) {
      try {
        const lojas = JSON.parse(lojasStorage) as LojaMockada[];
        const colaboradores = JSON.parse(colaboradoresStorage) as ColaboradorMockado[];
        set({ lojas, colaboradores, inicializado: true });
        return;
      } catch (e) {
        console.error('Erro ao carregar dados do localStorage:', e);
      }
    }
    
    // Se não houver dados no localStorage, usar dados mockados
    const dados = dadosMockados as DadosMockados;
    set({ 
      lojas: dados.lojas, 
      colaboradores: dados.colaboradores,
      inicializado: true 
    });
    
    // Salvar em localStorage
    localStorage.setItem(LOJAS_KEY, JSON.stringify(dados.lojas));
    localStorage.setItem(COLABORADORES_KEY, JSON.stringify(dados.colaboradores));
  },
  
  carregarDoLocalStorage: () => {
    const lojasStorage = localStorage.getItem(LOJAS_KEY);
    const colaboradoresStorage = localStorage.getItem(COLABORADORES_KEY);
    
    if (lojasStorage && colaboradoresStorage) {
      try {
        set({
          lojas: JSON.parse(lojasStorage),
          colaboradores: JSON.parse(colaboradoresStorage),
          inicializado: true
        });
      } catch (e) {
        console.error('Erro ao carregar dados do localStorage:', e);
      }
    }
  },
  
  // Lojas
  obterLojas: () => get().lojas,
  
  obterLojasPorTipo: (tipo: TipoLoja) => {
    return get().lojas.filter(loja => loja.tipo === tipo);
  },
  
  obterLojasAtivas: () => {
    return get().lojas.filter(loja => loja.ativa);
  },
  
  obterLojaById: (id: string) => {
    return get().lojas.find(loja => loja.id === id);
  },
  
  adicionarLoja: (loja) => {
    const novaLoja: LojaMockada = {
      ...loja,
      id: gerarId(),
      data_criacao: new Date().toISOString().split('T')[0]
    };
    
    set(state => {
      const novasLojas = [...state.lojas, novaLoja];
      localStorage.setItem(LOJAS_KEY, JSON.stringify(novasLojas));
      return { lojas: novasLojas };
    });
    
    return novaLoja;
  },
  
  atualizarLoja: (id, updates) => {
    set(state => {
      const novasLojas = state.lojas.map(loja => 
        loja.id === id ? { ...loja, ...updates } : loja
      );
      localStorage.setItem(LOJAS_KEY, JSON.stringify(novasLojas));
      return { lojas: novasLojas };
    });
  },
  
  deletarLoja: (id) => {
    set(state => {
      const novasLojas = state.lojas.filter(loja => loja.id !== id);
      localStorage.setItem(LOJAS_KEY, JSON.stringify(novasLojas));
      return { lojas: novasLojas };
    });
  },
  
  // Colaboradores
  obterColaboradores: () => get().colaboradores,
  
  obterColaboradoresPorLoja: (lojaId: string) => {
    return get().colaboradores.filter(col => col.loja_id === lojaId);
  },
  
  obterColaboradoresPorCargo: (cargo: string) => {
    return get().colaboradores.filter(col => 
      col.cargo.toLowerCase().includes(cargo.toLowerCase())
    );
  },
  
  obterColaboradoresAtivos: () => {
    return get().colaboradores.filter(col => col.ativo);
  },
  
  obterColaboradorById: (id: string) => {
    return get().colaboradores.find(col => col.id === id);
  },
  
  obterGestores: () => {
    return get().colaboradores.filter(col => col.eh_gestor && col.ativo);
  },
  
  obterVendedores: () => {
    return get().colaboradores.filter(col => col.eh_vendedor && col.ativo);
  },
  
  obterEstoquistas: () => {
    return get().colaboradores.filter(col => col.eh_estoquista && col.ativo);
  },
  
  obterTecnicos: () => {
    return get().colaboradores.filter(col => 
      col.cargo.toLowerCase().includes('técnico') && col.ativo
    );
  },
  
  obterMotoboys: () => {
    return get().colaboradores.filter(col => 
      col.cargo.toLowerCase().includes('motoboy') && col.ativo
    );
  },
  
  adicionarColaborador: (colaborador) => {
    const novoColaborador: ColaboradorMockado = {
      ...colaborador,
      id: gerarId(),
      data_criacao: new Date().toISOString().split('T')[0]
    };
    
    set(state => {
      const novosColaboradores = [...state.colaboradores, novoColaborador];
      localStorage.setItem(COLABORADORES_KEY, JSON.stringify(novosColaboradores));
      return { colaboradores: novosColaboradores };
    });
    
    return novoColaborador;
  },
  
  atualizarColaborador: (id, updates) => {
    set(state => {
      const novosColaboradores = state.colaboradores.map(col => 
        col.id === id ? { ...col, ...updates } : col
      );
      localStorage.setItem(COLABORADORES_KEY, JSON.stringify(novosColaboradores));
      return { colaboradores: novosColaboradores };
    });
  },
  
  deletarColaborador: (id) => {
    set(state => {
      const novosColaboradores = state.colaboradores.filter(col => col.id !== id);
      localStorage.setItem(COLABORADORES_KEY, JSON.stringify(novosColaboradores));
      return { colaboradores: novosColaboradores };
    });
  },
  
  // Lookup helpers
  obterNomeLoja: (lojaId: string) => {
    const loja = get().lojas.find(l => l.id === lojaId);
    return loja?.nome || lojaId;
  },
  
  obterNomeColaborador: (colaboradorId: string) => {
    const colaborador = get().colaboradores.find(c => c.id === colaboradorId);
    return colaborador?.nome || colaboradorId;
  }
}));
