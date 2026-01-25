import { create } from 'zustand';
import { DadosMockados, LojaMockada, ColaboradorMockado, TipoLoja, RodizioColaborador } from '../types/mockData';
import dadosMockados from '../data/dados_mockados_sistema.json';
import { registrarInicioRodizio, registrarEncerramentoRodizio, getTimelineByEntidade, TimelineEntry } from '../utils/timelineApi';

const LOJAS_KEY = 'cadastro_lojas';
const COLABORADORES_KEY = 'cadastro_colaboradores';
const RODIZIOS_KEY = 'cadastro_rodizios';

interface CadastroStore {
  lojas: LojaMockada[];
  colaboradores: ColaboradorMockado[];
  rodizios: RodizioColaborador[];
  inicializado: boolean;
  
  // Ações
  inicializarDadosMockados: () => void;
  carregarDoLocalStorage: () => void;
  
  // Lojas
  obterLojas: () => LojaMockada[];
  obterLojasPorTipo: (tipo: TipoLoja) => LojaMockada[];
  obterLojasAtivas: () => LojaMockada[];
  obterLojasTipoLoja: () => LojaMockada[]; // Novo: apenas lojas tipo 'Loja'
  obterLojaMatriz: () => LojaMockada | undefined;
  obterLojaOnline: () => LojaMockada | undefined;
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
  obterFinanceiros: () => ColaboradorMockado[];
  obterAniversariantesDaSemana: () => ColaboradorMockado[];
  adicionarColaborador: (colaborador: Omit<ColaboradorMockado, 'id' | 'data_criacao'>) => ColaboradorMockado;
  atualizarColaborador: (id: string, updates: Partial<ColaboradorMockado>) => void;
  deletarColaborador: (id: string) => void;
  
  // Lookup helpers
  obterNomeLoja: (lojaId: string) => string;
  obterNomeColaborador: (colaboradorId: string) => string;
  obterContagemColaboradoresPorLoja: () => Record<string, number>;
  
  // Rodízio
  adicionarRodizio: (rodizio: Omit<RodizioColaborador, 'id' | 'data_criacao'>) => RodizioColaborador;
  encerrarRodizio: (id: string, usuarioId: string, usuarioNome: string) => void;
  obterRodizioAtivoDoColaborador: (colaboradorId: string) => RodizioColaborador | undefined;
  obterRodiziosPorLojaDestino: (lojaId: string) => RodizioColaborador[];
  obterHistoricoRodiziosColaborador: (colaboradorId: string) => RodizioColaborador[];
  obterTimelineColaborador: (colaboradorId: string) => TimelineEntry[];
  colaboradorEmRodizio: (colaboradorId: string) => boolean;
  verificarExpiracaoRodizios: () => void;
}

// Gerar ID único
const gerarId = (): string => {
  return Math.random().toString(36).substring(2, 10);
};

