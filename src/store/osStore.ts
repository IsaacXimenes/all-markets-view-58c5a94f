import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrdemServico } from '@/utils/assistenciaApi';
import { SolicitacaoPeca } from '@/utils/solicitacaoPecasApi';

interface OSState {
  ordensServico: OrdemServico[];
  solicitacoesPecas: SolicitacaoPeca[];
  
  setOrdensServico: (os: OrdemServico[]) => void;
  addOrdemServico: (os: OrdemServico) => void;
  updateOrdemServico: (id: string, dados: Partial<OrdemServico>) => void;
  
  setSolicitacoesPecas: (sp: SolicitacaoPeca[]) => void;
  addSolicitacaoPeca: (sp: SolicitacaoPeca) => void;
  updateSolicitacaoPeca: (id: string, dados: Partial<SolicitacaoPeca>) => void;
  
  syncFromLocalStorage: () => void;
}

export const useOSStore = create<OSState>()(
  persist(
    (set, get) => ({
      ordensServico: [],
      solicitacoesPecas: [],
      
      setOrdensServico: (os) => set({ ordensServico: os }),
      addOrdemServico: (os) => set((state) => ({ 
        ordensServico: [...state.ordensServico, os] 
      })),
      updateOrdemServico: (id, dados) => set((state) => ({
        ordensServico: state.ordensServico.map(os => 
          os.id === id ? { ...os, ...dados } : os
        )
      })),
      
      setSolicitacoesPecas: (sp) => set({ solicitacoesPecas: sp }),
      addSolicitacaoPeca: (sp) => set((state) => ({ 
        solicitacoesPecas: [...state.solicitacoesPecas, sp] 
      })),
      updateSolicitacaoPeca: (id, dados) => set((state) => ({
        solicitacoesPecas: state.solicitacoesPecas.map(sp => 
          sp.id === id ? { ...sp, ...dados } : sp
        )
      })),
      
      syncFromLocalStorage: () => {
        try {
          const osData = localStorage.getItem('ordens_servico');
          if (osData) set({ ordensServico: JSON.parse(osData) });
          
          const spData = localStorage.getItem('solicitacoes_pecas');
          if (spData) set({ solicitacoesPecas: JSON.parse(spData) });
        } catch (error) {
          console.error('Erro ao sincronizar do localStorage:', error);
        }
      }
    }),
    {
      name: 'os-storage',
    }
  )
);
