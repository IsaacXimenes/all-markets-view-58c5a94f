import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrdemServico } from '@/utils/assistenciaApi';
import { SolicitacaoPeca } from '@/utils/solicitacaoPecasApi';
import { LotePagamento, PagamentoLote } from '@/utils/lotesPagamentoApi';

interface OSState {
  // Estados globais
  ordensServico: OrdemServico[];
  solicitacoesPecas: SolicitacaoPeca[];
  lotesPagamento: LotePagamento[];
  pagamentosLote: PagamentoLote[];
  
  // Acoes para Ordens de Serviço
  setOrdensServico: (os: OrdemServico[]) => void;
  addOrdemServico: (os: OrdemServico) => void;
  updateOrdemServico: (id: string, dados: Partial<OrdemServico>) => void;
  
  // Acoes para Solicitações de Peças
  setSolicitacoesPecas: (sp: SolicitacaoPeca[]) => void;
  addSolicitacaoPeca: (sp: SolicitacaoPeca) => void;
  updateSolicitacaoPeca: (id: string, dados: Partial<SolicitacaoPeca>) => void;
  
  // Acoes para Lotes de Pagamento
  setLotesPagamento: (lotes: LotePagamento[]) => void;
  addLotePagamento: (lote: LotePagamento) => void;
  updateLotePagamento: (id: string, dados: Partial<LotePagamento>) => void;
  
  // Acoes para Pagamentos de Lote
  setPagamentosLote: (pagamentos: PagamentoLote[]) => void;
  addPagamentoLote: (pagamento: PagamentoLote) => void;
  updatePagamentoLote: (id: string, dados: Partial<PagamentoLote>) => void;
  
  // Sincronização
  syncFromLocalStorage: () => void;
}

export const useOSStore = create<OSState>()(
  persist(
    (set, get) => ({
      ordensServico: [],
      solicitacoesPecas: [],
      lotesPagamento: [],
      pagamentosLote: [],
      
      // Ordens de Serviço
      setOrdensServico: (os) => set({ ordensServico: os }),
      addOrdemServico: (os) => set((state) => ({ 
        ordensServico: [...state.ordensServico, os] 
      })),
      updateOrdemServico: (id, dados) => set((state) => ({
        ordensServico: state.ordensServico.map(os => 
          os.id === id ? { ...os, ...dados } : os
        )
      })),
      
      // Solicitações de Peças
      setSolicitacoesPecas: (sp) => set({ solicitacoesPecas: sp }),
      addSolicitacaoPeca: (sp) => set((state) => ({ 
        solicitacoesPecas: [...state.solicitacoesPecas, sp] 
      })),
      updateSolicitacaoPeca: (id, dados) => set((state) => ({
        solicitacoesPecas: state.solicitacoesPecas.map(sp => 
          sp.id === id ? { ...sp, ...dados } : sp
        )
      })),
      
      // Lotes de Pagamento
      setLotesPagamento: (lotes) => set({ lotesPagamento: lotes }),
      addLotePagamento: (lote) => set((state) => ({ 
        lotesPagamento: [...state.lotesPagamento, lote] 
      })),
      updateLotePagamento: (id, dados) => set((state) => ({
        lotesPagamento: state.lotesPagamento.map(lote => 
          lote.id === id ? { ...lote, ...dados } : lote
        )
      })),
      
      // Pagamentos de Lote
      setPagamentosLote: (pagamentos) => set({ pagamentosLote: pagamentos }),
      addPagamentoLote: (pagamento) => set((state) => ({ 
        pagamentosLote: [...state.pagamentosLote, pagamento] 
      })),
      updatePagamentoLote: (id, dados) => set((state) => ({
        pagamentosLote: state.pagamentosLote.map(pag => 
          pag.id === id ? { ...pag, ...dados } : pag
        )
      })),
      
      // Sincronização com localStorage existente
      syncFromLocalStorage: () => {
        try {
          const osData = localStorage.getItem('ordens_servico');
          if (osData) set({ ordensServico: JSON.parse(osData) });
          
          const spData = localStorage.getItem('solicitacoes_pecas');
          if (spData) set({ solicitacoesPecas: JSON.parse(spData) });
          
          const lotesData = localStorage.getItem('lotes_pagamento');
          if (lotesData) set({ lotesPagamento: JSON.parse(lotesData) });
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