export const useCadastroStore = create<CadastroStore>((set, get) => ({
  lojas: [],
  colaboradores: [],
  rodizios: [],
  inicializado: false,
  
  inicializarDadosMockados: () => {
    const state = get();
    if (state.inicializado) return;
    
    // Versão dos dados mockados - incrementar quando houver alterações no JSON
    const DATA_VERSION_KEY = 'cadastros_data_version';
    const CURRENT_VERSION = '2.2'; // Adicionado rodízios
    
    const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
    const lojasStorage = localStorage.getItem(LOJAS_KEY);
    const colaboradoresStorage = localStorage.getItem(COLABORADORES_KEY);
    const rodiziosStorage = localStorage.getItem(RODIZIOS_KEY);
    
    // Se a versão for diferente ou não existir, forçar reload dos dados mockados
    if (storedVersion === CURRENT_VERSION && lojasStorage && colaboradoresStorage) {
      try {
        const lojas = JSON.parse(lojasStorage) as LojaMockada[];
        const colaboradores = JSON.parse(colaboradoresStorage) as ColaboradorMockado[];
        const rodizios = rodiziosStorage ? JSON.parse(rodiziosStorage) as RodizioColaborador[] : [];
        set({ lojas, colaboradores, rodizios, inicializado: true });
        
        // Verificar rodízios expirados ao inicializar
        setTimeout(() => get().verificarExpiracaoRodizios(), 100);
        return;
      } catch (e) {
        console.error('Erro ao carregar dados do localStorage:', e);
      }
    }
    
    // Limpar dados antigos e usar dados mockados atualizados
    localStorage.removeItem(LOJAS_KEY);
    localStorage.removeItem(COLABORADORES_KEY);
    localStorage.removeItem(RODIZIOS_KEY);
    
    const dados = dadosMockados as DadosMockados;
    set({ 
      lojas: dados.lojas, 
      colaboradores: dados.colaboradores,
      rodizios: [],
      inicializado: true 
    });
    
    // Salvar em localStorage com versão
    localStorage.setItem(LOJAS_KEY, JSON.stringify(dados.lojas));
    localStorage.setItem(COLABORADORES_KEY, JSON.stringify(dados.colaboradores));
    localStorage.setItem(RODIZIOS_KEY, JSON.stringify([]));
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_VERSION);
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
  
  // Novo: apenas lojas com tipo 'Loja' (para filtros de vendas/movimentações)
  obterLojasTipoLoja: () => {
    return get().lojas.filter(loja => loja.tipo === 'Loja' && loja.ativa);
  },
  
  // Novo: obter loja Matriz
  obterLojaMatriz: () => {
    return get().lojas.find(loja => loja.nome.toLowerCase().includes('matriz') && loja.tipo === 'Loja');
  },
  
  // Novo: obter loja Online
  obterLojaOnline: () => {
    return get().lojas.find(loja => loja.nome.toLowerCase().includes('online') && loja.tipo === 'Loja');
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
  
  obterFinanceiros: () => {
    return get().colaboradores.filter(col => 
      col.cargo.toLowerCase().includes('financeiro') && col.ativo
    );
  },
  
  obterAniversariantesDaSemana: () => {
    const hoje = new Date();
    const umaSemana = new Date(hoje);
    umaSemana.setDate(hoje.getDate() + 7);
    
    return get().colaboradores.filter(col => {
      if (!col.ativo) return false;
      
      // Extrair mês e dia do aniversário
      const [, mesNasc, diaNasc] = col.data_admissao.split('-').map(Number);
      
      // Criar data de aniversário para este ano
      const aniversarioEsteAno = new Date(hoje.getFullYear(), mesNasc - 1, diaNasc);
      
      // Se já passou, verificar próximo ano
      if (aniversarioEsteAno < hoje) {
        aniversarioEsteAno.setFullYear(hoje.getFullYear() + 1);
      }
      
      return aniversarioEsteAno >= hoje && aniversarioEsteAno <= umaSemana;
    });
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
  },
  
  obterContagemColaboradoresPorLoja: () => {
    const contagem: Record<string, number> = {};
    get().colaboradores.filter(c => c.ativo).forEach(col => {
      contagem[col.loja_id] = (contagem[col.loja_id] || 0) + 1;
    });
    return contagem;
  },
  
  // ===== RODÍZIO =====
  
  adicionarRodizio: (rodizio) => {
    const state = get();
    const colaborador = state.obterColaboradorById(rodizio.colaborador_id);
    const lojaOrigem = state.obterNomeLoja(rodizio.loja_origem_id);
    const lojaDestino = state.obterNomeLoja(rodizio.loja_destino_id);
    
    const novoRodizio: RodizioColaborador = {
      ...rodizio,
      id: `ROD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      data_criacao: new Date().toISOString()
    };
    
    set(state => {
      const novosRodizios = [...state.rodizios, novoRodizio];
      localStorage.setItem(RODIZIOS_KEY, JSON.stringify(novosRodizios));
      return { rodizios: novosRodizios };
    });
    
    // Registrar na timeline
    const dataInicioFormatada = new Date(rodizio.data_inicio).toLocaleDateString('pt-BR');
    const dataFimFormatada = new Date(rodizio.data_fim).toLocaleDateString('pt-BR');
    
    registrarInicioRodizio(
      rodizio.colaborador_id,
      colaborador?.nome || '',
      lojaOrigem,
      lojaDestino,
      dataInicioFormatada,
      dataFimFormatada,
      rodizio.observacao,
      rodizio.criado_por_id,
      rodizio.criado_por_nome
    );
    
    return novoRodizio;
  },
  
  encerrarRodizio: (id, usuarioId, usuarioNome) => {
    const state = get();
    const rodizio = state.rodizios.find(r => r.id === id);
    if (!rodizio) return;
    
    set(state => {
      const novosRodizios = state.rodizios.map(r => 
        r.id === id ? { ...r, ativo: false } : r
      );
      localStorage.setItem(RODIZIOS_KEY, JSON.stringify(novosRodizios));
      return { rodizios: novosRodizios };
    });
    
    // Registrar na timeline
    registrarEncerramentoRodizio(
      rodizio.colaborador_id,
      'Encerrado manualmente',
      usuarioId,
      usuarioNome
    );
  },
  
  obterRodizioAtivoDoColaborador: (colaboradorId) => {
    const hoje = new Date().toISOString().split('T')[0];
    return get().rodizios.find(r => 
      r.colaborador_id === colaboradorId && 
      r.ativo && 
      r.data_inicio <= hoje && 
      r.data_fim >= hoje
    );
  },
  
  obterRodiziosPorLojaDestino: (lojaId) => {
    const hoje = new Date().toISOString().split('T')[0];
    return get().rodizios.filter(r => 
      r.loja_destino_id === lojaId && 
      r.ativo && 
      r.data_inicio <= hoje && 
      r.data_fim >= hoje
    );
  },
  
  obterHistoricoRodiziosColaborador: (colaboradorId) => {
    return get().rodizios
      .filter(r => r.colaborador_id === colaboradorId)
      .sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime());
  },
  
  obterTimelineColaborador: (colaboradorId) => {
    return getTimelineByEntidade(colaboradorId);
  },
  
  colaboradorEmRodizio: (colaboradorId) => {
    return !!get().obterRodizioAtivoDoColaborador(colaboradorId);
  },
  
  verificarExpiracaoRodizios: () => {
    const hoje = new Date().toISOString().split('T')[0];
    const state = get();
    
    const rodiziosExpirados = state.rodizios.filter(r => 
      r.ativo && r.data_fim < hoje
    );
    
    if (rodiziosExpirados.length > 0) {
      rodiziosExpirados.forEach(r => {
        registrarEncerramentoRodizio(
          r.colaborador_id,
          'Encerrado automaticamente - período finalizado',
          'sistema',
          'Sistema'
        );
      });
      
      set(state => {
        const novosRodizios = state.rodizios.map(r => 
          r.ativo && r.data_fim < hoje ? { ...r, ativo: false } : r
        );
        localStorage.setItem(RODIZIOS_KEY, JSON.stringify(novosRodizios));
        return { rodizios: novosRodizios };
      });
    }
  }
}));
